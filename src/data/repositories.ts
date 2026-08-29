/**
 * Repository interfaces for mutable marketplace data.
 *
 * Business records never live in client configuration. These interfaces are the
 * seam between the application and whatever eventually stores them.
 *
 * Every method is tenant-scoped. Even though one deployment currently serves one
 * client, carrying `tenantId` through the runtime model now means a future
 * multi-brand backend does not require a destructive migration.
 *
 * The in-memory adapter (src/data/memory) satisfies these for the demo. See
 * docs/provider-integrations.md for the Postgres/Supabase boundary.
 */

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
import type {
  DiscoveryIntent,
  Experience,
  ExperienceCategory,
  ExperienceOccurrence,
} from "@/domain/experience";
import type { HostProfile } from "@/domain/identity";
import type { Booking } from "@/domain/booking";
import type { Conversation } from "@/domain/messaging";
import type { Incident, RiskSignal } from "@/domain/incident";
import type { Review } from "@/domain/review";
import type { LedgerEntry } from "@/domain/ledger";
import type { Money } from "@/domain/money";

export type ExperienceQuery = {
  tenantId: TenantId;
  category?: ExperienceCategory;
  intent?: DiscoveryIntent;
  hostId?: HostId;
  /** Inclusive upper bound applied to the cheapest available price. */
  maxPrice?: Money;
  search?: string;
  limit?: number;
};

export interface ExperienceRepository {
  list(query: ExperienceQuery): Promise<Experience[]>;
  getBySlug(tenantId: TenantId, slug: string): Promise<Experience | null>;
  getById(tenantId: TenantId, id: ExperienceId): Promise<Experience | null>;
  listByHost(tenantId: TenantId, hostId: HostId): Promise<Experience[]>;

  listOccurrences(
    tenantId: TenantId,
    experienceId: ExperienceId
  ): Promise<ExperienceOccurrence[]>;
  getOccurrence(
    tenantId: TenantId,
    id: OccurrenceId
  ): Promise<ExperienceOccurrence | null>;
  /** Occurrences starting within `hours`, used by "live tonight" discovery. */
  listUpcoming(
    tenantId: TenantId,
    opts?: { withinHours?: number; limit?: number; crowdsharedOnly?: boolean }
  ): Promise<ExperienceOccurrence[]>;

  /**
   * Consumes seat inventory for an occurrence. A repository operation rather
   * than a caller-side mutation, so inventory has one owner — a real adapter
   * implements this as a conditional update and is the concurrency boundary.
   */
  reserveSeats(
    tenantId: TenantId,
    occurrenceId: OccurrenceId,
    count: number
  ): Promise<void>;

  getHost(tenantId: TenantId, hostId: HostId): Promise<HostProfile | null>;
  getHostByHandle(tenantId: TenantId, handle: string): Promise<HostProfile | null>;
  listHosts(tenantId: TenantId, opts?: { limit?: number }): Promise<HostProfile[]>;
}

export interface BookingRepository {
  create(booking: Booking): Promise<Booking>;
  getById(tenantId: TenantId, id: BookingId): Promise<Booking | null>;
  getByCode(tenantId: TenantId, code: string): Promise<Booking | null>;
  listForGuest(tenantId: TenantId, guestUserId: UserId): Promise<Booking[]>;
  listForOccurrence(tenantId: TenantId, id: OccurrenceId): Promise<Booking[]>;
  update(booking: Booking): Promise<Booking>;
}

export interface ConversationRepository {
  getById(tenantId: TenantId, id: ConversationId): Promise<Conversation | null>;
  listForUser(tenantId: TenantId, userId: UserId): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<Conversation>;
}

export interface IncidentRepository {
  create(incident: Incident): Promise<Incident>;
  getById(tenantId: TenantId, id: IncidentId): Promise<Incident | null>;
  list(
    tenantId: TenantId,
    opts?: { status?: Incident["status"]; limit?: number }
  ): Promise<Incident[]>;
  update(incident: Incident): Promise<Incident>;

  listRiskSignals(tenantId: TenantId, opts?: { limit?: number }): Promise<RiskSignal[]>;
  createRiskSignal(signal: RiskSignal): Promise<RiskSignal>;
}

export interface ReputationRepository {
  listForExperience(tenantId: TenantId, id: ExperienceId): Promise<Review[]>;
  listForHost(tenantId: TenantId, hostId: HostId): Promise<Review[]>;
  create(review: Review): Promise<Review>;
}

export interface LedgerRepository {
  append(entries: LedgerEntry[]): Promise<LedgerEntry[]>;
  listForBooking(tenantId: TenantId, id: BookingId): Promise<LedgerEntry[]>;
  listForHost(tenantId: TenantId, hostUserId: UserId): Promise<LedgerEntry[]>;
  /**
   * Transitions matching entries to a new status — how a `pending` guarantee
   * becomes `released` once a session is delivered, or how a `held` amount is
   * resolved after review. Amounts are never edited; only status moves.
   */
  updateStatus(
    tenantId: TenantId,
    bookingId: BookingId,
    type: LedgerEntry["type"],
    from: LedgerEntry["status"],
    to: LedgerEntry["status"]
  ): Promise<LedgerEntry[]>;
}

export type Repositories = {
  experiences: ExperienceRepository;
  bookings: BookingRepository;
  conversations: ConversationRepository;
  incidents: IncidentRepository;
  reputation: ReputationRepository;
  ledger: LedgerRepository;
};
