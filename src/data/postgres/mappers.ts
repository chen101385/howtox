/**
 * Row ↔ domain mapping.
 *
 * Kept separate from the repository so the translation is testable on its own,
 * and so there is exactly one place where a database shape becomes a domain
 * object. Two rules matter here:
 *
 * 1. **Money is reassembled from `amountMinor` + `currency`**, never from a
 *    formatted string, and never through a float.
 * 2. **`toHostProfile` builds `public` explicitly.** The users row carries legal
 *    name, email and payout identity; those fields are simply not read here, so
 *    they cannot reach a view by accident.
 */

import type { InferSelectModel } from "drizzle-orm";
import {
  bookingId,
  experienceId,
  hostId,
  incidentId,
  occurrenceId,
  reviewId,
  riskSignalId,
  seatId,
  tenantId,
  userId,
  ledgerEntryId,
  conversationId,
  messageId,
} from "@/domain/ids";
import { money, type Money } from "@/domain/money";
import type {
  DiscoveryIntent,
  Experience,
  ExperienceCategory,
  ExperienceOccurrence,
  ExperienceSample,
} from "@/domain/experience";
import type { HostProfile } from "@/domain/identity";
import type { Booking, Seat } from "@/domain/booking";
import type { Conversation, Message } from "@/domain/messaging";
import type { Incident, RiskSignal } from "@/domain/incident";
import type { Review, StarRating, StructuredFeedback } from "@/domain/review";
import type { LedgerEntry } from "@/domain/ledger";
import * as t from "./schema";

type UserRow = InferSelectModel<typeof t.users>;
type HostRow = InferSelectModel<typeof t.hostProfiles>;
type ExperienceRow = InferSelectModel<typeof t.experiences>;
type OccurrenceRow = InferSelectModel<typeof t.occurrences>;
type BookingRow = InferSelectModel<typeof t.bookings>;
type SeatRow = InferSelectModel<typeof t.seats>;
type ConversationRow = InferSelectModel<typeof t.conversations>;
type MessageRow = InferSelectModel<typeof t.messages>;
type ReviewRow = InferSelectModel<typeof t.reviews>;
type IncidentRow = InferSelectModel<typeof t.incidents>;
type RiskSignalRow = InferSelectModel<typeof t.riskSignals>;
type LedgerRow = InferSelectModel<typeof t.ledgerEntries>;

const iso = (d: Date) => d.toISOString();
const isoOrUndefined = (d: Date | null) => (d ? d.toISOString() : undefined);

/** Rebuilds Money from its two columns. */
const toMoney = (amountMinor: number | null, currency: string): Money | undefined =>
  amountMinor === null ? undefined : money(amountMinor, currency);

/* ------------------------------- Identity ------------------------------- */

/**
 * Builds a HostProfile, enumerating public fields explicitly.
 *
 * Note what is absent: `user.legalLastName`, `user.email`, `user.phone`,
 * `user.payoutAccountRef`, `user.addressLine`, `user.governmentIdRef`. Adding a
 * private column to the users table cannot widen what is published, because
 * nothing here spreads the row.
 */
export function toHostProfile(host: HostRow, user: UserRow): HostProfile {
  return {
    id: hostId(host.id),
    userId: userId(user.id),
    tenantId: tenantId(host.tenantId),
    public: {
      userId: userId(user.id),
      displayName: user.displayName,
      handle: user.handle,
      avatar: user.avatarSrc
        ? { src: user.avatarSrc, alt: user.avatarAlt ?? user.displayName }
        : undefined,
      identityVerified: user.verificationStatus === "verified",
      memberSince: iso(user.createdAt),
    },
    headline: host.headline,
    bio: host.bio,
    approximateRegion: host.approximateRegion ?? undefined,
    languages: host.languages,
    categories: host.categories,
    trust: {
      identityVerified: user.verificationStatus === "verified",
      sessionsHosted: host.sessionsHosted,
      averageRating: host.averageRating ?? undefined,
      reviewCount: host.reviewCount,
      onTimeRate: host.onTimeRate ?? undefined,
      respondsWithin: host.respondsWithin ?? undefined,
    },
  };
}

