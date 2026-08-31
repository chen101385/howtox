/**
 * Postgres rate limiter.
 *
 * The reason this exists rather than only the in-memory one: on a serverless
 * platform each instance keeps its own counters, so an in-memory limit of 5 is
 * really 5 × however many instances are warm. Shared counters make the number
 * mean what it says.
 *
 * The whole check is ONE statement. An increment-then-read would let two
 * concurrent requests both read "4 of 5" and both proceed; `ON CONFLICT DO
 * UPDATE ... RETURNING` cannot, because the row is locked between the update and
 * the return.
 */

import { and, lt, sql } from "drizzle-orm";
import type { PostgresDatabase } from "./client";
import { rateLimitCounters } from "./schema";
import {
  windowStartFor,
  __resultFor as resultFor,
  type RateLimitResult,
  type RateLimitRule,
  type RateLimiter,
} from "../rate-limit";
import type { TenantId } from "@/domain/ids";

export function createPostgresRateLimiter(db: PostgresDatabase): RateLimiter {
  return {
    async hit(
      tenantId: TenantId,
      key: string,
      rule: RateLimitRule,
      now = new Date()
    ): Promise<RateLimitResult> {
      const windowStart = windowStartFor(now, rule.windowSeconds);

      const [row] = await db
        .insert(rateLimitCounters)
        .values({ tenantId, key, windowStart, count: 1 })
        .onConflictDoUpdate({
          target: [
            rateLimitCounters.tenantId,
            rateLimitCounters.key,
            rateLimitCounters.windowStart,
          ],
          set: { count: sql`${rateLimitCounters.count} + 1` },
        })
        .returning({ count: rateLimitCounters.count });

      return resultFor(row.count, rule, windowStart, now);
    },

    async prune(olderThan: Date): Promise<number> {
      const removed = await db
        .delete(rateLimitCounters)
        .where(and(lt(rateLimitCounters.windowStart, olderThan)))
        .returning({ key: rateLimitCounters.key });
      return removed.length;
    },
  };
}
