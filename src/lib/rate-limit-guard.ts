/**
 * Route-level rate limiting.
 *
 * One helper in front of every public POST route, so the limits are declared in
 * one table instead of scattered through handlers.
 *
 * FAIL CLOSED. If the limiter itself errors, the request is denied. The
 * reasoning: the limiter only fails when the database is unreachable, and in
 * that state every route that matters is broken anyway — but an unmetered email
 * endpoint is a liability that outlives the outage, so it is the wrong thing to
 * leave open.
 *
 * WHAT THIS DOES NOT DO. It is not authentication, not authorization, and not
 * abuse prevention. A determined attacker rotates IPs. It bounds cost and
 * blast radius; that is the whole claim.
 */

import { NextResponse } from "next/server";
import { CURRENT_TENANT, getRateLimiter, identityKey, type RateLimitRule } from "@/data";

/**
 * The limits, in one place.
 *
 * Chosen so an ordinary person never meets one. If a real user hits a limit
 * here, the limit is wrong — not the user.
 */
export const RATE_LIMITS = {
  /**
   * Sends email on our domain's reputation, so this is the strictest. Two
   * dimensions: per IP stops one machine enumerating addresses, per address
   * stops one mailbox being flooded from many machines.
   */
  signInPerIp: { limit: 10, windowSeconds: 15 * 60 },
  signInPerEmail: { limit: 5, windowSeconds: 60 * 60 },

  /** Lead capture. Unauthenticated and writes a record, so worth bounding. */
  lead: { limit: 10, windowSeconds: 60 * 60 },

  /** Booking creation. Generous — a keen guest booking several sessions is fine. */
  booking: { limit: 30, windowSeconds: 60 * 60 },

  /** Review submission. One per booking is enforced elsewhere; this bounds abuse. */
  review: { limit: 30, windowSeconds: 60 * 60 },

  /**
   * Session policy acceptance and completion. Called on ordinary navigation, so
   * this is loose; it exists only to stop a loop hammering the database.
   */
  session: { limit: 120, windowSeconds: 60 * 60 },

  /**
   * Reporting. DELIBERATELY THE LOOSEST LIMIT ON A WRITE ROUTE.
   *
   * A distressed person filing a report during a session must never be told to
   * come back later. The only thing this guards against is an automated flood;
   * a human reporting repeatedly is a signal for moderation to look at, not
   * something to block at the edge.
   */
  report: { limit: 60, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Best-effort client address.
 *
 * `x-forwarded-for` is trivially spoofable by a direct caller, so this is only
 * meaningful behind a proxy that overwrites it — which Vercel, Cloudflare and
 * most managed platforms do. Run this behind something that does, or the
 * per-IP dimension is decorative.
 *
 * When no address is available every caller collapses into one bucket, which
 * makes the limit global rather than per-client. That is the safe direction to
 * fail.
 */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  // Left-most entry is the original client; the rest are proxies.
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

export type RateLimitCheck = {
  /** Distinguishes limits from one another, e.g. "sign-in-ip". */
  scope: string;
  /** The thing being limited: an address, an email, a user id. Hashed before storage. */
  value: string;
  rule: RateLimitRule;
};

/**
 * Applies every check and returns a 429 response if any is exceeded, or null to
 * proceed.
 *
 * All checks are recorded even after one fails, so a caller cannot dodge the
 * per-email limit by tripping the per-IP one first.
 */
export async function enforceRateLimits(
  checks: RateLimitCheck[]
): Promise<NextResponse | null> {
  const limiter = getRateLimiter();

  // 0 means nothing was breached. Otherwise the longest wait across the
  // breached checks — telling someone to retry in 60s when one limit has 15
  // minutes left just makes them try again and fail again.
  let retryAfterSeconds = 0;

  for (const check of checks) {
    try {
      const result = await limiter.hit(
        CURRENT_TENANT,
        identityKey(check.scope, check.value),
        check.rule
      );
      if (!result.allowed) {
        retryAfterSeconds = Math.max(retryAfterSeconds, result.retryAfterSeconds);
      }
    } catch (cause) {
      console.error(`[rate-limit] check "${check.scope}" failed:`, cause);
      return tooManyRequests(60);
    }
  }

  return retryAfterSeconds > 0 ? tooManyRequests(retryAfterSeconds) : null;
}

function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Wait a moment and try again.",
      retryAfterSeconds,
    },
    {
      status: 429,
      // Standard header; well-behaved clients and crawlers honor it.
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}
