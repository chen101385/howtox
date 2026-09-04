/**
 * Drizzle schema — the Postgres representation of the domain model.
 *
 * Design rules:
 *
 * 1. **`tenantId` is on every table** and participates in every index. One
 *    deployment currently serves one client, but carrying it now means a future
 *    multi-brand backend does not need a destructive migration.
 *
 * 2. **Money is `bigint` minor units plus a currency column.** Never `numeric`
 *    or `float` — that is the same invariant `src/domain/money.ts` enforces, and
 *    a float column would quietly undo it.
 *
 * 3. **Real columns for anything queried; JSONB only for embedded value objects**
 *    that are always read as a whole (samples, cover art, structured feedback,
 *    review notes). If you ever need to filter on a JSONB field, promote it.
 *
 * 4. **Postgres enums for the status unions.** They cost a little migration
 *    friction (`ALTER TYPE ... ADD VALUE`) and buy real integrity — the database
 *    rejects a status the domain does not define. `schema.test.ts` asserts these
 *    lists stay in sync with the TypeScript unions.
 */

import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* -------------------------------- Enums --------------------------------- */

export const bookingModeEnum = pgEnum("booking_mode", [
  "one_to_one",
  "private_group",
  "crowdshared",
]);

export const deliveryModeEnum = pgEnum("delivery_mode", ["remote", "in_person"]);

export const experienceCategoryEnum = pgEnum("experience_category", [
  "storytelling",
  "comedy",
  "music",
  "magic",
  "cooking",
  "dance",
  "art",
  "improv",
  "games",
  "dj",
  "craft",
]);

export const experienceStatusEnum = pgEnum("experience_status", [
  "draft",
  "published",
  "paused",
]);

export const occurrenceStatusEnum = pgEnum("occurrence_status", [
  "scheduled",
  "sold_out",
  "cancelled",
  "completed",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "disputed",
  "refunded",
]);

export const cancelledByEnum = pgEnum("cancelled_by", ["guest", "host", "platform"]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "pending",
  "verified",
  "failed",
]);

export const displayNameStyleEnum = pgEnum("display_name_style", [
  "first_name",
  "first_name_last_initial",
  "nickname",
  "stage_name",
]);

export const roleEnum = pgEnum("role", ["guest", "host", "moderator", "admin"]);

export const messageStatusEnum = pgEnum("message_status", [
  "sent",
  "warned",
  "blocked",
]);

export const reportCategoryEnum = pgEnum("report_category", [
  "harassment",
  "sexual_or_inappropriate",
  "hate_or_threats",
  "intoxication_or_disruptive",
  "unauthorized_recording",
  "materially_different_from_listing",
  "off_platform_transaction_attempt",
  "technical_failure",
  "other_safety",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "submitted",
  "triaged",
  "investigating",
  "resolved",
  "dismissed",
  "appealed",
]);

export const incidentSeverityEnum = pgEnum("incident_severity", [
  "low",
  "medium",
  "high",
]);

export const riskSignalKindEnum = pgEnum("risk_signal_kind", [
  "off_platform_contact",
  "off_platform_payment",
  "repeat_circumvention",
  "repeated_cancellations",
  "multiple_reports",
]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "guest_charge",
  "host_guaranteed_compensation",
  "performance_bonus",
  "platform_fee",
  "processing_allocation",
  "tip",
  "refund",
  "cancellation_compensation",
  "dispute_hold",
  "adjustment",
]);

export const ledgerEntryStatusEnum = pgEnum("ledger_entry_status", [
  "pending",
  "released",
  "held",
  "reversed",
]);

/* -------------------------------- Users --------------------------------- */

/**
 * RESTRICTED. Legal name, contact details and payout identity live here and are
 * never selected into a public view — `toPublicProfile()` is the only sanctioned
 * path, and the repository never returns rows from this table directly.
 */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    legalFirstName: text("legal_first_name").notNull(),
    legalLastName: text("legal_last_name").notNull(),
    email: text("email").notNull(),
    childFirstNames: text("child_first_names").array().notNull().default([]),
    childAges: integer("child_ages").array().notNull().default([]),
    /** Nullable only so legacy/demo rows survive the profile-field migration. */
    zipCode: text("zip_code"),
    phone: text("phone"),
    payoutAccountRef: text("payout_account_ref"),
    addressLine: text("address_line"),
    governmentIdRef: text("government_id_ref"),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("unverified"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verificationProvider: text("verification_provider"),
    displayName: text("display_name").notNull(),
    displayStyle: displayNameStyleEnum("display_style").notNull(),
    handle: text("handle").notNull(),
    avatarSrc: text("avatar_src"),
    avatarAlt: text("avatar_alt"),
    /**
     * Authorization grants. `moderator` and `admin` must be set deliberately —
     * no sign-up path can produce them, and they are never read from the
     * identity provider's token metadata.
     */
    roles: roleEnum("roles").array().notNull().default(["guest"]),
    /** Set when an external identity provider (e.g. Supabase Auth) owns the login. */
    externalAuthId: text("external_auth_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantHandle: uniqueIndex("users_tenant_handle_idx").on(t.tenantId, t.handle),
    tenantEmail: uniqueIndex("users_tenant_email_idx").on(t.tenantId, t.email),
    /**
     * Unique, not merely indexed: first-login provisioning relies on the
     * database rejecting a duplicate, so two concurrent sign-ins for the same
     * identity cannot create two accounts. Postgres permits many NULLs here,
     * which is what seeded users without an external identity need.
     */
    externalAuth: uniqueIndex("users_external_auth_idx").on(
      t.tenantId,
      t.externalAuthId
    ),
  })
);

