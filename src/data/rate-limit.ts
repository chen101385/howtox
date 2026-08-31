/**
 * Rate limiting.
 *
 * Shaped like the repositories: one interface, an in-memory adapter that needs
 * no credentials, and a Postgres adapter selected by the presence of
 * `DATABASE_URL`. Callers never know which one they have.
 *
 * ALGORITHM: fixed window. `count` is incremented against a bucket keyed by
 * `(key, windowStart)`, and the increment and the read are one statement, so
 * concurrent requests cannot both observe "under the limit" and both proceed.
 *
 * A fixed window permits a burst at a boundary — up to 2× the limit across two
 * adjacent windows. A sliding window would not, at the cost of storing every
 * hit. For the thing this protects (a handful of public POST routes, chiefly one
 * that sends email) the boundary burst is not the risk; unbounded volume is.
 * Do not reach for a sliding window before there is a reason.
 *
 * KEYS ARE NOT SECRETS BUT THEY ARE STILL PII. `identityKey()` hashes anything
 * user-supplied, so this table never accumulates a list of email addresses that
 * tried to sign in.
 */

import { createHash } from "node:crypto";
import type { TenantId } from "@/domain/ids";

export type RateLimitRule = {
  /** Requests permitted per window. */
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Requests remaining in this window; 0 once blocked. */
  remaining: number;
  /** Seconds until the window resets. Sent as `Retry-After`. */
  retryAfterSeconds: number;
};

export interface RateLimiter {
  /**
   * Records one hit against `key` and reports whether it is permitted.
   *
   * Counts the blocked request too. Someone hammering a blocked endpoint keeps
   * their window open rather than getting a fresh allowance the moment it
   * would have expired.
   */
  hit(
    tenantId: TenantId,
    key: string,
    rule: RateLimitRule,
    now?: Date
  ): Promise<RateLimitResult>;

  /** Drops expired buckets. See the note on pruning in the Postgres adapter. */
  prune(olderThan: Date): Promise<number>;
}

/**
 * Builds a limiter key from a scope and a user-supplied value.
 *
 * The value is hashed because it is usually an email address or an IP, and a
 * plaintext table of either is a liability that serves no purpose — nothing
 * needs to read these keys back, only to match them.
 *
 * Truncated to 32 hex characters: 128 bits, far past any collision concern for
 * a counter table, and it keeps the index narrow.
 */
export function identityKey(scope: string, value: string): string {
  const digest = createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
  return `${scope}:${digest.slice(0, 32)}`;
}

/** Start of the fixed window containing `now`, as a whole number of seconds. */
export function windowStartFor(now: Date, windowSeconds: number): Date {
  const seconds = Math.floor(now.getTime() / 1000);
  return new Date((seconds - (seconds % windowSeconds)) * 1000);
}

function resultFor(
  count: number,
  rule: RateLimitRule,
  windowStart: Date,
  now: Date
): RateLimitResult {
  const resetAt = windowStart.getTime() + rule.windowSeconds * 1000;
  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
}

/* ------------------------------ In memory ------------------------------- */

/**
 * Per-process limiter. The default, because it needs nothing.
 *
 * LIMITATION, and it is a real one: on a serverless platform each instance has
 * its own map, so the effective limit is roughly `limit × instances`. That is
 * still a bound, and a far better one than none — but a deployment that cares
 * about the exact number needs `DATABASE_URL` set so the Postgres adapter is
 * used instead.
 */
export function createMemoryRateLimiter(): RateLimiter {
  const buckets = new Map<string, number>();

  return {
    async hit(tenantId, key, rule, now = new Date()) {
      const windowStart = windowStartFor(now, rule.windowSeconds);
      const bucketKey = `${tenantId}|${key}|${windowStart.getTime()}`;

      const count = (buckets.get(bucketKey) ?? 0) + 1;
      buckets.set(bucketKey, count);

      // Unbounded growth would be a slow memory leak on a long-lived process,
      // and expired buckets are worthless. Cheap because the key carries its
      // own window start.
      if (buckets.size > 10_000) {
        const cutoff = now.getTime() - rule.windowSeconds * 1000;
        for (const existing of buckets.keys()) {
          const startedAt = Number(existing.slice(existing.lastIndexOf("|") + 1));
          if (startedAt < cutoff) buckets.delete(existing);
        }
      }

      return resultFor(count, rule, windowStart, now);
    },

    async prune(olderThan) {
      let removed = 0;
      for (const key of buckets.keys()) {
        const startedAt = Number(key.slice(key.lastIndexOf("|") + 1));
        if (startedAt < olderThan.getTime()) {
          buckets.delete(key);
          removed += 1;
        }
      }
      return removed;
    },
  };
}

export { resultFor as __resultFor };