/* ------------------------------ Experiences ----------------------------- */

export function toExperience(row: ExperienceRow): Experience {
  return {
    id: experienceId(row.id),
    tenantId: tenantId(row.tenantId),
    hostId: hostId(row.hostId),
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    secondaryCategories: row.secondaryCategories as ExperienceCategory[],
    bookingModes: row.bookingModes,
    deliveryModes: row.deliveryModes,
    durationMinutes: row.durationMinutes,
    pricing: {
      oneToOne: toMoney(row.priceOneToOneMinor, row.currency),
      privateGroup: toMoney(row.priceGroupMinor, row.currency),
      perSeat: toMoney(row.pricePerSeatMinor, row.currency),
    },
    samples: row.samples as ExperienceSample[],
    cover: row.cover as Experience["cover"],
    whatToExpect: row.whatToExpect,
    minimumAge: row.minimumAge ?? undefined,
    languages: row.languages,
    intents: row.intents as DiscoveryIntent[],
    status: row.status,
    createdAt: iso(row.createdAt),
  };
}

export function fromExperience(e: Experience): typeof t.experiences.$inferInsert {
  const currency =
    e.pricing.perSeat?.currency ??
    e.pricing.oneToOne?.currency ??
    e.pricing.privateGroup?.currency ??
    "USD";

  return {
    id: e.id,
    tenantId: e.tenantId,
    hostId: e.hostId,
    slug: e.slug,
    title: e.title,
    tagline: e.tagline,
    description: e.description,
    category: e.category,
    secondaryCategories: e.secondaryCategories ?? [],
    bookingModes: e.bookingModes,
    deliveryModes: e.deliveryModes,
    durationMinutes: e.durationMinutes,
    priceOneToOneMinor: e.pricing.oneToOne?.amountMinor ?? null,
    priceGroupMinor: e.pricing.privateGroup?.amountMinor ?? null,
    pricePerSeatMinor: e.pricing.perSeat?.amountMinor ?? null,
    currency,
    samples: e.samples,
    cover: e.cover,
    whatToExpect: e.whatToExpect,
    minimumAge: e.minimumAge ?? null,
    languages: e.languages,
    intents: e.intents,
    status: e.status,
    createdAt: new Date(e.createdAt),
  };
}

export function toOccurrence(row: OccurrenceRow): ExperienceOccurrence {
  return {
    id: occurrenceId(row.id),
    tenantId: tenantId(row.tenantId),
    experienceId: experienceId(row.experienceId),
    hostId: hostId(row.hostId),
    startsAt: iso(row.startsAt),
    durationMinutes: row.durationMinutes,
    timezone: row.timezone,
    bookingMode: row.bookingMode,
    deliveryMode: row.deliveryMode,
    capacity: row.capacity,
    seatsBooked: row.seatsBooked,
    pricePerSeat: toMoney(row.pricePerSeatMinor, row.currency),
    status: row.status,
  };
}

export function fromOccurrence(
  o: ExperienceOccurrence
): typeof t.occurrences.$inferInsert {
  return {
    id: o.id,
    tenantId: o.tenantId,
    experienceId: o.experienceId,
    hostId: o.hostId,
    startsAt: new Date(o.startsAt),
    durationMinutes: o.durationMinutes,
    timezone: o.timezone,
    bookingMode: o.bookingMode,
    deliveryMode: o.deliveryMode,
    capacity: o.capacity,
    seatsBooked: o.seatsBooked,
    pricePerSeatMinor: o.pricePerSeat?.amountMinor ?? null,
    currency: o.pricePerSeat?.currency ?? "USD",
    status: o.status,
  };
}

/* ------------------------------- Bookings ------------------------------- */

export function toSeat(row: SeatRow): Seat {
  return {
    id: seatId(row.id),
    bookingId: bookingId(row.bookingId),
    occurrenceId: occurrenceId(row.occurrenceId ?? ""),
    guestDisplayName: row.guestDisplayName,
    bookingCode: row.bookingCode,
    pricePaid: money(row.pricePaidMinor, row.currency),
  };
}