export const hostProfiles = pgTable(
  "host_profiles",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    headline: text("headline").notNull(),
    bio: text("bio").notNull(),
    /** Broad region only. An exact location is never stored for a host profile. */
    approximateRegion: text("approximate_region"),
    languages: text("languages").array().notNull().default([]),
    categories: text("categories").array().notNull().default([]),
    sessionsHosted: integer("sessions_hosted").notNull().default(0),
    averageRating: real("average_rating"),
    reviewCount: integer("review_count").notNull().default(0),
    onTimeRate: integer("on_time_rate"),
    respondsWithin: text("responds_within"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantUser: index("host_profiles_tenant_user_idx").on(t.tenantId, t.userId),
  })
);

/* ------------------------------ Experiences ----------------------------- */

export const experiences = pgTable(
  "experiences",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    hostId: text("host_id")
      .notNull()
      .references(() => hostProfiles.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    category: experienceCategoryEnum("category").notNull(),
    secondaryCategories: text("secondary_categories").array().notNull().default([]),
    bookingModes: bookingModeEnum("booking_modes").array().notNull(),
    deliveryModes: deliveryModeEnum("delivery_modes").array().notNull(),
    durationMinutes: integer("duration_minutes").notNull(),

    // Money: integer minor units, one column per offered mode.
    priceOneToOneMinor: bigint("price_one_to_one_minor", { mode: "number" }),
    priceGroupMinor: bigint("price_group_minor", { mode: "number" }),
    pricePerSeatMinor: bigint("price_per_seat_minor", { mode: "number" }),
    currency: text("currency").notNull().default("USD"),

    /** Embedded value objects — always read whole, never filtered on. */
    samples: jsonb("samples").notNull().default([]),
    cover: jsonb("cover").notNull(),
    whatToExpect: text("what_to_expect").array().notNull().default([]),

    minimumAge: integer("minimum_age"),
    languages: text("languages").array().notNull().default([]),
    intents: text("intents").array().notNull().default([]),
    status: experienceStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantSlug: uniqueIndex("experiences_tenant_slug_idx").on(t.tenantId, t.slug),
    tenantStatus: index("experiences_tenant_status_idx").on(t.tenantId, t.status),
    tenantCategory: index("experiences_tenant_category_idx").on(t.tenantId, t.category),
    tenantHost: index("experiences_tenant_host_idx").on(t.tenantId, t.hostId),
  })
);

export const occurrences = pgTable(
  "occurrences",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    experienceId: text("experience_id")
      .notNull()
      .references(() => experiences.id, { onDelete: "cascade" }),
    hostId: text("host_id").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    timezone: text("timezone").notNull(),
    bookingMode: bookingModeEnum("booking_mode").notNull(),
    deliveryMode: deliveryModeEnum("delivery_mode").notNull().default("remote"),
    capacity: integer("capacity").notNull(),
    seatsBooked: integer("seats_booked").notNull().default(0),
    pricePerSeatMinor: bigint("price_per_seat_minor", { mode: "number" }),
    currency: text("currency").notNull().default("USD"),
    status: occurrenceStatusEnum("status").notNull().default("scheduled"),
  },
  (t) => ({
    tenantStart: index("occurrences_tenant_start_idx").on(t.tenantId, t.startsAt),
    tenantExperience: index("occurrences_tenant_experience_idx").on(
      t.tenantId,
      t.experienceId
    ),
  })
);

/* ------------------------------- Bookings ------------------------------- */

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    experienceId: text("experience_id").notNull(),
    occurrenceId: text("occurrence_id"),
    guestUserId: text("guest_user_id").notNull(),
    bookingMode: bookingModeEnum("booking_mode").notNull(),
    deliveryMode: deliveryModeEnum("delivery_mode").notNull().default("remote"),
    status: bookingStatusEnum("status").notNull().default("pending"),
    seatCount: integer("seat_count").notNull().default(1),
    totalPriceMinor: bigint("total_price_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("USD"),
    bookingCode: text("booking_code").notNull(),
    policiesAcceptedAt: timestamp("policies_accepted_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: cancelledByEnum("cancelled_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantCode: uniqueIndex("bookings_tenant_code_idx").on(t.tenantId, t.bookingCode),
    tenantGuest: index("bookings_tenant_guest_idx").on(t.tenantId, t.guestUserId),
    tenantOccurrence: index("bookings_tenant_occurrence_idx").on(
      t.tenantId,
      t.occurrenceId
    ),
  })
);

/**
 * One row per purchased seat. A separate table rather than a count, because a
 * crowdshared booking's seats each carry their own pseudonymous watermark label.
 */
