/**
 * Postgres implementation of the repository interfaces.
 *
 * Two things every method here obeys:
 *
 * 1. **Every query is scoped by `tenant_id`.** Isolation is enforced in this
 *    layer because the browser never touches the database — nothing reaches
 *    Postgres except through these methods. RLS is worth adding as
 *    defence-in-depth, but it is not the primary boundary and this code does not
 *    assume it exists.
 *
 * 2. **No private identity column is ever selected into a public shape.**
 *    Host reads join `users` for display fields only, via `toHostProfile`.
 */

import { and, asc, desc, eq, gt, gte, inArray, lte, or, sql } from "drizzle-orm";
import type { PostgresDatabase } from "./client";
import * as t from "./schema";
import {
  fromBooking,
  fromConversation,
  fromIncident,
  fromLedgerEntry,
  fromMessage,
  fromReview,
  fromRiskSignal,
  fromSeat,
  toBooking,
  toConversation,
  toExperience,
  toHostProfile,
  toIncident,
  toLedgerEntry,
  toOccurrence,
  toReview,
  toRiskSignal,
} from "./mappers";
import type {
  BookingRepository,
  ConversationRepository,
  ExperienceQuery,
  ExperienceRepository,
  IncidentRepository,
  LedgerRepository,
  Repositories,
  ReputationRepository,
  UserContact,
  UserRepository,
} from "../repositories";
import type { Experience, ExperienceOccurrence } from "@/domain/experience";
import type { HostProfile } from "@/domain/identity";
import type { Booking } from "@/domain/booking";
import type { Conversation } from "@/domain/messaging";
import type { Incident, RiskSignal } from "@/domain/incident";
import type { Review } from "@/domain/review";
import type { LedgerEntry } from "@/domain/ledger";
import type {
  BookingId,
  ConversationId,
  ExperienceId,
  HostId,
  IncidentId,
  OccurrenceId,
  TenantId,
  UserId,
} from "@/domain/ids";

/* ------------------------------ Experiences ----------------------------- */

class PgExperienceRepository implements ExperienceRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async list(query: ExperienceQuery): Promise<Experience[]> {
    const filters = [
      eq(t.experiences.tenantId, query.tenantId),
      eq(t.experiences.status, "published"),
    ];

    if (query.category) {
      // Matches the primary category or a secondary one (`= ANY(array)`).
      filters.push(
        or(
          eq(t.experiences.category, query.category),
          sql`${query.category} = ANY(${t.experiences.secondaryCategories})`
        )!
      );
    }

    if (query.hostId) filters.push(eq(t.experiences.hostId, query.hostId));

    if (query.intent) {
      if (query.intent === "live_tonight") {
        // "Live tonight" is a property of the schedule, not the listing, so it
        // has to be answered by a correlated existence check on occurrences.
        filters.push(
          sql`EXISTS (
            SELECT 1 FROM ${t.occurrences} o
            WHERE o.experience_id = ${t.experiences.id}
              AND o.tenant_id = ${t.experiences.tenantId}
              AND o.status = 'scheduled'
              AND o.starts_at > now()
              AND o.starts_at <= now() + interval '12 hours'
          )`
        );
      } else {
        filters.push(sql`${query.intent} = ANY(${t.experiences.intents})`);
      }
    }

    if (query.maxPrice) {
      // Compare against the cheapest option the listing offers.
      const max = query.maxPrice.amountMinor;
      filters.push(
        sql`LEAST(
          COALESCE(${t.experiences.pricePerSeatMinor}, 9223372036854775807),
          COALESCE(${t.experiences.priceOneToOneMinor}, 9223372036854775807),
          COALESCE(${t.experiences.priceGroupMinor}, 9223372036854775807)
        ) <= ${max}`
      );
    }

    if (query.search) {
      const needle = `%${query.search.toLowerCase()}%`;
      filters.push(
        sql`(lower(${t.experiences.title}) LIKE ${needle}
          OR lower(${t.experiences.tagline}) LIKE ${needle}
          OR lower(${t.experiences.description}) LIKE ${needle}
          OR ${t.experiences.category}::text LIKE ${needle})`
      );
    }

    const base = this.db
      .select()
      .from(t.experiences)
      .where(and(...filters))
      .orderBy(asc(t.experiences.createdAt));

