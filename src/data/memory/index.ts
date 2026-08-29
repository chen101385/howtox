/**
 * In-memory repository adapters.
 *
 * Backed by the seed data so the application runs with no database. State lives
 * for the lifetime of the process: bookings made in the demo survive navigation
 * but not a server restart, which is the honest behavior for a demo adapter.
 *
 * Every query filters by `tenantId`, mirroring the isolation a real backend must
 * enforce at the row level.
 */

import type {
  BookingRepository,
  ConversationRepository,
  ExperienceQuery,
  ExperienceRepository,
  IncidentRepository,
  LedgerRepository,
  Repositories,
  ReputationRepository,
} from "../repositories";
import type {
  Experience,
  ExperienceOccurrence,
} from "@/domain/experience";
import { resolveSeatPrice, startsWithinHours } from "@/domain/experience";
import type { HostProfile } from "@/domain/identity";
import type { Booking } from "@/domain/booking";
import type { Conversation } from "@/domain/messaging";
import type { Incident, RiskSignal } from "@/domain/incident";
import type { Review } from "@/domain/review";
import type { LedgerEntry } from "@/domain/ledger";
import type { BookingId, ExperienceId, HostId, IncidentId, OccurrenceId, TenantId, UserId, ConversationId } from "@/domain/ids";

import { SEED_EXPERIENCES } from "../seed/experiences";
import { SEED_HOSTS } from "../seed/hosts";
import { generateOccurrences } from "../seed/occurrences";
import { SEED_INCIDENTS, SEED_REVIEWS, SEED_RISK_SIGNALS } from "../seed/reviews";
import { SEED_LEDGER_ENTRIES } from "../seed/ledger";

/* ------------------------------ Experiences ----------------------------- */

class MemoryExperienceRepository implements ExperienceRepository {
  private readonly experiences: Experience[] = [...SEED_EXPERIENCES];
  private readonly hosts: HostProfile[] = [...SEED_HOSTS];
  private occurrences: ExperienceOccurrence[] = generateOccurrences();

  /** Regenerates the relative schedule so a long-running dev server stays fresh. */
  private refreshIfStale(): void {
    const soonest = this.occurrences
      .map((o) => new Date(o.startsAt).getTime())
      .sort((a, b) => a - b)[0];
    if (soonest !== undefined && soonest < Date.now()) {
      this.occurrences = generateOccurrences();
    }
  }

  private scoped(tenantId: TenantId): Experience[] {
    return this.experiences.filter(
      (e) => e.tenantId === tenantId && e.status === "published"
    );
  }

  /** Cheapest price across the modes an experience offers, for price filtering. */
  private lowestPriceMinor(e: Experience): number | undefined {
    const candidates = [
      e.pricing.perSeat?.amountMinor,
      e.pricing.oneToOne?.amountMinor,
      e.pricing.privateGroup?.amountMinor,
    ].filter((v): v is number => typeof v === "number");
    return candidates.length ? Math.min(...candidates) : undefined;
  }

  async list(query: ExperienceQuery): Promise<Experience[]> {
    this.refreshIfStale();
    let results = this.scoped(query.tenantId);

    if (query.category) {
      results = results.filter(
        (e) =>
          e.category === query.category ||
          e.secondaryCategories?.includes(query.category!)
      );
    }

    if (query.intent) {
      const intent = query.intent;
      results =
        intent === "live_tonight"
          ? results.filter((e) =>
              this.occurrences.some(
                (o) => o.experienceId === e.id && startsWithinHours(o, 12)
              )
            )
          : results.filter((e) => e.intents.includes(intent));
    }

    if (query.hostId) results = results.filter((e) => e.hostId === query.hostId);

    if (query.maxPrice) {
      const max = query.maxPrice.amountMinor;
      results = results.filter((e) => {
        const low = this.lowestPriceMinor(e);
        return low !== undefined && low <= max;
      });
    }

    if (query.search) {
      const needle = query.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(needle) ||
          e.tagline.toLowerCase().includes(needle) ||
          e.description.toLowerCase().includes(needle) ||
          e.category.includes(needle)
      );
    }

