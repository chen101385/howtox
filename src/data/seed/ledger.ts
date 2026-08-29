/**
 * Seeded ledger history for the demo host.
 *
 * Shows the shape a real payout history takes: a released guarantee per completed
 * session, tips, a bonus still pending review, and one amount held by a dispute.
 *
 * Note what these entries demonstrate: `bkg_seed_004` earned a middling review,
 * and its guaranteed compensation is still `released`. Ordinary dissatisfaction
 * does not touch the guarantee.
 */

import { bookingId, userId } from "@/domain/ids";
import { money } from "@/domain/money";
import { createEntry, type LedgerEntry } from "@/domain/ledger";
import { DEMO_TENANT } from "./hosts";

const HOST = userId("usr_host_lamplighter");

const at = (daysAgo: number) =>
  new Date(Date.UTC(2026, 7, 29 - daysAgo, 20, 0, 0)).toISOString();

export const SEED_LEDGER_ENTRIES: LedgerEntry[] = [
  createEntry({
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_001"),
    type: "host_guaranteed_compensation",
    amount: money(12600),
    status: "released",
    payeeUserId: HOST,
    memo: "Crowdshared session completed — guaranteed compensation released",
    at: at(12),
  }),
  createEntry({
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_001"),
    type: "tip",
    amount: money(500),
    status: "released",
    payeeUserId: HOST,
    memo: "Guest tip (100% to host)",
    at: at(12),
  }),
  createEntry({
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_002"),
    type: "host_guaranteed_compensation",
    amount: money(8400),
    status: "released",
    payeeUserId: HOST,
    memo: "Session completed — guaranteed compensation released",
    at: at(20),
  }),
  createEntry({
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_004"),
    // 3★ review, guarantee still released — the rating does not gate base pay.
    type: "host_guaranteed_compensation",
    amount: money(5250),
    status: "released",
    payeeUserId: HOST,
    memo: "Session completed — guaranteed compensation released (rating does not affect this)",
    at: at(3),
  }),
  createEntry({
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_002"),
    type: "performance_bonus",
    amount: money(1200),
    status: "pending",
    payeeUserId: HOST,
    memo: "Performance bonus (pending review): 4/4 structured quality signals positive",
    at: at(19),
  }),
  createEntry({
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_011"),
    type: "dispute_hold",
    amount: money(6300),
    status: "held",
    payeeUserId: HOST,
    memo: 'Session ended as "technical_failure" — held pending human review',
    at: at(1),
  }),
];
