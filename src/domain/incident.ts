/**
 * Incidents, reports and dispute defaults.
 *
 * Nothing here adjudicates automatically. The states exist so a human reviewer
 * has an explicit queue and an auditable path; `suggestedResolution()` returns a
 * DEFAULT for a reviewer to accept or override, never a final decision.
 */

import { createStateMachine } from "./state-machine";
import type { BookingId, IncidentId, RiskSignalId, TenantId, UserId } from "./ids";
import type { SessionStatus } from "./session";

/* ------------------------------ Reporting ------------------------------- */

export type ReportCategory =
  | "harassment"
  | "sexual_or_inappropriate"
  | "hate_or_threats"
  | "intoxication_or_disruptive"
  | "unauthorized_recording"
  | "materially_different_from_listing"
  | "off_platform_transaction_attempt"
  | "technical_failure"
  | "other_safety";

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  harassment: "Harassment",
  sexual_or_inappropriate: "Sexual or inappropriate conduct",
  hate_or_threats: "Hate speech or threats",
  intoxication_or_disruptive: "Intoxication or disruptive behavior",
  unauthorized_recording: "Unauthorized recording or distribution",
  materially_different_from_listing: "Experience materially different from listing",
  off_platform_transaction_attempt: "Attempt to transact outside the platform",
  technical_failure: "Technical failure",
  other_safety: "Other safety issue",
};

/** Categories that should page a human quickly rather than sit in a backlog. */
export const URGENT_CATEGORIES: readonly ReportCategory[] = [
  "harassment",
  "sexual_or_inappropriate",
  "hate_or_threats",
] as const;

export type IncidentStatus =
  | "submitted"
  | "triaged"
  | "investigating"
  | "resolved"
  | "dismissed"
  | "appealed";

export const incidentMachine = createStateMachine<IncidentStatus>("incident", {
  submitted: ["triaged", "dismissed"],
  triaged: ["investigating", "dismissed", "resolved"],
  investigating: ["resolved", "dismissed"],
  resolved: ["appealed"],
  dismissed: ["appealed"],
  appealed: ["investigating", "resolved", "dismissed"],
});

export type IncidentSeverity = "low" | "medium" | "high";

export type Incident = {
  id: IncidentId;
  tenantId: TenantId;
  bookingId?: BookingId;
  sessionId?: string;
  reporterUserId: UserId;
  reportedUserId?: UserId;
  category: ReportCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  /** Reporter's own words. Treated as an allegation, never as a finding. */
  description: string;
  createdAt: string;
  updatedAt: string;
  /** Free-text notes added by reviewers. */
  reviewNotes: { at: string; note: string }[];
};

export function transitionIncident(incident: Incident, to: IncidentStatus): Incident {
  return {
    ...incident,
    status: incidentMachine.transition(incident.status, to),
    updatedAt: new Date().toISOString(),
  };
}

export function defaultSeverity(category: ReportCategory): IncidentSeverity {
  if (URGENT_CATEGORIES.includes(category)) return "high";
  if (category === "unauthorized_recording" || category === "off_platform_transaction_attempt") {
    return "medium";
  }
  return "low";
}

/* ---------------------------- Risk signals ------------------------------ */

/**
 * A risk signal is an INDICATOR, not proof. Signals accumulate to prompt human
 * review; they never by themselves establish misconduct or trigger a penalty.
 */
export type RiskSignalKind =
  | "off_platform_contact"
  | "off_platform_payment"
  | "repeat_circumvention"
  | "repeated_cancellations"
  | "multiple_reports";

export type RiskSignal = {
  id: RiskSignalId;
  tenantId: TenantId;
  userId: UserId;
  kind: RiskSignalKind;
  /** 0–100 confidence that the pattern is real; not a guilt score. */
  confidence: number;
  observedAt: string;
  /** Redacted context; never the full message body for privacy. */
  context: string;
  reviewed: boolean;
};

/* -------------------------- Dispute defaults ---------------------------- */

export type DisputeOutcome =
  | "guest_refund"
  | "host_cancellation_compensation"
  | "host_compensation_review"
  | "payout_review"
  | "credit_or_reschedule"
  | "release_guaranteed_compensation";

export type DisputeSuggestion = {
  outcome: DisputeOutcome;
  rationale: string;
  /**
   * True for every abnormal outcome — a human confirms before money is withheld,
   * refunded or clawed back. False only for a normal completion, where releasing
   * the compensation the host already earned needs no adjudication.
   */
  requiresHumanReview: boolean;
};

/**
 * Suggests a starting point for a reviewer based on how the session ended.
 * These are policy DEFAULTS. Nothing in this codebase executes them automatically.
 */
export function suggestedResolution(status: SessionStatus): DisputeSuggestion {
  switch (status) {
    case "cancelled_by_host":
      return {
        outcome: "guest_refund",
        rationale: "Host did not deliver the session; guest should be made whole.",
        requiresHumanReview: true,
      };
    case "cancelled_by_guest":
      return {
        outcome: "host_cancellation_compensation",
        rationale:
          "Guest cancelled; cancellation compensation applies per the client's policy window.",
        requiresHumanReview: true,
      };
    case "interrupted_by_guest":
      return {
        outcome: "host_compensation_review",
        rationale:
          "Session ended early by the guest. Guaranteed compensation is reviewed, not automatically withheld.",
        requiresHumanReview: true,
      };
    case "interrupted_by_host":
      return {
        outcome: "payout_review",
        rationale: "Host ended the session early; payout enters review pending context.",
        requiresHumanReview: true,
      };
    case "technical_failure":
      return {
        outcome: "credit_or_reschedule",
        rationale:
          "Neither party is at fault; offer credit, reschedule, or a proportional resolution.",
        requiresHumanReview: true,
      };
    case "completed":
      return {
        outcome: "release_guaranteed_compensation",
        rationale:
          "Session completed normally; release guaranteed compensation and open feedback and tipping.",
        requiresHumanReview: false,
      };
    default:
      return {
        outcome: "host_compensation_review",
        rationale: `Session status "${status}" has no automatic default; route to a reviewer.`,
        requiresHumanReview: true,
      };
  }
}
