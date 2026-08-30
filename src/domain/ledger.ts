/**
 * Ledger and tiered compensation.
 *
 * Money is recorded as discrete, signed entries rather than a single "payout"
 * number. That way a dispute, tip, bonus or partial refund is an additional entry
 * with its own timestamp and reason — the history stays reconstructible, which is
 * exactly what a payout dispute needs.
 *
 * Core product rule encoded here: **guaranteed host compensation is earned by
 * delivering legitimate, compliant time, and is NOT a function of the guest's
 * star rating.** Ordinary dissatisfaction reduces the bonus, never the base.
 */

import { add, money, percentOf, sum, zero, type Money } from "./money";
import type { BookingId, LedgerEntryId, TenantId, UserId } from "./ids";
import type { SessionStatus } from "./session";

/**
 * Declared as a runtime array with the type derived from it, so the Postgres
 * enum in `src/data/postgres/schema.ts` can be diff-tested against this list
 * (see `schema.test.ts`). A type alone cannot be enumerated at runtime, which is
 * how a database enum and a TypeScript union quietly drift apart.
 */
export const LEDGER_ENTRY_TYPES = [
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
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

/**
 * `pending`  — recorded but not yet releasable (e.g. awaiting session completion)
 * `released` — cleared for payout/settlement
 * `held`     — frozen by a dispute; requires human resolution
 * `reversed` — undone by a later corrective entry
 */
export const LEDGER_ENTRY_STATUSES = [
  "pending",
  "released",
  "held",
  "reversed",
] as const;

export type LedgerEntryStatus = (typeof LEDGER_ENTRY_STATUSES)[number];

export type LedgerEntry = {
  id: LedgerEntryId;
  tenantId: TenantId;
  bookingId: BookingId;
  type: LedgerEntryType;
  /** Positive = credit to `payeeUserId`; negative = debit. */
  amount: Money;
  status: LedgerEntryStatus;
  /** Who this entry credits or debits. */
  payeeUserId?: UserId;
  createdAt: string;
  /** Human-readable reason, surfaced in host earnings and dispute review. */
  memo: string;
};

/* --------------------------- Compensation policy ------------------------ */

/**
 * Configurable per client. Percentages are basis points to avoid float drift.
 */
export type CompensationPolicy = {
  /**
   * Share of the guest price guaranteed to the host for delivering compliant
   * time, in basis points. Independent of rating.
   */
  guaranteedShareBps: number;
  /** Maximum additional performance bonus, in basis points of guest price. */
  maxPerformanceBonusBps: number;
  /** Platform fee, in basis points of guest price. */
  platformFeeBps: number;
  /** Payment-processing allocation placeholder, in basis points. */
  processingAllocationBps: number;
  tipsEnabled: boolean;
  /**
   * Share of guest price paid to the host when a guest cancels inside the
   * cancellation window.
   */
  lateCancellationCompensationBps: number;
  /** Hours before start after which a guest cancellation is "late". */
  cancellationWindowHours: number;
};

export const DEFAULT_COMPENSATION_POLICY: CompensationPolicy = {
  guaranteedShareBps: 7000, // 70% guaranteed to the host
  maxPerformanceBonusBps: 1000, // up to a further 10%
  platformFeeBps: 1500, // 15%
  processingAllocationBps: 300, // 3% placeholder for PSP costs
  tipsEnabled: true,
  lateCancellationCompensationBps: 5000,
  cancellationWindowHours: 24,
};

/* --------------------------- Breakdown (preview) ------------------------ */

/**
 * A pre-purchase, presentational breakdown. Shown to guests (what they pay) and
 * hosts (what they are guaranteed) before anything is charged.
 */
export type CompensationBreakdown = {
  guestPrice: Money;
  guaranteedHostCompensation: Money;
  potentialPerformanceBonus: Money;
  platformFee: Money;
  processingAllocation: Money;
  tipsEnabled: boolean;
};

export function computeBreakdown(
  guestPrice: Money,
  policy: CompensationPolicy = DEFAULT_COMPENSATION_POLICY
): CompensationBreakdown {
  return {
    guestPrice,
    guaranteedHostCompensation: percentOf(guestPrice, policy.guaranteedShareBps),
    potentialPerformanceBonus: percentOf(guestPrice, policy.maxPerformanceBonusBps),
    platformFee: percentOf(guestPrice, policy.platformFeeBps),
    processingAllocation: percentOf(guestPrice, policy.processingAllocationBps),
    tipsEnabled: policy.tipsEnabled,
  };
}

/* ----------------------------- Entry building --------------------------- */

let entrySeq = 0;
/** Deterministic-ish id generator; a real backend would use ULIDs from the DB. */
function nextEntryId(): LedgerEntryId {
  entrySeq += 1;
  return `led_${entrySeq.toString().padStart(6, "0")}` as LedgerEntryId;
}

/** Reset between tests so ids stay predictable. */
export function __resetLedgerIds(): void {
  entrySeq = 0;
}

type EntryInput = {
  tenantId: TenantId;
  bookingId: BookingId;
  type: LedgerEntryType;
  amount: Money;
  status: LedgerEntryStatus;
  payeeUserId?: UserId;
  memo: string;
  at?: string;
};

export function createEntry(input: EntryInput): LedgerEntry {
  return {
    id: nextEntryId(),
    tenantId: input.tenantId,
    bookingId: input.bookingId,
    type: input.type,
    amount: input.amount,
    status: input.status,
    payeeUserId: input.payeeUserId,
    createdAt: input.at ?? new Date().toISOString(),
    memo: input.memo,
  };
}

/**
 * Entries created at purchase time. The guest charge is recorded immediately;
 * host-side entries start `pending` because the session has not happened yet.
 */
export function entriesForPurchase(args: {
  tenantId: TenantId;
  bookingId: BookingId;
  hostUserId: UserId;
  guestPrice: Money;
  policy?: CompensationPolicy;
  at?: string;
}): LedgerEntry[] {
  const policy = args.policy ?? DEFAULT_COMPENSATION_POLICY;
  const b = computeBreakdown(args.guestPrice, policy);
  const common = { tenantId: args.tenantId, bookingId: args.bookingId, at: args.at };

  return [
    createEntry({
      ...common,
      type: "guest_charge",
      amount: b.guestPrice,
      status: "released",
      memo: "Guest payment authorized (demo adapter — no real funds moved)",
    }),
    createEntry({
      ...common,
      type: "host_guaranteed_compensation",
      amount: b.guaranteedHostCompensation,
      status: "pending",
      payeeUserId: args.hostUserId,
      memo: "Guaranteed compensation, released on compliant delivery",
    }),
    createEntry({
      ...common,
      type: "platform_fee",
      amount: b.platformFee,
      status: "released",
      memo: "Platform fee",
    }),
    createEntry({
      ...common,
      type: "processing_allocation",
      amount: b.processingAllocation,
      status: "released",
      memo: "Payment processing allocation (placeholder)",
    }),
  ];
}

/**
 * Entries produced when a session reaches a terminal state.
 *
 * Note what is deliberately absent: no branch anywhere consults a star rating to
 * decide whether guaranteed compensation is released.
 */
export function entriesForSessionOutcome(args: {
  tenantId: TenantId;
  bookingId: BookingId;
  hostUserId: UserId;
  guestPrice: Money;
  status: SessionStatus;
  policy?: CompensationPolicy;
  at?: string;
}): LedgerEntry[] {
  const policy = args.policy ?? DEFAULT_COMPENSATION_POLICY;
  const common = { tenantId: args.tenantId, bookingId: args.bookingId, at: args.at };

  switch (args.status) {
    case "completed":
      // Guaranteed compensation is released. The bonus is NOT decided here — it
      // stays pending until structured feedback and any review are complete.
      return [
        createEntry({
          ...common,
          type: "host_guaranteed_compensation",
          amount: zero(args.guestPrice.currency),
          status: "released",
          payeeUserId: args.hostUserId,
          memo: "Session completed — guaranteed compensation released",
        }),
      ];

    case "cancelled_by_guest":
      return [
        createEntry({
          ...common,
          type: "cancellation_compensation",
          amount: percentOf(args.guestPrice, policy.lateCancellationCompensationBps),
          status: "pending",
          payeeUserId: args.hostUserId,
          memo: "Guest cancelled inside the cancellation window",
        }),
      ];

    case "cancelled_by_host":
      return [
        createEntry({
          ...common,
          type: "refund",
          amount: args.guestPrice,
          status: "pending",
          memo: "Host cancelled — full guest refund pending review",
        }),
      ];

    case "technical_failure":
    case "interrupted_by_guest":
    case "interrupted_by_host":
      return [
        createEntry({
          ...common,
          type: "dispute_hold",
          amount: percentOf(args.guestPrice, policy.guaranteedShareBps),
          status: "held",
          payeeUserId: args.hostUserId,
          memo: `Session ended as "${args.status}" — held pending human review`,
        }),
      ];

    default:
      return [];
  }
}

export function tipEntry(args: {
  tenantId: TenantId;
  bookingId: BookingId;
  hostUserId: UserId;
  amount: Money;
  at?: string;
}): LedgerEntry {
  return createEntry({
    tenantId: args.tenantId,
    bookingId: args.bookingId,
    type: "tip",
    amount: args.amount,
    status: "released",
    payeeUserId: args.hostUserId,
    memo: "Guest tip (100% to host)",
    at: args.at,
  });
}

/**
 * Performance bonus. Callers must supply a rationale; bonus eligibility in this
 * pass is illustrative and is never presented as a final adjudication.
 */
export function performanceBonusEntry(args: {
  tenantId: TenantId;
  bookingId: BookingId;
  hostUserId: UserId;
  amount: Money;
  rationale: string;
  status?: LedgerEntryStatus;
  at?: string;
}): LedgerEntry {
  return createEntry({
    tenantId: args.tenantId,
    bookingId: args.bookingId,
    type: "performance_bonus",
    amount: args.amount,
    status: args.status ?? "pending",
    payeeUserId: args.hostUserId,
    memo: `Performance bonus (pending review): ${args.rationale}`,
    at: args.at,
  });
}

/* ------------------------------ Aggregation ----------------------------- */

/**
 * Entry types that represent money owed to the host.
 *
 * `dispute_hold` belongs here: it is host-payable money frozen pending review,
 * and omitting it made a held amount silently disappear from host earnings —
 * the host would see nothing at all rather than "held, under review", which is
 * exactly the situation they most need visibility into.
 */
const HOST_CREDIT_TYPES: readonly LedgerEntryType[] = [
  "host_guaranteed_compensation",
  "performance_bonus",
  "tip",
  "cancellation_compensation",
  "dispute_hold",
  "adjustment",
];

export type EarningsSummary = {
  released: Money;
  pending: Money;
  held: Money;
  tips: Money;
  currency: string;
};

/** Sums a host's ledger entries by status. Reversed entries are excluded. */
export function summarizeHostEarnings(
  entries: readonly LedgerEntry[],
  currency = "USD"
): EarningsSummary {
  const hostEntries = entries.filter(
    (e) => HOST_CREDIT_TYPES.includes(e.type) && e.status !== "reversed"
  );
  const byStatus = (s: LedgerEntryStatus) =>
    sum(hostEntries.filter((e) => e.status === s).map((e) => e.amount), currency);

  return {
    released: byStatus("released"),
    pending: byStatus("pending"),
    held: byStatus("held"),
    tips: sum(
      hostEntries.filter((e) => e.type === "tip" && e.status === "released").map((e) => e.amount),
      currency
    ),
    currency,
  };
}

/** Net position for a single booking; used by dispute review. */
export function bookingNet(entries: readonly LedgerEntry[], currency = "USD"): Money {
  return entries
    .filter((e) => e.status !== "reversed")
    .reduce<Money>((acc, e) => add(acc, e.amount), money(0, currency));
}
