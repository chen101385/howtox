/**
 * First-login account provisioning.
 *
 * A verified Supabase identity is not yet an account. This creates the
 * application `users` row that everything else keys off — bookings, reviews,
 * ledger entries and roles all reference `users.id`, not the Supabase id.
 *
 * Three properties this has to hold:
 *
 * 1. **Idempotent.** Runs on every sign-in, not only the first. A returning user
 *    must get their existing row, not a second one.
 * 2. **Race-safe.** Two tabs completing sign-in at once must not create two
 *    accounts. The unique index on `(tenant_id, external_auth_id)` is the
 *    arbiter — the database rejects the loser, and we re-read rather than
 *    checking-then-inserting, which has a window between the two steps.
 * 3. **Minimum privilege.** New accounts get `guest` only. Nothing in this path
 *    can grant `host`, `moderator` or `admin`; those are deliberate grants made
 *    out of band.
 */

import { and, eq, sql } from "drizzle-orm";
import type { PostgresDatabase } from "@/data/postgres/client";
import { users } from "@/data/postgres/schema";
import type { TenantId } from "@/domain/ids";
import {
  familyProfileSchema,
  type FamilyProfile,
} from "@/domain/sign-in-profile";

export type ProvisionedUser = {
  id: string;
  displayName: string;
  handle: string;
  roles: string[];
};

/** The public fields a Viewer is built from. Never selects private columns. */
const publicColumns = {
  id: users.id,
  displayName: users.displayName,
  handle: users.handle,
  roles: users.roles,
};

/**
 * Derives a first display name from an email local part.
 *
 * Deliberately not the full email: pseudonymity is the default, and publishing
 * `someone@theiremployer.com` as a display name would leak both their address
 * and their employer to every other user. People rename themselves later.
 */
export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").replace(/\d+$/, "").trim();
  if (cleaned.length === 0) return "New member";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** URL-safe handle stem. Uniqueness is settled separately, against the database. */
export function handleStemFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const stem = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return stem.length >= 3 ? stem : "member";
}

/**
 * Finds a free handle by appending a numeric suffix.
 *
 * The unique index still has the final say — this only avoids burning insert
 * attempts on the common case of a name collision.
 */
async function availableHandle(
  db: PostgresDatabase,
  tenantId: TenantId,
  stem: string
): Promise<string> {
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? stem : `${stem}-${suffix}`;
    const [taken] = await db
      .select({ handle: users.handle })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.handle, candidate)))
      .limit(1);
    if (!taken) return candidate;
  }
  // Fall through to something collision-resistant rather than failing sign-in.
  return `${stem}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function findByExternalId(
  db: PostgresDatabase,
  tenantId: TenantId,
  externalAuthId: string
): Promise<ProvisionedUser | undefined> {
  const [row] = await db
    .select(publicColumns)
    .from(users)
    .where(
      and(eq(users.tenantId, tenantId), eq(users.externalAuthId, externalAuthId))
    )
    .limit(1);
  return row;
}

/**
 * Returns the application user for a verified Supabase identity, creating it on
 * first sign-in.
 */
export async function ensureUser(args: {
  db: PostgresDatabase;
  tenantId: TenantId;
  externalAuthId: string;
  email: string;
  profile?: FamilyProfile;
  now?: Date;
}): Promise<ProvisionedUser> {
  const { db, tenantId, externalAuthId, email, profile } = args;
  // Re-validate at the persistence boundary too. Callers other than the HTTP
  // route cannot bypass pair alignment, age bounds, or canonical sorting.
  const normalizedProfile = profile
    ? familyProfileSchema.parse(profile)
    : undefined;

  const existing = await findByExternalId(db, tenantId, externalAuthId);
  if (existing) {
    if (!normalizedProfile) return existing;
    const [updated] = await db
      .update(users)
      .set({
        legalFirstName: normalizedProfile.firstName,
        legalLastName: normalizedProfile.lastName,
        childFirstNames: normalizedProfile.childFirstNames,
        childAges: normalizedProfile.childAges,
        zipCode: normalizedProfile.zipCode,
      })
      .where(
        and(eq(users.tenantId, tenantId), eq(users.externalAuthId, externalAuthId))
      )
      .returning(publicColumns);
    if (updated) return updated;
  }

  // An account may already exist for this address — a seeded user, or someone
  // who previously signed in another way. Adopt it rather than creating a
  // duplicate that would orphan their bookings and earnings.
  //
  // This is safe ONLY because Supabase verified the address: the email in a
  // verified identity is proof of control over that mailbox. Never link on an
  // unverified address, which would be an account-takeover path.
  const adopted = await db
    .update(users)
    .set({
      externalAuthId,
      ...(normalizedProfile
        ? {
            legalFirstName: normalizedProfile.firstName,
            legalLastName: normalizedProfile.lastName,
            childFirstNames: normalizedProfile.childFirstNames,
            childAges: normalizedProfile.childAges,
            zipCode: normalizedProfile.zipCode,
          }
        : {}),
    })
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.email, email),
        sql`${users.externalAuthId} is null`
      )
    )
    .returning(publicColumns);

  if (adopted[0]) return adopted[0];

  const handle = await availableHandle(db, tenantId, handleStemFromEmail(email));

  const inserted = await db
    .insert(users)
    .values({
      id: `usr_${crypto.randomUUID()}`,
      tenantId,
      // Clients with email-only sign-in do not collect legal names. Empty
      // strings remain the honest fallback rather than guesses from the email.
      legalFirstName: normalizedProfile?.firstName ?? "",
      legalLastName: normalizedProfile?.lastName ?? "",
      email,
      childFirstNames: normalizedProfile?.childFirstNames ?? [],
      childAges: normalizedProfile?.childAges ?? [],
      zipCode: normalizedProfile?.zipCode,
      verificationStatus: "unverified",
      displayName: displayNameFromEmail(email),
      displayStyle: "nickname",
      handle,
      roles: ["guest"],
      externalAuthId,
      createdAt: args.now ?? new Date(),
    })
    .onConflictDoNothing()
    .returning(publicColumns);

  if (inserted[0]) return inserted[0];

  // Lost a race, or hit the email/handle unique index. Re-read: the winner's row
  // is the correct answer for both.
  const settled = await findByExternalId(db, tenantId, externalAuthId);
  if (settled) return settled;

  throw new Error(
    `Could not provision an account for ${externalAuthId}. The insert conflicted ` +
      `but no row with that external id exists — most likely the email or handle ` +
      `is already taken by an account linked to a different identity.`
  );
}