    return query.limit ? results.slice(0, query.limit) : results;
  }

  async getBySlug(tenantId: TenantId, slug: string): Promise<Experience | null> {
    return this.scoped(tenantId).find((e) => e.slug === slug) ?? null;
  }

  async getById(tenantId: TenantId, id: ExperienceId): Promise<Experience | null> {
    return this.scoped(tenantId).find((e) => e.id === id) ?? null;
  }

  async listByHost(tenantId: TenantId, hostId: HostId): Promise<Experience[]> {
    return this.scoped(tenantId).filter((e) => e.hostId === hostId);
  }

  async listOccurrences(
    tenantId: TenantId,
    experienceId: ExperienceId
  ): Promise<ExperienceOccurrence[]> {
    this.refreshIfStale();
    return this.occurrences
      .filter((o) => o.tenantId === tenantId && o.experienceId === experienceId)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  async getOccurrence(
    tenantId: TenantId,
    id: OccurrenceId
  ): Promise<ExperienceOccurrence | null> {
    this.refreshIfStale();
    return (
      this.occurrences.find((o) => o.tenantId === tenantId && o.id === id) ?? null
    );
  }

  async listUpcoming(
    tenantId: TenantId,
    opts?: { withinHours?: number; limit?: number; crowdsharedOnly?: boolean }
  ): Promise<ExperienceOccurrence[]> {
    this.refreshIfStale();
    let results = this.occurrences
      .filter((o) => o.tenantId === tenantId && o.status === "scheduled")
      .filter((o) => new Date(o.startsAt).getTime() > Date.now());

    if (opts?.withinHours !== undefined) {
      results = results.filter((o) => startsWithinHours(o, opts.withinHours!));
    }
    if (opts?.crowdsharedOnly) {
      results = results.filter((o) => o.bookingMode === "crowdshared");
    }

    results.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return opts?.limit ? results.slice(0, opts.limit) : results;
  }

  async getHost(tenantId: TenantId, id: HostId): Promise<HostProfile | null> {
    return this.hosts.find((h) => h.tenantId === tenantId && h.id === id) ?? null;
  }

  async getHostByHandle(tenantId: TenantId, handle: string): Promise<HostProfile | null> {
    return (
      this.hosts.find((h) => h.tenantId === tenantId && h.public.handle === handle) ??
      null
    );
  }

  async listHosts(tenantId: TenantId, opts?: { limit?: number }): Promise<HostProfile[]> {
    const results = this.hosts.filter((h) => h.tenantId === tenantId);
    return opts?.limit ? results.slice(0, opts.limit) : results;
  }

  async reserveSeats(
    tenantId: TenantId,
    id: OccurrenceId,
    count: number
  ): Promise<void> {
    const occurrence = this.occurrences.find(
      (o) => o.tenantId === tenantId && o.id === id
    );
    if (!occurrence) return;
    occurrence.seatsBooked = Math.min(
      occurrence.capacity,
      occurrence.seatsBooked + count
    );
    if (occurrence.seatsBooked >= occurrence.capacity) occurrence.status = "sold_out";
  }

  priceForOccurrence(occurrence: ExperienceOccurrence, experience: Experience) {
    return resolveSeatPrice(occurrence, experience);
  }
}

/* -------------------------------- Bookings ------------------------------ */

class MemoryBookingRepository implements BookingRepository {
  private readonly bookings = new Map<string, Booking>();

  async create(booking: Booking): Promise<Booking> {
    this.bookings.set(booking.id, booking);
    return booking;
  }

  async getById(tenantId: TenantId, id: BookingId): Promise<Booking | null> {
    const booking = this.bookings.get(id);
    return booking && booking.tenantId === tenantId ? booking : null;
  }

  async getByCode(tenantId: TenantId, code: string): Promise<Booking | null> {
    return (
      Array.from(this.bookings.values()).find(
        (b) => b.tenantId === tenantId && b.bookingCode === code
      ) ?? null
    );
  }

  async listForGuest(tenantId: TenantId, guestUserId: UserId): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (b) => b.tenantId === tenantId && b.guestUserId === guestUserId
    );
  }

  async listForOccurrence(tenantId: TenantId, id: OccurrenceId): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (b) => b.tenantId === tenantId && b.occurrenceId === id
    );
  }

  async update(booking: Booking): Promise<Booking> {
    this.bookings.set(booking.id, booking);
    return booking;
  }
}

/* ----------------------------- Conversations ---------------------------- */

class MemoryConversationRepository implements ConversationRepository {
  private readonly conversations = new Map<string, Conversation>();