    const rows = await (query.limit ? base.limit(query.limit) : base);
    return rows.map(toExperience);
  }

  async getBySlug(tenant: TenantId, slug: string): Promise<Experience | null> {
    const [row] = await this.db
      .select()
      .from(t.experiences)
      .where(
        and(
          eq(t.experiences.tenantId, tenant),
          eq(t.experiences.slug, slug),
          eq(t.experiences.status, "published")
        )
      )
      .limit(1);
    return row ? toExperience(row) : null;
  }

  async getById(tenant: TenantId, id: ExperienceId): Promise<Experience | null> {
    const [row] = await this.db
      .select()
      .from(t.experiences)
      .where(and(eq(t.experiences.tenantId, tenant), eq(t.experiences.id, id)))
      .limit(1);
    return row ? toExperience(row) : null;
  }

  async listByHost(tenant: TenantId, host: HostId): Promise<Experience[]> {
    const rows = await this.db
      .select()
      .from(t.experiences)
      .where(and(eq(t.experiences.tenantId, tenant), eq(t.experiences.hostId, host)))
      .orderBy(asc(t.experiences.createdAt));
    return rows.map(toExperience);
  }

  async listOccurrences(
    tenant: TenantId,
    experience: ExperienceId
  ): Promise<ExperienceOccurrence[]> {
    const rows = await this.db
      .select()
      .from(t.occurrences)
      .where(
        and(
          eq(t.occurrences.tenantId, tenant),
          eq(t.occurrences.experienceId, experience)
        )
      )
      .orderBy(asc(t.occurrences.startsAt));
    return rows.map(toOccurrence);
  }

  async getOccurrence(
    tenant: TenantId,
    id: OccurrenceId
  ): Promise<ExperienceOccurrence | null> {
    const [row] = await this.db
      .select()
      .from(t.occurrences)
      .where(and(eq(t.occurrences.tenantId, tenant), eq(t.occurrences.id, id)))
      .limit(1);
    return row ? toOccurrence(row) : null;
  }

  async listUpcoming(
    tenant: TenantId,
    opts?: { withinHours?: number; limit?: number; crowdsharedOnly?: boolean }
  ): Promise<ExperienceOccurrence[]> {
    const filters = [
      eq(t.occurrences.tenantId, tenant),
      eq(t.occurrences.status, "scheduled"),
      gt(t.occurrences.startsAt, sql`now()`),
    ];

    if (opts?.withinHours !== undefined) {
      filters.push(
        lte(
          t.occurrences.startsAt,
          sql`now() + (${opts.withinHours} * interval '1 hour')`
        )
      );
    }
    if (opts?.crowdsharedOnly) {
      filters.push(eq(t.occurrences.bookingMode, "crowdshared"));
    }

    const base = this.db
      .select()
      .from(t.occurrences)
      .where(and(...filters))
      .orderBy(asc(t.occurrences.startsAt));

    const rows = await (opts?.limit ? base.limit(opts.limit) : base);
    return rows.map(toOccurrence);
  }

  /**
   * Conditional update — the concurrency boundary for crowdshared inventory.
   *
   * A read-then-write would let two simultaneous bookings both observe the same
   * remaining seats and oversell the event. The `seats_booked + n <= capacity`
   * predicate makes the check and the write a single atomic statement, so the
   * loser of a race updates zero rows and is rejected.
   */
  async reserveSeats(
    tenant: TenantId,
    id: OccurrenceId,
    count: number
  ): Promise<void> {
    const updated = await this.db
      .update(t.occurrences)
      .set({
        seatsBooked: sql`${t.occurrences.seatsBooked} + ${count}`,
        status: sql`CASE WHEN ${t.occurrences.seatsBooked} + ${count} >= ${t.occurrences.capacity}
                        THEN 'sold_out'::occurrence_status
                        ELSE ${t.occurrences.status} END`,
      })
      .where(
        and(
          eq(t.occurrences.tenantId, tenant),
          eq(t.occurrences.id, id),
          eq(t.occurrences.status, "scheduled"),
          sql`${t.occurrences.seatsBooked} + ${count} <= ${t.occurrences.capacity}`
        )
      )
      .returning({ id: t.occurrences.id });

    if (updated.length === 0) {
      throw new Error(
        `Could not reserve ${count} seat(s) on occurrence ${id}: it is sold out, cancelled, or was booked concurrently.`
      );
    }
  }

  private hostQuery(tenant: TenantId) {
    // Selects display fields from `users` only. Legal name, email, phone,
    // payout and government id columns are deliberately not projected.
    return this.db
      .select({ host: t.hostProfiles, user: t.users })
      .from(t.hostProfiles)
      .innerJoin(t.users, eq(t.users.id, t.hostProfiles.userId))
      .where(eq(t.hostProfiles.tenantId, tenant));
  }

  async getHost(tenant: TenantId, id: HostId): Promise<HostProfile | null> {
    const [row] = await this.db
      .select({ host: t.hostProfiles, user: t.users })
      .from(t.hostProfiles)
      .innerJoin(t.users, eq(t.users.id, t.hostProfiles.userId))
      .where(and(eq(t.hostProfiles.tenantId, tenant), eq(t.hostProfiles.id, id)))
      .limit(1);
    return row ? toHostProfile(row.host, row.user) : null;
  }

  async getHostByHandle(tenant: TenantId, handle: string): Promise<HostProfile | null> {
    const [row] = await this.db
      .select({ host: t.hostProfiles, user: t.users })
      .from(t.hostProfiles)
      .innerJoin(t.users, eq(t.users.id, t.hostProfiles.userId))
      .where(and(eq(t.hostProfiles.tenantId, tenant), eq(t.users.handle, handle)))
      .limit(1);
    return row ? toHostProfile(row.host, row.user) : null;
  }

  async listHosts(tenant: TenantId, opts?: { limit?: number }): Promise<HostProfile[]> {
    const base = this.hostQuery(tenant).orderBy(desc(t.hostProfiles.sessionsHosted));
    const rows = await (opts?.limit ? base.limit(opts.limit) : base);
    return rows.map((r) => toHostProfile(r.host, r.user));
  }
}

