import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDatabase, type TestDatabase } from "@/data/postgres/test-db";
import { users } from "@/data/postgres/schema";
import { tenantId } from "@/domain/ids";
import { SupabaseAuthProvider, viewerFromUserRow } from "./auth";
import { ensureUser } from "./provisioning";
import type { Viewer } from "../types";

/**
 * The sign-in path end to end, against real Postgres.
 *
 * Supabase's own token verification is the one thing stubbed — it is a network
 * call to a service, and asserting that it works would be testing Supabase.
 * Everything downstream of "this identity is verified" is exercised for real:
 * provisioning, role resolution, and the boundary that keeps a self-granted
 * role out of the viewer.
 */

const TENANT = tenantId("integration-tenant");

let harness: TestDatabase;
beforeAll(async () => {
  harness = await createTestDatabase();
});
afterAll(async () => {
  await harness.close();
});

/** Resolves a viewer the way the real wiring does, against the test database. */
async function resolveViewer(externalAuthId: string): Promise<Viewer | null> {
  const [row] = await harness.db
    .select({
      id: users.id,
      displayName: users.displayName,
      handle: users.handle,
      roles: users.roles,
    })
    .from(users)
    .where(
      and(eq(users.tenantId, TENANT), eq(users.externalAuthId, externalAuthId))
    )
    .limit(1);
  return row ? viewerFromUserRow(row) : null;
}

/** A provider whose Supabase identity check is stubbed to a fixed answer. */
class StubbedAuthProvider extends SupabaseAuthProvider {
  constructor(private readonly identity: { id: string; email: string } | null) {
    super({
      credentials: { url: "https://stub.invalid", anonKey: "stub" },
      resolveViewer: (externalAuthId) => resolveViewer(externalAuthId),
      signInPath: "/sign-in",
    });
  }

  protected override async authenticate() {
    return this.identity;
  }
}

const providerFor = (identity: { id: string; email: string } | null) =>
  new StubbedAuthProvider(identity);

describe("sign-in, end to end", () => {
  it("a first-time visitor becomes a guest with an account", async () => {
    await ensureUser({
      db: harness.db,
      tenantId: TENANT,
      externalAuthId: "sb_first",
      email: "newcomer@example.invalid",
    });

    const viewer = await providerFor({
      id: "sb_first",
      email: "newcomer@example.invalid",
    }).getViewer();

    expect(viewer).not.toBeNull();
    expect(viewer!.roles).toEqual(["guest"]);
    expect(viewer!.handle).toBe("newcomer");
  });

  it("a granted role reaches the viewer", async () => {
    await ensureUser({
      db: harness.db,
      tenantId: TENANT,
      externalAuthId: "sb_mod",
      email: "rowan@example.invalid",
    });
    // Granted out of band, as a real moderator would be.
    await harness.db
      .update(users)
      .set({ roles: ["guest", "moderator"] })
      .where(and(eq(users.tenantId, TENANT), eq(users.externalAuthId, "sb_mod")));

    const viewer = await providerFor({
      id: "sb_mod",
      email: "rowan@example.invalid",
    }).getViewer();

    expect(viewer!.roles).toEqual(["guest", "moderator"]);
  });

  it("a self-granted role in token metadata cannot reach the viewer", async () => {
    // The threat: Supabase user_metadata is writable by the signed-in user, so
    // an attacker sets {"role":"admin"} on their own identity. Roles are read
    // from our table, so it changes nothing.
    await ensureUser({
      db: harness.db,
      tenantId: TENANT,
      externalAuthId: "sb_attacker",
      email: "attacker@example.invalid",
    });

    const viewer = await providerFor({
      id: "sb_attacker",
      email: "attacker@example.invalid",
      // Deliberately present, deliberately ignored — nothing reads it.
      ...{ user_metadata: { role: "admin", roles: ["admin"] } },
    } as { id: string; email: string }).getViewer();

    expect(viewer!.roles).toEqual(["guest"]);
  });

  it("a verified identity with no account is signed out, not assumed", async () => {
    const viewer = await providerFor({
      id: "sb_orphan",
      email: "orphan@example.invalid",
    }).getViewer();

    expect(viewer).toBeNull();
  });

  it("a signed-out visitor is null", async () => {
    expect(await providerFor(null).getViewer()).toBeNull();
  });

  it("reports where to sign in", () => {
    expect(providerFor(null).signInPath()).toBe("/sign-in");
  });

  it("never carries private identity into the viewer", async () => {
    await ensureUser({
      db: harness.db,
      tenantId: TENANT,
      externalAuthId: "sb_private",
      email: "confidential@example.invalid",
    });
    await harness.db
      .update(users)
      .set({
        legalLastName: "Bartlett",
        phone: "+1 555 0100",
        payoutAccountRef: "pm_secret",
      })
      .where(
        and(eq(users.tenantId, TENANT), eq(users.externalAuthId, "sb_private"))
      );

    const viewer = await providerFor({
      id: "sb_private",
      email: "confidential@example.invalid",
    }).getViewer();

    const serialized = JSON.stringify(viewer);
    expect(serialized).not.toContain("Bartlett");
    expect(serialized).not.toContain("555 0100");
    expect(serialized).not.toContain("pm_secret");
    expect(serialized).not.toContain("confidential@example.invalid");
  });
});
