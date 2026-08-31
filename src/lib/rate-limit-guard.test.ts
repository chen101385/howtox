import { describe, expect, it } from "vitest";
import {
  RATE_LIMITS,
  clientAddress,
  enforceRateLimits,
} from "./rate-limit-guard";

/**
 * The guard, exercised against the in-memory limiter (no DATABASE_URL in tests).
 *
 * Worth testing separately from the limiter itself: the limiter is correct in
 * isolation, and the interesting failures live in the wiring — a dimension that
 * is never recorded, or one that lets a caller dodge another.
 */

/** Unique per test so the process-wide limiter does not leak between them. */
let seq = 0;
const unique = () => `v${(seq += 1)}`;

describe("enforceRateLimits", () => {
  it("returns null while under the limit", async () => {
    const value = unique();
    const result = await enforceRateLimits([
      { scope: "test-a", value, rule: { limit: 2, windowSeconds: 60 } },
    ]);
    expect(result).toBeNull();
  });

  it("returns 429 with Retry-After once exceeded", async () => {
    const value = unique();
    const rule = { limit: 2, windowSeconds: 60 };
    const check = () => enforceRateLimits([{ scope: "test-b", value, rule }]);

    expect(await check()).toBeNull();
    expect(await check()).toBeNull();

    const denied = await check();
    expect(denied?.status).toBe(429);
    expect(denied?.headers.get("Retry-After")).toBeTruthy();

    const body = (await denied!.json()) as { error: string; retryAfterSeconds: number };
    expect(body.error).toMatch(/too many requests/i);
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("reports the longest wait when several limits are breached", async () => {
    // Telling someone to retry in 60s when another limit has 15 minutes left
    // just makes them try again and fail again.
    const value = unique();
    const short = { limit: 1, windowSeconds: 60 };
    const long = { limit: 1, windowSeconds: 3600 };

    await enforceRateLimits([
      { scope: "test-c-short", value, rule: short },
      { scope: "test-c-long", value, rule: long },
    ]);

    const denied = await enforceRateLimits([
      { scope: "test-c-short", value, rule: short },
      { scope: "test-c-long", value, rule: long },
    ]);

    const body = (await denied!.json()) as { retryAfterSeconds: number };
    expect(body.retryAfterSeconds).toBeGreaterThan(60);
  });

  it("records every dimension even after one denies", async () => {
    // The dodge this prevents: trip the cheap per-IP limit deliberately, and the
    // per-email limit is never incremented — so rotating IPs costs nothing.
    const ip = unique();
    const email = unique();
    const ipRule = { limit: 1, windowSeconds: 60 };
    const emailRule = { limit: 3, windowSeconds: 60 };

    for (let i = 0; i < 3; i += 1) {
      await enforceRateLimits([
        { scope: "test-d-ip", value: ip, rule: ipRule },
        { scope: "test-d-email", value: email, rule: emailRule },
      ]);
    }

    // The email dimension has now been consumed, provable from a fresh IP.
    const fromNewIp = await enforceRateLimits([
      { scope: "test-d-ip", value: unique(), rule: ipRule },
      { scope: "test-d-email", value: email, rule: emailRule },
    ]);

    expect(fromNewIp?.status).toBe(429);
  });

  it("keeps scopes independent", async () => {
    const value = unique();
    const rule = { limit: 1, windowSeconds: 60 };

    await enforceRateLimits([{ scope: "test-e-one", value, rule }]);
    // Same value, different scope — an unrelated limit.
    expect(await enforceRateLimits([{ scope: "test-e-two", value, rule }])).toBeNull();
  });
});

describe("clientAddress", () => {
  const withHeaders = (headers: Record<string, string>) =>
    new Request("https://example.test/api/thing", { method: "POST", headers });

  it("takes the left-most x-forwarded-for entry", () => {
    // Left-most is the original client; the rest are proxies that added
    // themselves on the way in.
    expect(
      clientAddress(withHeaders({ "x-forwarded-for": "203.0.113.9, 70.41.3.18" }))
    ).toBe("203.0.113.9");
  });

  it("trims whitespace", () => {
    expect(clientAddress(withHeaders({ "x-forwarded-for": "  203.0.113.9 " }))).toBe(
      "203.0.113.9"
    );
  });

  it("falls back to x-real-ip", () => {
    expect(clientAddress(withHeaders({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9"
    );
  });

  it("collapses to one bucket when no address is available", () => {
    // Every caller shares a bucket, which makes the limit global rather than
    // absent. That is the safe direction to fail.
    expect(clientAddress(withHeaders({}))).toBe("unknown");
  });
});

describe("RATE_LIMITS", () => {
  it("makes sign-in the strictest per-hour allowance", () => {
    // It is the only route that sends email on our domain's reputation.
    const perHour = (rule: { limit: number; windowSeconds: number }) =>
      (rule.limit / rule.windowSeconds) * 3600;

    expect(perHour(RATE_LIMITS.signInPerEmail)).toBeLessThan(
      perHour(RATE_LIMITS.booking)
    );
    expect(perHour(RATE_LIMITS.signInPerEmail)).toBeLessThan(
      perHour(RATE_LIMITS.report)
    );
  });

  it("keeps reporting the loosest write limit", () => {
    // A distressed person filing a report must never be told to come back
    // later. If a change makes another write route looser than reporting, that
    // change has its priorities backwards.
    const writes = [
      RATE_LIMITS.lead,
      RATE_LIMITS.booking,
      RATE_LIMITS.review,
      RATE_LIMITS.signInPerIp,
      RATE_LIMITS.signInPerEmail,
    ];
    const perHour = (rule: { limit: number; windowSeconds: number }) =>
      (rule.limit / rule.windowSeconds) * 3600;

    for (const rule of writes) {
      expect(perHour(RATE_LIMITS.report)).toBeGreaterThanOrEqual(perHour(rule));
    }
  });
});