export function toBooking(row: BookingRow, seatRows: SeatRow[]): Booking {
  return {
    id: bookingId(row.id),
    tenantId: tenantId(row.tenantId),
    experienceId: experienceId(row.experienceId),
    occurrenceId: row.occurrenceId ? occurrenceId(row.occurrenceId) : undefined,
    guestUserId: userId(row.guestUserId),
    bookingMode: row.bookingMode,
    deliveryMode: row.deliveryMode,
    status: row.status,
    seatCount: row.seatCount,
    seats: seatRows.map(toSeat),
    totalPrice: money(row.totalPriceMinor, row.currency),
    bookingCode: row.bookingCode,
    createdAt: iso(row.createdAt),
    policiesAcceptedAt: isoOrUndefined(row.policiesAcceptedAt),
    cancelledAt: isoOrUndefined(row.cancelledAt),
    cancelledBy: row.cancelledBy ?? undefined,
  };
}

export function fromBooking(b: Booking): typeof t.bookings.$inferInsert {
  return {
    id: b.id,
    tenantId: b.tenantId,
    experienceId: b.experienceId,
    occurrenceId: b.occurrenceId ?? null,
    guestUserId: b.guestUserId,
    bookingMode: b.bookingMode,
    deliveryMode: b.deliveryMode,
    status: b.status,
    seatCount: b.seatCount,
    totalPriceMinor: b.totalPrice.amountMinor,
    currency: b.totalPrice.currency,
    bookingCode: b.bookingCode,
    policiesAcceptedAt: b.policiesAcceptedAt ? new Date(b.policiesAcceptedAt) : null,
    cancelledAt: b.cancelledAt ? new Date(b.cancelledAt) : null,
    cancelledBy: b.cancelledBy ?? null,
    createdAt: new Date(b.createdAt),
  };
}

export function fromSeat(seat: Seat, tenant: string): typeof t.seats.$inferInsert {
  return {
    id: seat.id,
    tenantId: tenant,
    bookingId: seat.bookingId,
    occurrenceId: seat.occurrenceId || null,
    guestDisplayName: seat.guestDisplayName,
    bookingCode: seat.bookingCode,
    pricePaidMinor: seat.pricePaid.amountMinor,
    currency: seat.pricePaid.currency,
  };
}

/* ------------------------------ Messaging ------------------------------- */

export function toMessage(row: MessageRow): Message {
  return {
    id: messageId(row.id),
    conversationId: conversationId(row.conversationId),
    senderUserId: userId(row.senderUserId),
    body: row.body,
    status: row.status,
    sentAt: iso(row.sentAt),
    moderation: (row.moderation as Message["moderation"]) ?? undefined,
  };
}

export function toConversation(
  row: ConversationRow,
  messageRows: MessageRow[]
): Conversation {
  return {
    id: conversationId(row.id),
    tenantId: tenantId(row.tenantId),
    participantUserIds: row.participantUserIds.map(userId),
    bookingRef: row.bookingRef ?? undefined,
    messages: messageRows.map(toMessage),
    createdAt: iso(row.createdAt),
    clearViolations: row.clearViolations,
    ambiguousSignals: row.ambiguousSignals,
  };
}

export function fromConversation(
  c: Conversation
): typeof t.conversations.$inferInsert {
  return {
    id: c.id,
    tenantId: c.tenantId,
    participantUserIds: c.participantUserIds,
    bookingRef: c.bookingRef ?? null,
    clearViolations: c.clearViolations,
    ambiguousSignals: c.ambiguousSignals,
    createdAt: new Date(c.createdAt),
  };
}

export function fromMessage(m: Message, tenant: string): typeof t.messages.$inferInsert {
  return {
    id: m.id,
    tenantId: tenant,
    conversationId: m.conversationId,
    senderUserId: m.senderUserId,
    body: m.body,
    status: m.status,
    moderation: m.moderation ?? null,
    sentAt: new Date(m.sentAt),
  };
}

/* ------------------------------- Reviews -------------------------------- */

