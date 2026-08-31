import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "./postgres/test-db";
import { createPostgresRateLimiter } from "./postgres/rate-limit";
import {
  createMemoryRateLimiter,
  identityKey,
  windowStartFor,
  type RateLimiter,
} from "./rate-limit";
import { tenantId } from "@/domain/ids";

/**
 * Both adapters are held to the same contract, in the same tests. The Postgres
 * one runs against real Postgres via PGlite — the atomicity this depends on is a
 * property of `ON CONFLICT DO UPDATE ... RETURNING`, so testing it against a
 * fake would be testing nothing.
 */

const TENANT = tenantId("rl-tenant");
const RULE = { limit: 3, windowSeconds: 60 };

let harness: TestDatabase;
beforeAll(async () => {
  harness = await createTestDatabase();
});
afterAll(async () => {
  await harness.close();
});

const adapters: [string, () => RateLimiter][] = [
  ["memory", () => createMemoryRateLimiter()],
  ["postgres", () => createPostgresRateLimiter(harness.db)],
];

describe.each(adapters)("RateLimiter (%s)", (name, make) => {
  // Distinct keys per adapter so the shared PGlite instance stays isolated.
  const key = (suffix: string) => `${name}:${suffix}`;

  it("allows up to the limit and denies past it", async () => {
    const limiter = make();
    const results = [];
    for (let i = 0; i < 5; i += 1) {
      results.push(await limiter.hit(TENANT, key("basic"), RULE));
    }

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0, 0]);
  });

  it("counts blocked requests too", async () => {
    // Otherwise hammering a blocked endpoint costs nothing and the window
    // effectively resets the moment it would have expired.
    const limiter = make();
    const now = new Date("2026-01-01T12:00:30.000Z");

    for (let i = 0; i < 10; i += 1) {
      await limiter.hit(TENANT, key("persist"), RULE, now);
    }

    // Still inside the same window: the 11th is denied, and the wait is the
    // remainder of that window rather than a fresh allowance.
    const result = await limiter.hit(TENANT, key("persist"), RULE, now);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(30);
  });

  it("resets in the next window", async () => {
    const limiter = make();
    const first = new Date("2026-01-01T12:00:00.000Z");
    const next = new Date("2026-01-01T12:01:00.000Z");

    for (let i = 0; i < 4; i += 1) {
      await limiter.hit(TENANT, key("reset"), RULE, first);
    }
    expect((await limiter.hit(TENANT, key("reset"), RULE, first)).allowed).toBe(false);
    expect((await limiter.hit(TENANT, key("reset"), RULE, next)).allowed).toBe(true);
  });

  it("keys are independent", async () => {
    const limiter = make();
    for (let i = 0; i < 4; i += 1) {
      await limiter.hit(TENANT, key("noisy"), RULE);
    }

    expect((await limiter.hit(TENANT, key("noisy"), RULE)).allowed).toBe(false);
    expect((await limiter.hit(TENANT, key("quiet"), RULE)).allowed).toBe(true);
  });

  it("scopes by tenant", async () => {
    const limiter = make();
    const other = tenantId("rl-other");

    for (let i = 0; i < 4; i += 1) {
      await limiter.hit(TENANT, key("shared"), RULE);
    }

    expect((await limiter.hit(TENANT, key("shared"), RULE)).allowed).toBe(false);
    expect((await limiter.hit(other, key("shared"), RULE)).allowed).toBe(true);
  });

  it("does not let concurrent requests slip past the limit", async () => {
    // The failure this catches: increment, then read. Two callers both see
    // "under the limit" and both proceed.
    const limiter = make();
    const attempts = await Promise.all(
      Array.from({ length: 20 }, () => limiter.hit(TENANT, key("race"), RULE))
    );

    expect(attempts.filter((r) => r.allowed)).toHaveLength(RULE.limit);
  });

  it("prunes expired windows", async () => {
    const limiter = make();
    const old = new Date("2026-01-01T00:00:00.000Z");
    await limiter.hit(TENANT, key("stale"), RULE, old);

    const removed = await limiter.prune(new Date("2026-01-02T00:00:00.000Z"));
    expect(removed).toBeGreaterThan(0);

    // Pruning is housekeeping, not an allowance reset for a live window.
    const result = await limiter.hit(TENANT, key("stale"), RULE, old);
    expect(result.allowed).toBe(true);
  });
});

describe("identityKey", () => {
  it("does not store the value in plaintext", async () => {
    // A rate limit table should never become a list of email addresses that
    // tried to sign in.
    const key = identityKey("sign-in-email", "someone@example.invalid");
    expect(key).not.toContain("someone");
    expect(key).not.toContain("example.invalid");
    expect(key).toMatch(/^sign-in-email:[0-9a-f]{32}$/);
  });

  it("is stable and case/whitespace insensitive", () => {
    expect(identityKey("s", "Someone@Example.com  ")).toBe(
      identityKey("s", "someone@example.com")
    );
  });

  it("separates scopes so one value cannot consume another limit", () => {
    expect(identityKey("a", "x")).not.toBe(identityKey("b", "x"));
  });
});

describe("windowStartFor", () => {
  it("floors to the window boundary", () => {
    const start = windowStartFor(new Date("2026-01-01T12:34:56.789Z"), 60);
    expect(start.toISOString()).toBe("2026-01-01T12:34:00.000Z");
  });

  it("puts everything in one window for a long window", () => {
    const a = windowStartFor(new Date("2026-01-01T12:00:00Z"), 3600);
    const b = windowStartFor(new Date("2026-01-01T12:59:59Z"), 3600);
    expect(a.getTime()).toBe(b.getTime());
  });
});
