import { describe, expect, it } from "vitest";
import { tenantId, userId } from "./ids";
import {
  PRIVATE_ONLY_FIELDS,
  assertNoPrivateFields,
  deriveDisplayName,
  toPublicProfile,
  type UserPrivate,
} from "./identity";
import { SEED_HOSTS, SEED_USERS_PRIVATE } from "@/data/seed/hosts";
import { toPublicReview, type Review } from "./review";

/**
 * The privacy boundary is the highest-consequence invariant in this codebase:
 * a leak here is irreversible for a real person. These tests assert it directly
 * rather than trusting review.
 */

const fullUser: UserPrivate = {
  id: userId("u1"),
  tenantId: tenantId("t"),
  legalFirstName: "Imogen",
  legalLastName: "Bartlett",
  email: "imogen@example.invalid",
  phone: "+1 555 0100",
  payoutAccountRef: "pm_123",
  addressLine: "12 Somewhere Lane",
  governmentIdRef: "gov_456",
  verification: { identity: "verified" },
  display: { displayName: "Ripley", style: "nickname", handle: "ripley" },
  createdAt: "2024-01-22T00:00:00.000Z",
};

describe("toPublicProfile", () => {
  it("exposes only the pseudonymous display identity", () => {
    const profile = toPublicProfile(fullUser);
    expect(profile.displayName).toBe("Ripley");
    expect(profile.handle).toBe("ripley");
    expect(profile.identityVerified).toBe(true);
  });

  it("omits every private field", () => {
    const profile = toPublicProfile(fullUser);
    for (const field of PRIVATE_ONLY_FIELDS) {
      expect(profile, `leaked ${field}`).not.toHaveProperty(field);
    }
  });

  it("never carries the legal surname, even indirectly", () => {
    const serialized = JSON.stringify(toPublicProfile(fullUser));
    expect(serialized).not.toContain("Bartlett");
    expect(serialized).not.toContain("example.invalid");
    expect(serialized).not.toContain("pm_123");
    expect(serialized).not.toContain("gov_456");
    expect(serialized).not.toContain("Somewhere Lane");
  });

  it("reduces verification to a boolean rather than the underlying record", () => {
    const pending = toPublicProfile({
      ...fullUser,
      verification: { identity: "pending", provider: "acme-kyc" },
    });
    expect(pending.identityVerified).toBe(false);
    expect(JSON.stringify(pending)).not.toContain("acme-kyc");
  });
});

describe("assertNoPrivateFields", () => {
  it("throws when a private field is present", () => {
    expect(() => assertNoPrivateFields({ email: "x@y.z" })).toThrow(/leaked/);
  });

  it("passes for a clean public object", () => {
    expect(() => assertNoPrivateFields(toPublicProfile(fullUser))).not.toThrow();
  });
});

describe("deriveDisplayName", () => {
  it("supports first name only", () => {
    expect(deriveDisplayName(fullUser, "first_name")).toBe("Imogen");
  });

  it("supports first name plus last initial without the full surname", () => {
    const name = deriveDisplayName(fullUser, "first_name_last_initial");
    expect(name).toBe("Imogen B.");
    expect(name).not.toContain("Bartlett");
  });

  it("requires an explicit value for a nickname or stage name", () => {
    expect(() => deriveDisplayName(fullUser, "stage_name")).toThrow();
    expect(deriveDisplayName(fullUser, "stage_name", "The Lamplighter")).toBe(
      "The Lamplighter"
    );
  });
});

describe("seeded hosts respect pseudonymity", () => {
  it("publishes no legal surname for any seeded host", () => {
    const publicJson = JSON.stringify(SEED_HOSTS);
    for (const user of SEED_USERS_PRIVATE) {
      expect(publicJson, `surname ${user.legalLastName} leaked`).not.toContain(
        user.legalLastName
      );
      expect(publicJson, `email leaked`).not.toContain(user.email);
      if (user.phone) expect(publicJson).not.toContain(user.phone);
      if (user.payoutAccountRef)
        expect(publicJson).not.toContain(user.payoutAccountRef);
    }
  });

  it("gives every seeded host a public profile with no private fields", () => {
    for (const host of SEED_HOSTS) {
      expect(() => assertNoPrivateFields(host.public, host.id)).not.toThrow();
    }
  });

  it("publishes only an approximate region, never a precise location", () => {
    for (const host of SEED_HOSTS) {
      expect(host.approximateRegion ?? "").not.toMatch(/\d{1,5}\s+\w+\s+(St|Street|Ave|Road)/i);
    }
  });
});

describe("review serialization", () => {
  it("drops private notes from the public projection", () => {
    const review: Review = {
      id: "r1" as Review["id"],
      tenantId: tenantId("t"),
      bookingId: "b1" as Review["bookingId"],
      experienceId: "e1" as Review["experienceId"],
      hostId: "h1" as Review["hostId"],
      authorUserId: userId("u1"),
      rating: 4,
      publicComment: "Great hour.",
      privateNotes: "The host seemed unwell, mentioning privately.",
      structured: {
        deliveredAsAdvertised: true,
        meaningfullyInteractive: true,
        wouldBookAgain: true,
        memorable: true,
        inappropriateBehavior: false,
      },
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const serialized = JSON.stringify(toPublicReview(review, "Ada"));
    expect(serialized).toContain("Great hour.");
    expect(serialized).not.toContain("seemed unwell");
    expect(serialized).not.toContain("inappropriateBehavior");
  });
});