export function toReview(row: ReviewRow): Review {
  return {
    id: reviewId(row.id),
    tenantId: tenantId(row.tenantId),
    bookingId: bookingId(row.bookingId),
    experienceId: experienceId(row.experienceId),
    hostId: hostId(row.hostId),
    authorUserId: userId(row.authorUserId),
    rating: row.rating as StarRating,
    publicComment: row.publicComment ?? undefined,
    structured: row.structured as StructuredFeedback,
    privateNotes: row.privateNotes ?? undefined,
    tip: toMoney(row.tipMinor, row.currency),
    createdAt: iso(row.createdAt),
  };
}

export function fromReview(r: Review): typeof t.reviews.$inferInsert {
  return {
    id: r.id,
    tenantId: r.tenantId,
    bookingId: r.bookingId,
    experienceId: r.experienceId,
    hostId: r.hostId,
    authorUserId: r.authorUserId,
    rating: r.rating,
    publicComment: r.publicComment ?? null,
    structured: r.structured,
    privateNotes: r.privateNotes ?? null,
    tipMinor: r.tip?.amountMinor ?? null,
    currency: r.tip?.currency ?? "USD",
    createdAt: new Date(r.createdAt),
  };
}

/* --------------------------- Trust and safety --------------------------- */

export function toIncident(row: IncidentRow): Incident {
  return {
    id: incidentId(row.id),
    tenantId: tenantId(row.tenantId),
    bookingId: row.bookingId ? bookingId(row.bookingId) : undefined,
    sessionId: row.sessionId ?? undefined,
    reporterUserId: userId(row.reporterUserId),
    reportedUserId: row.reportedUserId ? userId(row.reportedUserId) : undefined,
    category: row.category,
    severity: row.severity,
    status: row.status,
    description: row.description,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    reviewNotes: row.reviewNotes as Incident["reviewNotes"],
  };
}

export function fromIncident(i: Incident): typeof t.incidents.$inferInsert {
  return {
    id: i.id,
    tenantId: i.tenantId,
    bookingId: i.bookingId ?? null,
    sessionId: i.sessionId ?? null,
    reporterUserId: i.reporterUserId,
    reportedUserId: i.reportedUserId ?? null,
    category: i.category,
    severity: i.severity,
    status: i.status,
    description: i.description,
    reviewNotes: i.reviewNotes,
    createdAt: new Date(i.createdAt),
    updatedAt: new Date(i.updatedAt),
  };
}

export function toRiskSignal(row: RiskSignalRow): RiskSignal {
  return {
    id: riskSignalId(row.id),
    tenantId: tenantId(row.tenantId),
    userId: userId(row.userId),
    kind: row.kind,
    confidence: row.confidence,
    observedAt: iso(row.observedAt),
    context: row.context,
    reviewed: row.reviewed,
  };
}

export function fromRiskSignal(s: RiskSignal): typeof t.riskSignals.$inferInsert {
  return {
    id: s.id,
    tenantId: s.tenantId,
    userId: s.userId,
    kind: s.kind,
    confidence: s.confidence,
    context: s.context,
    reviewed: s.reviewed,
    observedAt: new Date(s.observedAt),
  };
}

/* -------------------------------- Ledger -------------------------------- */

export function toLedgerEntry(row: LedgerRow): LedgerEntry {
  return {
    id: ledgerEntryId(row.id),
    tenantId: tenantId(row.tenantId),
    bookingId: bookingId(row.bookingId),
    type: row.type,
    amount: money(row.amountMinor, row.currency),
    status: row.status,
    payeeUserId: row.payeeUserId ? userId(row.payeeUserId) : undefined,
    createdAt: iso(row.createdAt),
    memo: row.memo,
  };
}

export function fromLedgerEntry(e: LedgerEntry): typeof t.ledgerEntries.$inferInsert {
  return {
    id: e.id,
    tenantId: e.tenantId,
    bookingId: e.bookingId,
    type: e.type,
    amountMinor: e.amount.amountMinor,
    currency: e.amount.currency,
    status: e.status,
    payeeUserId: e.payeeUserId ?? null,
    memo: e.memo,
    createdAt: new Date(e.createdAt),
  };
}
