/**
 * Post-session feedback.
 *
 * Feedback is split into four channels that must not be conflated:
 *   1. public experience quality  — visible on the listing
 *   2. private safety report      — routed to trust & safety, never public
 *   3. bonus recommendation       — an input to review, not a payout decision
 *   4. private notes              — free text for the reviewer only
 *
 * A single low score is an opinion, not a misconduct finding. Only the explicit
 * safety channel can create an incident.
 */

import type { BookingId, ExperienceId, HostId, ReviewId, TenantId, UserId } from "./ids";
import type { Money } from "./money";

export type StarRating = 1 | 2 | 3 | 4 | 5;

/** Structured questions asked after every session. */
export type StructuredFeedback = {
  /** "Did the host deliver the advertised experience?" */
  deliveredAsAdvertised: boolean;
  /** "Was the session meaningfully interactive?" */
  meaningfullyInteractive: boolean;
  /** "Would you book this host again?" */
  wouldBookAgain: boolean;
  /** "Was the experience memorable or worthwhile?" */
  memorable: boolean;
  /**
   * "Did either participant behave inappropriately?" — the ONLY field that may
   * open a safety review. Kept private.
   */
  inappropriateBehavior: boolean;
};

export type Review = {
  id: ReviewId;
  tenantId: TenantId;
  bookingId: BookingId;
  experienceId: ExperienceId;
  hostId: HostId;
  authorUserId: UserId;
  /** Public star rating and comment shown on the listing. */
  rating: StarRating;
  publicComment?: string;
  /** Structured answers; only the aggregate is ever shown publicly. */
  structured: StructuredFeedback;
  /** PRIVATE — reviewer-only free text. Never rendered publicly. */
  privateNotes?: string;
  tip?: Money;
  createdAt: string;
};

/** The public projection of a review. Private channels are dropped explicitly. */
export type PublicReview = {
  id: ReviewId;
  rating: StarRating;
  comment?: string;
  authorDisplayName: string;
  createdAt: string;
};

export function toPublicReview(review: Review, authorDisplayName: string): PublicReview {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.publicComment,
    authorDisplayName,
    createdAt: review.createdAt,
  };
}

/**
 * Whether feedback should open a safety review. Deliberately narrow: only the
 * explicit misconduct flag qualifies. A 1-star "wasn't for me" must never route
 * a host into a misconduct queue.
 */
export function requiresSafetyReview(feedback: StructuredFeedback): boolean {
  return feedback.inappropriateBehavior;
}

/**
 * Illustrative bonus signal. Returns a RECOMMENDATION only — the demo leaves the
 * resulting ledger entry `pending`, and no code path treats this as a final
 * compensation decision.
 */
export type BonusRecommendation = {
  recommended: boolean;
  /** 0–100, how strongly the structured answers support a bonus. */
  strength: number;
  rationale: string;
  /** Always true in this implementation. */
  pendingHumanReview: true;
};

export function recommendBonus(review: Review): BonusRecommendation {
  const positives = [
    review.structured.deliveredAsAdvertised,
    review.structured.meaningfullyInteractive,
    review.structured.wouldBookAgain,
    review.structured.memorable,
  ].filter(Boolean).length;

  const strength = Math.round((positives / 4) * 100);
  return {
    recommended: positives >= 3 && review.rating >= 4,
    strength,
    rationale:
      `${positives}/4 structured quality signals positive, ${review.rating}★. ` +
      `Bonus is discretionary and does not affect guaranteed compensation.`,
    pendingHumanReview: true,
  };
}

/** Aggregate shown on a host or experience. Rounded to one decimal. */
export function averageRating(reviews: readonly Review[]): number | undefined {
  if (reviews.length === 0) return undefined;
  const total = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}