export const seats = pgTable(
  "seats",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    occurrenceId: text("occurrence_id"),
    /** Pseudonymous label only — this is what appears in the session watermark. */
    guestDisplayName: text("guest_display_name").notNull(),
    bookingCode: text("booking_code").notNull(),
    pricePaidMinor: bigint("price_paid_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("USD"),
  },
  (t) => ({
    tenantBooking: index("seats_tenant_booking_idx").on(t.tenantId, t.bookingId),
  })
);

/* ------------------------------ Messaging ------------------------------- */

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    participantUserIds: text("participant_user_ids").array().notNull(),
    bookingRef: text("booking_ref"),
    /** Counters that drive progressive anti-circumvention enforcement. */
    clearViolations: integer("clear_violations").notNull().default(0),
    ambiguousSignals: integer("ambiguous_signals").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenant: index("conversations_tenant_idx").on(t.tenantId),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderUserId: text("sender_user_id").notNull(),
    /** Blocked messages store a redaction notice, never the original text. */
    body: text("body").notNull(),
    status: messageStatusEnum("status").notNull().default("sent"),
    moderation: jsonb("moderation"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantConversation: index("messages_tenant_conversation_idx").on(
      t.tenantId,
      t.conversationId
    ),
  })
);

/* ------------------------------- Reviews -------------------------------- */

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    bookingId: text("booking_id").notNull(),
    experienceId: text("experience_id").notNull(),
    hostId: text("host_id").notNull(),
    authorUserId: text("author_user_id").notNull(),
    rating: integer("rating").notNull(),
    publicComment: text("public_comment"),
    /** Structured answers — private, an input to bonus review only. */
    structured: jsonb("structured").notNull(),
    /** PRIVATE. Reviewer-only. Never selected into a public projection. */
    privateNotes: text("private_notes"),
    tipMinor: bigint("tip_minor", { mode: "number" }),
    currency: text("currency").notNull().default("USD"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantExperience: index("reviews_tenant_experience_idx").on(
      t.tenantId,
      t.experienceId
    ),
    tenantHost: index("reviews_tenant_host_idx").on(t.tenantId, t.hostId),
  })
);

/* --------------------------- Trust and safety --------------------------- */

export const incidents = pgTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    bookingId: text("booking_id"),
    sessionId: text("session_id"),
    reporterUserId: text("reporter_user_id").notNull(),
    reportedUserId: text("reported_user_id"),
    category: reportCategoryEnum("category").notNull(),
    severity: incidentSeverityEnum("severity").notNull().default("low"),
    status: incidentStatusEnum("status").notNull().default("submitted"),
    /** The reporter's own words. An allegation, never a finding. */
    description: text("description").notNull(),
    reviewNotes: jsonb("review_notes").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantStatus: index("incidents_tenant_status_idx").on(t.tenantId, t.status),
    tenantCreated: index("incidents_tenant_created_idx").on(t.tenantId, t.createdAt),
  })
);

export const riskSignals = pgTable(
  "risk_signals",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    kind: riskSignalKindEnum("kind").notNull(),
    /** 0–100 confidence that the pattern is real. Not a guilt score. */
    confidence: integer("confidence").notNull(),
    /** Redacted context only — never a full message body. */
    context: text("context").notNull(),
    reviewed: boolean("reviewed").notNull().default(false),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantUser: index("risk_signals_tenant_user_idx").on(t.tenantId, t.userId),
  })
);

/* -------------------------------- Ledger -------------------------------- */

/**
 * Append-mostly: amounts are never edited, only `status` moves (pending →
 * released, or held → resolved). Corrections are new entries.
 */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    bookingId: text("booking_id").notNull(),
    type: ledgerEntryTypeEnum("type").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("USD"),
    status: ledgerEntryStatusEnum("status").notNull().default("pending"),
    payeeUserId: text("payee_user_id"),
    memo: text("memo").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantBooking: index("ledger_tenant_booking_idx").on(t.tenantId, t.bookingId),
    tenantPayee: index("ledger_tenant_payee_idx").on(t.tenantId, t.payeeUserId),
  })
);

/**
 * Fixed-window rate limit counters.
 *
 * Not a business record — operational state that happens to need to be shared
 * across serverless instances, which is the only reason it is in the database.
 *
 * `key` is already hashed by `identityKey()` in src/data/rate-limit.ts, so this
 * table never holds an email address or an IP in plaintext.
 */
export const rateLimitCounters = pgTable(
  "rate_limit_counters",
  {
    tenantId: text("tenant_id").notNull(),
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => ({
    // Composite primary key, not a surrogate id: the upsert that increments a
    // counter needs a conflict target, and this is the natural one.
    pk: primaryKey({
      columns: [t.tenantId, t.key, t.windowStart],
      name: "rate_limit_counters_pkey",
    }),
    // For pruning expired windows.
    window: index("rate_limit_window_idx").on(t.windowStart),
  })
);

export const schema = {
  users,
  hostProfiles,
  experiences,
  occurrences,
  bookings,
  seats,
  conversations,
  messages,
  reviews,
  incidents,
  riskSignals,
  ledgerEntries,
  rateLimitCounters,
};