  async getById(tenantId: TenantId, id: ConversationId): Promise<Conversation | null> {
    const c = this.conversations.get(id);
    return c && c.tenantId === tenantId ? c : null;
  }

  async listForUser(tenantId: TenantId, userId: UserId): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (c) => c.tenantId === tenantId && c.participantUserIds.includes(userId)
    );
  }

  async save(conversation: Conversation): Promise<Conversation> {
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }
}

/* ------------------------------- Incidents ------------------------------ */

class MemoryIncidentRepository implements IncidentRepository {
  private readonly incidents: Incident[] = [...SEED_INCIDENTS];
  private readonly signals: RiskSignal[] = [...SEED_RISK_SIGNALS];

  async create(incident: Incident): Promise<Incident> {
    this.incidents.unshift(incident);
    return incident;
  }

  async getById(tenantId: TenantId, id: IncidentId): Promise<Incident | null> {
    return (
      this.incidents.find((i) => i.tenantId === tenantId && i.id === id) ?? null
    );
  }

  async list(
    tenantId: TenantId,
    opts?: { status?: Incident["status"]; limit?: number }
  ): Promise<Incident[]> {
    let results = this.incidents.filter((i) => i.tenantId === tenantId);
    if (opts?.status) results = results.filter((i) => i.status === opts.status);
    return opts?.limit ? results.slice(0, opts.limit) : results;
  }

  async update(incident: Incident): Promise<Incident> {
    const index = this.incidents.findIndex((i) => i.id === incident.id);
    if (index >= 0) this.incidents[index] = incident;
    return incident;
  }

  async listRiskSignals(
    tenantId: TenantId,
    opts?: { limit?: number }
  ): Promise<RiskSignal[]> {
    const results = this.signals.filter((s) => s.tenantId === tenantId);
    return opts?.limit ? results.slice(0, opts.limit) : results;
  }

  async createRiskSignal(signal: RiskSignal): Promise<RiskSignal> {
    this.signals.unshift(signal);
    return signal;
  }
}

/* ------------------------------ Reputation ------------------------------ */

class MemoryReputationRepository implements ReputationRepository {
  private readonly reviews: Review[] = [...SEED_REVIEWS];

  async listForExperience(tenantId: TenantId, id: ExperienceId): Promise<Review[]> {
    return this.reviews.filter((r) => r.tenantId === tenantId && r.experienceId === id);
  }

  async listForHost(tenantId: TenantId, hostId: HostId): Promise<Review[]> {
    return this.reviews.filter((r) => r.tenantId === tenantId && r.hostId === hostId);
  }

  async create(review: Review): Promise<Review> {
    this.reviews.unshift(review);
    return review;
  }
}

/* -------------------------------- Ledger -------------------------------- */

class MemoryLedgerRepository implements LedgerRepository {
  private readonly entries: LedgerEntry[] = [...SEED_LEDGER_ENTRIES];

  async append(entries: LedgerEntry[]): Promise<LedgerEntry[]> {
    this.entries.push(...entries);
    return entries;
  }

  async listForBooking(tenantId: TenantId, id: BookingId): Promise<LedgerEntry[]> {
    return this.entries.filter((e) => e.tenantId === tenantId && e.bookingId === id);
  }

  async listForHost(tenantId: TenantId, hostUserId: UserId): Promise<LedgerEntry[]> {
    return this.entries.filter(
      (e) => e.tenantId === tenantId && e.payeeUserId === hostUserId
    );
  }

  async updateStatus(
    tenantId: TenantId,
    bookingId: BookingId,
    type: LedgerEntry["type"],
    from: LedgerEntry["status"],
    to: LedgerEntry["status"]
  ): Promise<LedgerEntry[]> {
    const matched = this.entries.filter(
      (e) =>
        e.tenantId === tenantId &&
        e.bookingId === bookingId &&
        e.type === type &&
        e.status === from
    );
    for (const entry of matched) entry.status = to;
    return matched;
  }
}

/* ------------------------------ Container ------------------------------- */

export function createMemoryRepositories(): Repositories {
  return {
    experiences: new MemoryExperienceRepository(),
    bookings: new MemoryBookingRepository(),
    conversations: new MemoryConversationRepository(),
    incidents: new MemoryIncidentRepository(),
    reputation: new MemoryReputationRepository(),
    ledger: new MemoryLedgerRepository(),
  };
}
