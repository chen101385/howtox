/**
 * Seeded reviews and trust-&-safety records.
 *
 * The incidents below populate the operations queue so the review workflow is
 * demonstrable. They are fictional and illustrative; none represents a finding.
 */

import { bookingId, experienceId, hostId, incidentId, reviewId, riskSignalId, userId } from "@/domain/ids";
import { money } from "@/domain/money";
import type { Review } from "@/domain/review";
import type { Incident, RiskSignal } from "@/domain/incident";
import { DEMO_TENANT } from "./hosts";

const iso = (daysAgo: number) =>
  new Date(Date.UTC(2026, 7, 20 - daysAgo)).toISOString();

export const SEED_REVIEWS: Review[] = [
  {
    id: reviewId("rev_001"),
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_001"),
    experienceId: experienceId("exp_ghost_stories"),
    hostId: hostId("hst_lamplighter"),
    authorUserId: userId("usr_guest_ada"),
    rating: 5,
    publicComment:
      "I did not expect to be genuinely unsettled by a video call. The voting thing works far better than it sounds.",
    structured: {
      deliveredAsAdvertised: true,
      meaningfullyInteractive: true,
      wouldBookAgain: true,
      memorable: true,
      inappropriateBehavior: false,
    },
    tip: money(500),
    createdAt: iso(12),
  },
  {
    id: reviewId("rev_002"),
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_002"),
    experienceId: experienceId("exp_ghost_stories"),
    hostId: hostId("hst_lamplighter"),
    authorUserId: userId("usr_guest_ada"),
    rating: 4,
    publicComment: "Great hour. Would have liked a little longer on the second story.",
    structured: {
      deliveredAsAdvertised: true,
      meaningfullyInteractive: true,
      wouldBookAgain: true,
      memorable: false,
      inappropriateBehavior: false,
    },
    createdAt: iso(20),
  },
  {
    id: reviewId("rev_003"),
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_003"),
    experienceId: experienceId("exp_trivia"),
    hostId: hostId("hst_ono"),
    authorUserId: userId("usr_guest_ada"),
    rating: 5,
    publicComment: "We argued about question 6 for a full day afterwards. Perfect.",
    structured: {
      deliveredAsAdvertised: true,
      meaningfullyInteractive: true,
      wouldBookAgain: true,
      memorable: true,
      inappropriateBehavior: false,
    },
    createdAt: iso(6),
  },
  {
    id: reviewId("rev_004"),
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_004"),
    experienceId: experienceId("exp_cooking"),
    hostId: hostId("hst_pep"),
    authorUserId: userId("usr_guest_ada"),
    rating: 3,
    publicComment:
      "The dish worked but my kitchen could not keep up with the pace. Not the host's fault.",
    // A middling rating with no misconduct: this must NOT create a safety review,
    // and must NOT affect guaranteed compensation.
    structured: {
      deliveredAsAdvertised: true,
      meaningfullyInteractive: true,
      wouldBookAgain: false,
      memorable: false,
      inappropriateBehavior: false,
    },
    createdAt: iso(3),
  },
];

export const SEED_INCIDENTS: Incident[] = [
  {
    id: incidentId("inc_001"),
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_010"),
    sessionId: "ses_seed_010",
    reporterUserId: userId("usr_host_dev"),
    reportedUserId: userId("usr_guest_ada"),
    category: "intoxication_or_disruptive",
    severity: "low",
    status: "triaged",
    description:
      "Guest repeatedly interrupted other attendees and would not mute when asked. Removed 20 minutes in.",
    createdAt: iso(2),
    updatedAt: iso(1),
    reviewNotes: [
      { at: iso(1), note: "Host used mute then remove. Session continued normally afterwards." },
    ],
  },
  {
    id: incidentId("inc_002"),
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_011"),
    sessionId: "ses_seed_011",
    reporterUserId: userId("usr_guest_ada"),
    category: "technical_failure",
    severity: "low",
    status: "investigating",
    description:
      "Host audio dropped out for roughly 15 minutes and the session ended early.",
    createdAt: iso(1),
    updatedAt: iso(1),
    reviewNotes: [
      { at: iso(1), note: "Session ended as technical_failure. Default is credit or reschedule; awaiting reviewer decision." },
    ],
  },
  {
    id: incidentId("inc_003"),
    tenantId: DEMO_TENANT,
    reporterUserId: userId("usr_guest_ada"),
    reportedUserId: userId("usr_host_halcyon"),
    category: "off_platform_transaction_attempt",
    severity: "medium",
    status: "submitted",
    description:
      "Host suggested booking the next lesson directly and sent a payment handle in chat.",
    createdAt: iso(0),
    updatedAt: iso(0),
    reviewNotes: [],
  },
  {
    id: incidentId("inc_004"),
    tenantId: DEMO_TENANT,
    bookingId: bookingId("bkg_seed_012"),
    reporterUserId: userId("usr_host_ripley"),
    category: "unauthorized_recording",
    severity: "medium",
    status: "submitted",
    description:
      "A guest mentioned they were recording the session. Watermark identifier captured at the time of the report.",
    createdAt: iso(0),
    updatedAt: iso(0),
    reviewNotes: [],
  },
];

export const SEED_RISK_SIGNALS: RiskSignal[] = [
  {
    id: riskSignalId("rsk_001"),
    tenantId: DEMO_TENANT,
    userId: userId("usr_host_halcyon"),
    kind: "off_platform_payment",
    confidence: 82,
    observedAt: iso(0),
    context: "Message contained a payment handle (redacted) after a booking enquiry.",
    reviewed: false,
  },
  {
    id: riskSignalId("rsk_002"),
    tenantId: DEMO_TENANT,
    userId: userId("usr_host_halcyon"),
    kind: "repeat_circumvention",
    confidence: 64,
    observedAt: iso(1),
    context: "Second flagged message in seven days from the same account.",
    reviewed: false,
  },
  {
    id: riskSignalId("rsk_003"),
    tenantId: DEMO_TENANT,
    userId: userId("usr_guest_ada"),
    kind: "off_platform_contact",
    confidence: 41,
    observedAt: iso(4),
    context: "Ambiguous social handle shared in conversation. Warned, not blocked.",
    reviewed: true,
  },
];
