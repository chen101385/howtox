import { describe, expect, it } from "vitest";
import {
  createSessionDeadline,
  SESSION_DURATION_SECONDS,
  verifySessionDeadline,
} from "./session-lifetime";

const SECRET = "test-only-secret-that-is-at-least-32-characters";

describe("three-hour session lifetime", () => {
  it("sets a signed deadline exactly 10,800 seconds ahead", async () => {
    const now = 1_000_000;
    const deadline = await createSessionDeadline(SECRET, now);
    expect(deadline.expiresAt).toBe(now + 10_800_000);
    expect(SESSION_DURATION_SECONDS).toBe(10_800);
    await expect(
      verifySessionDeadline(deadline.value, SECRET, deadline.expiresAt - 1)
    ).resolves.toBe(true);
  });

  it("rejects expired or modified deadlines", async () => {
    const deadline = await createSessionDeadline(SECRET, 1_000_000);
    await expect(
      verifySessionDeadline(deadline.value, SECRET, deadline.expiresAt)
    ).resolves.toBe(false);
    await expect(
      verifySessionDeadline(`${deadline.value}changed`, SECRET, 1_000_001)
    ).resolves.toBe(false);
  });
});