/* -------------------------------- Bookings ------------------------------ */

class PgBookingRepository implements BookingRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async create(booking: Booking): Promise<Booking> {
    // Booking and its seats are written together: a booking whose seats failed
    // to insert would under-report the watermark labels for a crowdshared event.
    await this.db.transaction(async (tx) => {
      await tx.insert(t.bookings).values(fromBooking(booking));
      if (booking.seats.length > 0) {
        await tx
          .insert(t.seats)
          .values(booking.seats.map((s) => fromSeat(s, booking.tenantId)));
      }
    });
    return booking;
  }

  private async hydrate(
    row: typeof t.bookings.$inferSelect | undefined
  ): Promise<Booking | null> {
    if (!row) return null;
    const seatRows = await this.db
      .select()
      .from(t.seats)
      .where(and(eq(t.seats.tenantId, row.tenantId), eq(t.seats.bookingId, row.id)));
    return toBooking(row, seatRows);
  }

  async getById(tenant: TenantId, id: BookingId): Promise<Booking | null> {
    const [row] = await this.db
      .select()
      .from(t.bookings)
      .where(and(eq(t.bookings.tenantId, tenant), eq(t.bookings.id, id)))
      .limit(1);
    return this.hydrate(row);
  }

  async getByCode(tenant: TenantId, code: string): Promise<Booking | null> {
    const [row] = await this.db
      .select()
      .from(t.bookings)
      .where(and(eq(t.bookings.tenantId, tenant), eq(t.bookings.bookingCode, code)))
      .limit(1);
    return this.hydrate(row);
  }

  private async hydrateMany(
    rows: (typeof t.bookings.$inferSelect)[]
  ): Promise<Booking[]> {
    if (rows.length === 0) return [];
    const seatRows = await this.db
      .select()
      .from(t.seats)
      .where(
        inArray(
          t.seats.bookingId,
          rows.map((r) => r.id)
        )
      );
    return rows.map((row) =>
      toBooking(
        row,
        seatRows.filter((s) => s.bookingId === row.id)
      )
    );
  }

  async listForGuest(tenant: TenantId, guest: UserId): Promise<Booking[]> {
    const rows = await this.db
      .select()
      .from(t.bookings)
      .where(and(eq(t.bookings.tenantId, tenant), eq(t.bookings.guestUserId, guest)))
      .orderBy(desc(t.bookings.createdAt));
    return this.hydrateMany(rows);
  }

  async listForOccurrence(tenant: TenantId, id: OccurrenceId): Promise<Booking[]> {
    const rows = await this.db
      .select()
      .from(t.bookings)
      .where(and(eq(t.bookings.tenantId, tenant), eq(t.bookings.occurrenceId, id)))
      .orderBy(desc(t.bookings.createdAt));
    return this.hydrateMany(rows);
  }

  async update(booking: Booking): Promise<Booking> {
    await this.db
      .update(t.bookings)
      .set(fromBooking(booking))
      .where(
        and(eq(t.bookings.tenantId, booking.tenantId), eq(t.bookings.id, booking.id))
      );
    return booking;
  }
}

