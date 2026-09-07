import { describe, expect, it } from "vitest";
import { openPendingProfile, sealPendingProfile } from "./pending-profile";

const SECRET = "test-only-secret-that-is-at-least-32-characters";
const pending = {
  email: "parent@example.invalid",
  nonce: "a".repeat(32),
  expiresAt: 10_000,
  profile: {
    firstName: "Morgan",
    lastName: "Lee",
    childFirstNames: ["Ari"],
    childAges: [8],
    zipCode: "98101",
  },
};

describe("pending profile cookie", () => {
  it("round-trips encrypted profile data", () => {
    const sealed = sealPendingProfile(pending, SECRET);
    expect(sealed).not.toContain("Morgan");
    expect(openPendingProfile(sealed, SECRET, 9_000)).toEqual(pending);
  });

  it("rejects tampering and expired profiles", () => {
    const sealed = sealPendingProfile(pending, SECRET);
    const middle = Math.floor(sealed.length / 2);
    const replacement = sealed[middle] === "a" ? "b" : "a";
    const tampered = `${sealed.slice(0, middle)}${replacement}${sealed.slice(middle + 1)}`;
    expect(openPendingProfile(tampered, SECRET, 9_000)).toBeUndefined();
    expect(openPendingProfile(sealed, SECRET, 10_001)).toBeUndefined();
  });
});
