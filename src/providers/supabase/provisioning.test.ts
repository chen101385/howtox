import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDatabase, type TestDatabase } from "@/data/postgres/test-db";
import { users } from "@/data/postgres/schema";
import { tenantId } from "@/domain/ids";
import {
  displayNameFromEmail,
  ensureUser,
  handleStemFromEmail,
} from "./provisioning";

/**
 * Provisioning runs on every sign-in and is the only code path that creates an
 * account. Against real Postgres, because its correctness rests entirely on
 * database behavior: the unique index, `ON CONFLICT DO NOTHING`, and the
 * conditional UPDATE that adopts an existing row.
 */

const TENANT = tenantId("test-tenant");
const OTHER_TENANT = tenantId("other-tenant");

let harness: TestDatabase;
const db = () => harness.db;
const familyProfile = {
  firstName: "Morgan",
  lastName: "Lee",
  childFirstNames: ["Ari", "Zoe"],
  childAges: [8, 12],
  zipCode: "98101",
};

beforeAll(async () => {
  harness = await createTestDatabase();
});

afterAll(async () => {
  await harness.close();
});

const provision = (externalAuthId: string, email: string) =>
  ensureUser({ db: db(), tenantId: TENANT, externalAuthId, email });

describe("ensureUser", () => {
  it("creates an account on first sign-in", async () => {
    const user = await provision("sb_new_1", "rowan.hale@example.invalid");

    expect(user.id).toMatch(/^usr_/);
    expect(user.handle).toBe("rowan-hale");
    expect(user.displayName).toBe("Rowan hale");
  });

  it("grants only `guest` — no path here can hand out host, moderator or admin", async () => {
    const user = await provision("sb_new_2", "quiet@example.invalid");
    expect(user.roles).toEqual(["guest"]);
  });

  it("does not store a guessed legal name", async () => {
    await provision("sb_new_3", "imogen.bartlett@example.invalid");

    const [row] = await db()
      .select({
        legalFirstName: users.legalFirstName,
        legalLastName: users.legalLastName,
      })
      .from(users)
      .where(and(eq(users.tenantId, TENANT), eq(users.externalAuthId, "sb_new_3")));

    // "Imogen Bartlett" is sitting right there in the address, and inventing it
    // would put an unverified guess into a legal-identity field.
    expect(row.legalFirstName).toBe("");
    expect(row.legalLastName).toBe("");
  });

  it("writes collected family profile fields on first sign-in", async () => {
    await ensureUser({
      db: db(),
      tenantId: TENANT,
      externalAuthId: "sb_profile",
      email: "morgan@example.invalid",
      profile: familyProfile,
    });

    const [row] = await db()
      .select({
        legalFirstName: users.legalFirstName,
        legalLastName: users.legalLastName,
        childFirstNames: users.childFirstNames,
        childAges: users.childAges,
        zipCode: users.zipCode,
      })
      .from(users)
      .where(and(eq(users.tenantId, TENANT), eq(users.externalAuthId, "sb_profile")));

    expect(row).toEqual({
      legalFirstName: "Morgan",
      legalLastName: "Lee",
      childFirstNames: ["Ari", "Zoe"],
      childAges: [8, 12],
      zipCode: "98101",
    });
  });

  it("updates a returning user's collected profile without changing the account", async () => {
    const first = await provision("sb_profile_update", "update@example.invalid");
    const updated = await ensureUser({
      db: db(),
      tenantId: TENANT,
      externalAuthId: "sb_profile_update",
      email: "update@example.invalid",
      profile: { ...familyProfile, firstName: "Morgana", zipCode: "98101-1234" },
    });

    expect(updated.id).toBe(first.id);
    const [row] = await db()
      .select({
        legalFirstName: users.legalFirstName,
        zipCode: users.zipCode,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, TENANT),
          eq(users.externalAuthId, "sb_profile_update")
        )
      );
    expect(row).toEqual({ legalFirstName: "Morgana", zipCode: "98101-1234" });
  });

  it("is idempotent — a returning user gets the same account", async () => {
    const first = await provision("sb_repeat", "repeat@example.invalid");
    const second = await provision("sb_repeat", "repeat@example.invalid");

    expect(second.id).toBe(first.id);

    const rows = await db()
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, TENANT), eq(users.externalAuthId, "sb_repeat")));
    expect(rows).toHaveLength(1);
  });

  it("never creates two accounts for concurrent first sign-ins", async () => {
    // Two tabs finishing the magic link at the same moment. Without the unique
    // index this races into two accounts, and the user's bookings then split
    // across them depending on which row a later sign-in happens to find.
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        provision("sb_race", "race@example.invalid")
      )
    );

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof provision>>> =>
        r.status === "fulfilled"
    );
    expect(fulfilled.length).toBeGreaterThan(0);

    const distinctIds = new Set(fulfilled.map((r) => r.value.id));
    expect(distinctIds.size).toBe(1);

    const rows = await db()
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, TENANT), eq(users.externalAuthId, "sb_race")));
    expect(rows).toHaveLength(1);
  });

  it("gives colliding handles distinct suffixes", async () => {
    const a = await provision("sb_dup_a", "sam@one.invalid");
    const b = await provision("sb_dup_b", "sam@two.invalid");

    expect(a.handle).toBe("sam");
    expect(b.handle).toBe("sam-1");
  });

  it("adopts an existing unlinked account with the same verified address", async () => {
    // A seeded or previously-created account. Creating a second row instead
    // would orphan its bookings, reviews and earnings.
    await db()
      .insert(users)
      .values({
        id: "usr_preexisting",
        tenantId: TENANT,
        legalFirstName: "Dev",
        legalLastName: "Kulkarni",
        email: "dev@example.invalid",
        verificationStatus: "verified",
        displayName: "Dev K.",
        displayStyle: "first_name_last_initial",
        handle: "dev-k",
        roles: ["guest", "host"],
      });

    const adopted = await provision("sb_adopt", "dev@example.invalid");

    expect(adopted.id).toBe("usr_preexisting");
    // Existing grants survive adoption — linking a login must not demote a host.
    expect(adopted.roles).toEqual(["guest", "host"]);
  });

  it("refuses to hijack an account already linked to a different identity", async () => {
    await expect(
      provision("sb_intruder", "dev@example.invalid")
    ).rejects.toThrow(/already taken|Could not provision/);
  });

  it("scopes by tenant — the same address in another tenant is another account", async () => {
    const mine = await provision("sb_tenant_a", "shared@example.invalid");
    const theirs = await ensureUser({
      db: db(),
      tenantId: OTHER_TENANT,
      externalAuthId: "sb_tenant_b",
      email: "shared@example.invalid",
    });

    expect(theirs.id).not.toBe(mine.id);
  });
});

describe("name derivation", () => {
  it("does not publish the full email address", () => {
    // Publishing "someone@theiremployer.com" as a display name leaks both the
    // address and the employer to every other user on the platform.
    const name = displayNameFromEmail("j.okonkwo@some-employer.example");
    expect(name).toBe("J okonkwo");
    expect(name).not.toContain("@");
    expect(name).not.toContain("some-employer");
  });

  it("falls back rather than producing an empty or unusable identity", () => {
    expect(displayNameFromEmail("@example.invalid")).toBe("New member");
    expect(handleStemFromEmail("a@example.invalid")).toBe("member");
    expect(handleStemFromEmail("@@@@@example.invalid")).toBe("member");
  });

  it("produces URL-safe handles", () => {
    expect(handleStemFromEmail("Ada.Lovelace+tag@example.invalid")).toBe(
      "ada-lovelace-tag"
    );
    expect(handleStemFromEmail("A_VERY_LONG_NAME_THAT_KEEPS_GOING@e.invalid"))
      .toHaveLength(24);
  });
});
