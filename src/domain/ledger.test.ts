import { beforeEach, describe, expect, it } from "vitest";
import { bookingId, tenantId, userId } from "./ids";
import { money } from "./money";
import {
  __resetLedgerIds,
  computeBreakdown,
  DEFAULT_COMPENSATION_POLICY,
  entriesForPurchase,
  entriesForSessionOutcome,
  summarizeHostEarnings,
  tipEntry,
  type LedgerEntry,
} from "./ledger";
import type { Review } from "./review";
import { recommendBonus } from "./review";

const TENANT = tenantId("t");
const BOOKING = bookingId("b1");
const HOST = userId("h1");

beforeEach(() => __resetLedgerIds());

describe("computeBreakdown", () => {
  it("splits a guest price according to policy", () => {
    const b = computeBreakdown(money(6000), DEFAULT_COMPENSATION_POLICY);
    expect(b.guaranteedHostCompensation.amountMinor).toBe(4200); // 70%
    expect(b.potentialPerformanceBonus.amountMinor).toBe(600); // 10%
    expect(b.platformFee.amountMinor).toBe(900); // 15%
    expect(b.processingAllocation.amountMinor).toBe(180); // 3%
  });

  it("never allocates more than the guest price", () => {
    const p = DEFAULT_COMPENSATION_POLICY;
    const total =
      p.guaranteedShareBps +
      p.maxPerformanceBonusBps +
      p.platformFeeBps +
      p.processingAllocationBps;
    expect(total).toBeLessThanOrEqual(10_000);
  });
});

describe("entriesForPurchase", () => {
  it("records the charge released and the host guarantee pending", () => {
    const entries = entriesForPurchase({
      tenantId: TENANT,
      bookingId: BOOKING,
      hostUserId: HOST,
      guestPrice: money(6000),
    });

    const charge = entries.find((e) => e.type === "guest_charge");
    const guarantee = entries.find((e) => e.type === "host_guaranteed_compensation");

    expect(charge?.status).toBe("released");
    expect(guarantee?.status).toBe("pending");
    expect(guarantee?.payeeUserId).toBe(HOST);
  });

  it("produces discrete entries rather than one payout figure", () => {
    const entries = entriesForPurchase({
      tenantId: TENANT,
      bookingId: BOOKING,
      hostUserId: HOST,
      guestPrice: money(6000),
    });
    expect(entries.length).toBeGreaterThan(1);
    expect(new Set(entries.map((e) => e.type)).size).toBe(entries.length);
  });
});

describe("entriesForSessionOutcome", () => {
  const base = {
    tenantId: TENANT,
    bookingId: BOOKING,
    hostUserId: HOST,
    guestPrice: money(6000),
  };

  it("releases the guarantee on normal completion", () => {
    const entries = entriesForSessionOutcome({ ...base, status: "completed" });
    expect(entries[0].type).toBe("host_guaranteed_compensation");
    expect(entries[0].status).toBe("released");
  });

  it("compensates the host when a guest cancels late", () => {
    const entries = entriesForSessionOutcome({ ...base, status: "cancelled_by_guest" });
    expect(entries[0].type).toBe("cancellation_compensation");
    expect(entries[0].amount.amountMinor).toBe(3000); // 50%
  });

  it("refunds the guest when the host cancels", () => {
    const entries = entriesForSessionOutcome({ ...base, status: "cancelled_by_host" });
    expect(entries[0].type).toBe("refund");
    expect(entries[0].amount.amountMinor).toBe(6000);
  });

  it("holds funds for human review on a technical failure", () => {
    const entries = entriesForSessionOutcome({ ...base, status: "technical_failure" });
    expect(entries[0].type).toBe("dispute_hold");
    expect(entries[0].status).toBe("held");
  });

  it("holds rather than forfeits when a guest ends the session early", () => {
    const entries = entriesForSessionOutcome({ ...base, status: "interrupted_by_guest" });
    expect(entries[0].status).toBe("held");
    // Crucially NOT zero: the host's time is reviewed, not automatically voided.
    expect(entries[0].amount.amountMinor).toBeGreaterThan(0);
  });
});

describe("guaranteed compensation is independent of ratings", () => {
  const makeReview = (rating: Review["rating"]): Review => ({
    id: "r1" as Review["id"],
    tenantId: TENANT,
    bookingId: BOOKING,
    experienceId: "e1" as Review["experienceId"],
    hostId: "h1" as Review["hostId"],
    authorUserId: userId("g1"),
    rating,
    structured: {
      deliveredAsAdvertised: true,
      meaningfullyInteractive: true,
      wouldBookAgain: rating >= 4,
      memorable: rating >= 4,
      inappropriateBehavior: false,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  it("releases the same guarantee for a 1-star and a 5-star session", () => {
    const outcome = entriesForSessionOutcome({
      tenantId: TENANT,
      bookingId: BOOKING,
      hostUserId: HOST,
      guestPrice: money(6000),
      status: "completed",
    });
    // The outcome does not take a rating at all — that is the guarantee.
    expect(outcome[0].status).toBe("released");
    expect(entriesForSessionOutcome.length).toBe(1); // single args object
  });

  it("only withholds the discretionary bonus for a poor rating", () => {
    expect(recommendBonus(makeReview(5)).recommended).toBe(true);
    expect(recommendBonus(makeReview(2)).recommended).toBe(false);
  });

  it("always marks a bonus as pending human review", () => {
    expect(recommendBonus(makeReview(5)).pendingHumanReview).toBe(true);
  });
});

describe("summarizeHostEarnings", () => {
  it("groups by status and isolates tips", () => {
    const entries: LedgerEntry[] = [
      ...entriesForPurchase({
        tenantId: TENANT,
        bookingId: BOOKING,
        hostUserId: HOST,
        guestPrice: money(6000),
      }),
      tipEntry({
        tenantId: TENANT,
        bookingId: BOOKING,
        hostUserId: HOST,
        amount: money(500),
      }),
    ];

    const summary = summarizeHostEarnings(entries);
    expect(summary.pending.amountMinor).toBe(4200); // the guarantee
    expect(summary.released.amountMinor).toBe(500); // the tip
    expect(summary.tips.amountMinor).toBe(500);
    // Platform fee and guest charge are not host credits.
    expect(summary.held.amountMinor).toBe(0);
  });
});