/* ----------------------------- Conversations ---------------------------- */

class PgConversationRepository implements ConversationRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async getById(tenant: TenantId, id: ConversationId): Promise<Conversation | null> {
    const [row] = await this.db
      .select()
      .from(t.conversations)
      .where(and(eq(t.conversations.tenantId, tenant), eq(t.conversations.id, id)))
      .limit(1);
    if (!row) return null;

    const messageRows = await this.db
      .select()
      .from(t.messages)
      .where(
        and(eq(t.messages.tenantId, tenant), eq(t.messages.conversationId, row.id))
      )
      .orderBy(asc(t.messages.sentAt));
    return toConversation(row, messageRows);
  }

  async listForUser(tenant: TenantId, user: UserId): Promise<Conversation[]> {
    const rows = await this.db
      .select()
      .from(t.conversations)
      .where(
        and(
          eq(t.conversations.tenantId, tenant),
          sql`${user} = ANY(${t.conversations.participantUserIds})`
        )
      );
    if (rows.length === 0) return [];

    const messageRows = await this.db
      .select()
      .from(t.messages)
      .where(
        and(
          eq(t.messages.tenantId, tenant),
          inArray(
            t.messages.conversationId,
            rows.map((r) => r.id)
          )
        )
      )
      .orderBy(asc(t.messages.sentAt));

    return rows.map((row) =>
      toConversation(
        row,
        messageRows.filter((m) => m.conversationId === row.id)
      )
    );
  }

  /** Upserts the conversation and appends any messages not yet stored. */
  async save(conversation: Conversation): Promise<Conversation> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(t.conversations)
        .values(fromConversation(conversation))
        .onConflictDoUpdate({
          target: t.conversations.id,
          set: {
            clearViolations: conversation.clearViolations,
            ambiguousSignals: conversation.ambiguousSignals,
            participantUserIds: conversation.participantUserIds,
          },
        });

      if (conversation.messages.length > 0) {
        await tx
          .insert(t.messages)
          .values(
            conversation.messages.map((m) => fromMessage(m, conversation.tenantId))
          )
          .onConflictDoNothing({ target: t.messages.id });
      }
    });
    return conversation;
  }
}

/* ------------------------------- Incidents ------------------------------ */

class PgIncidentRepository implements IncidentRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async create(incident: Incident): Promise<Incident> {
    await this.db.insert(t.incidents).values(fromIncident(incident));
    return incident;
  }

  async getById(tenant: TenantId, id: IncidentId): Promise<Incident | null> {
    const [row] = await this.db
      .select()
      .from(t.incidents)
      .where(and(eq(t.incidents.tenantId, tenant), eq(t.incidents.id, id)))
      .limit(1);
    return row ? toIncident(row) : null;
  }

  async list(
    tenant: TenantId,
    opts?: { status?: Incident["status"]; limit?: number }
  ): Promise<Incident[]> {
    const filters = [eq(t.incidents.tenantId, tenant)];
    if (opts?.status) filters.push(eq(t.incidents.status, opts.status));

    const base = this.db
      .select()
      .from(t.incidents)
      .where(and(...filters))
      .orderBy(desc(t.incidents.createdAt));

    const rows = await (opts?.limit ? base.limit(opts.limit) : base);
    return rows.map(toIncident);
  }

  async update(incident: Incident): Promise<Incident> {
    await this.db
      .update(t.incidents)
      .set(fromIncident(incident))
      .where(
        and(eq(t.incidents.tenantId, incident.tenantId), eq(t.incidents.id, incident.id))
      );
    return incident;
  }

  async listRiskSignals(
    tenant: TenantId,
    opts?: { limit?: number }
  ): Promise<RiskSignal[]> {
    const base = this.db
      .select()
      .from(t.riskSignals)
      .where(eq(t.riskSignals.tenantId, tenant))
      .orderBy(desc(t.riskSignals.observedAt));
    const rows = await (opts?.limit ? base.limit(opts.limit) : base);
    return rows.map(toRiskSignal);
  }

  async createRiskSignal(signal: RiskSignal): Promise<RiskSignal> {
    await this.db.insert(t.riskSignals).values(fromRiskSignal(signal));
    return signal;
  }
}

/* ------------------------------ Reputation ------------------------------ */

class PgReputationRepository implements ReputationRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async listForExperience(tenant: TenantId, id: ExperienceId): Promise<Review[]> {
    const rows = await this.db
      .select()
      .from(t.reviews)
      .where(and(eq(t.reviews.tenantId, tenant), eq(t.reviews.experienceId, id)))
      .orderBy(desc(t.reviews.createdAt));
    return rows.map(toReview);
  }

  async listForHost(tenant: TenantId, host: HostId): Promise<Review[]> {
    const rows = await this.db
      .select()
      .from(t.reviews)
      .where(and(eq(t.reviews.tenantId, tenant), eq(t.reviews.hostId, host)))
      .orderBy(desc(t.reviews.createdAt));
    return rows.map(toReview);
  }

  async create(review: Review): Promise<Review> {
    await this.db.insert(t.reviews).values(fromReview(review));
    return review;
  }
}

/* -------------------------------- Ledger -------------------------------- */

class PgLedgerRepository implements LedgerRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async append(entries: LedgerEntry[]): Promise<LedgerEntry[]> {
    if (entries.length === 0) return [];
    await this.db.insert(t.ledgerEntries).values(entries.map(fromLedgerEntry));
    return entries;
  }

  async listForBooking(tenant: TenantId, id: BookingId): Promise<LedgerEntry[]> {
    const rows = await this.db
      .select()
      .from(t.ledgerEntries)
      .where(
        and(eq(t.ledgerEntries.tenantId, tenant), eq(t.ledgerEntries.bookingId, id))
      )
      .orderBy(asc(t.ledgerEntries.createdAt));
    return rows.map(toLedgerEntry);
  }

  async listForHost(tenant: TenantId, hostUserId: UserId): Promise<LedgerEntry[]> {
    const rows = await this.db
      .select()
      .from(t.ledgerEntries)
      .where(
        and(
          eq(t.ledgerEntries.tenantId, tenant),
          eq(t.ledgerEntries.payeeUserId, hostUserId)
        )
      )
      .orderBy(desc(t.ledgerEntries.createdAt));
    return rows.map(toLedgerEntry);
  }

  /** Moves status only. Amounts are immutable; corrections are new entries. */
  async updateStatus(
    tenant: TenantId,
    booking: BookingId,
    type: LedgerEntry["type"],
    from: LedgerEntry["status"],
    to: LedgerEntry["status"]
  ): Promise<LedgerEntry[]> {
    const rows = await this.db
      .update(t.ledgerEntries)
      .set({ status: to })
      .where(
        and(
          eq(t.ledgerEntries.tenantId, tenant),
          eq(t.ledgerEntries.bookingId, booking),
          eq(t.ledgerEntries.type, type),
          eq(t.ledgerEntries.status, from)
        )
      )
      .returning();
    return rows.map(toLedgerEntry);
  }
}

/* -------------------------------- Users --------------------------------- */

class PgUserRepository implements UserRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async getContact(
    tenant: TenantId,
    user: UserId
  ): Promise<UserContact | null> {
    // Two columns, named explicitly. `select()` with no argument would pull the
    // whole row — legal name, phone, payout reference — into a value that only
    // needs an address, and the next person to reuse this method would inherit
    // all of it.
    const [row] = await this.db
      .select({ email: t.users.email, displayName: t.users.displayName })
      .from(t.users)
      .where(and(eq(t.users.tenantId, tenant), eq(t.users.id, user)))
      .limit(1);

    return row ?? null;
  }
}

/* ------------------------------ Container ------------------------------- */

export function createPostgresRepositories(db: PostgresDatabase): Repositories {
  return {
    experiences: new PgExperienceRepository(db),
    bookings: new PgBookingRepository(db),
    conversations: new PgConversationRepository(db),
    incidents: new PgIncidentRepository(db),
    reputation: new PgReputationRepository(db),
    ledger: new PgLedgerRepository(db),
    users: new PgUserRepository(db),
  };
}
