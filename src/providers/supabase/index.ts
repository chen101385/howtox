/**
 * Supabase auth wiring.
 *
 * Composes the pieces in this directory into an `AuthProvider`:
 *
 *   session.ts       cookie transport (delegated to @supabase/ssr)
 *   auth.ts          the adapter — verifies the session, resolves the viewer
 *   provisioning.ts  first-login account creation
 *
 * Sign-in surfaces live at `/sign-in`, `/auth/callback` and `/api/auth/*`, and
 * all of them 404 unless the active client selects this provider.
 */

import { and, eq } from "drizzle-orm";
import { SupabaseAuthProvider, viewerFromUserRow } from "./auth";
import { readOnlyClient, supabaseCredentials } from "./session";
import type { AuthProvider, Viewer } from "../types";
import { getDatabase } from "@/data/postgres/client";
import { users } from "@/data/postgres/schema";
import { CURRENT_TENANT } from "@/data";
import { client as activeClient } from "@/config/active";

export const SIGN_IN_PATH = "/sign-in";
export const AUTH_CALLBACK_PATH = "/auth/callback";

export class SupabaseConfigError extends Error {
  constructor(missing: string[]) {
    const list =
      missing.length === 1
        ? missing[0]
        : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;

    super(
      `Supabase auth is selected but ${list} ${missing.length === 1 ? "is" : "are"} ` +
        `not set. Set them (see .env.example), or unset AUTH_PROVIDER to fall back ` +
        `to the credential-free demo adapter.`
    );
    this.name = "SupabaseConfigError";
  }
}

/** True when the active client has selected Supabase for authentication. */
export function supabaseAuthEnabled(authProvider: string | undefined): boolean {
  return authProvider === "supabase";
}

/**
 * Resolves an application user from a Supabase auth id.
 *
 * Roles come from our own record rather than from token metadata, which the
 * signed-in user can write — trusting it would let a guest hand itself a
 * moderator role.
 */
async function resolveViewerFromDatabase(
  externalAuthId: string,
  email: string
): Promise<Viewer | null> {
  // Read the variable here rather than closing over it, so a value supplied
  // after module load is still picked up.
  const db = getDatabase(process.env.DATABASE_URL ?? "");

  const [row] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      handle: users.handle,
      roles: users.roles,
    })
    .from(users)
    .where(
      and(eq(users.tenantId, CURRENT_TENANT), eq(users.externalAuthId, externalAuthId))
    )
    .limit(1);

  if (!row) {
    // Provisioning happens in the auth callback, so reaching here means someone
    // holds a valid session for an identity with no account — a token issued
    // before provisioning existed, or a row deleted underneath them. Treating
    // them as signed out is the safe reading.
    console.warn(
      `[auth] No application user for Supabase id ${externalAuthId}. ` +
        `Sign out and sign in again to provision one.`
    );
    return null;
  }

  return viewerFromUserRow(row);
}

/**
 * Header-only identity context. Email is intentionally not added to Viewer,
 * which is passed broadly and must remain a public/pseudonymous type.
 */
export async function getSupabaseViewerContext(): Promise<{
  viewer: Viewer;
  email: string;
} | null> {
  const { data, error } = await readOnlyClient().auth.getUser();
  if (error || !data.user?.email) return null;

  const viewer = await resolveViewerFromDatabase(data.user.id, data.user.email);
  return viewer ? { viewer, email: data.user.email } : null;
}

/**
 * Reads a bearer token from the `Authorization` header, for API and
 * server-to-server callers. Browser visitors authenticate by cookie and never
 * reach this.
 */
async function bearerTokenFromRequest(): Promise<string | undefined> {
  // Imported lazily: `next/headers` throws outside a request scope, and this
  // module is also loaded by scripts and tests.
  const { headers } = await import("next/headers");
  const authorization = headers().get("authorization");
  if (!authorization) return undefined;

  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
}

export function createSupabaseAuthProvider(): AuthProvider {
  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    // Roles and account records live in our own database, so Supabase auth
    // paired with the in-memory adapter could never authenticate anyone — every
    // sign-in would land on the "no application user" path and read as signed
    // out. Failing here beats a deployment that looks configured and silently
    // rejects everybody.
    !process.env.DATABASE_URL && "DATABASE_URL",
    activeClient.config.integrations.auth?.collectFamilyProfile &&
      !process.env.AUTH_PROFILE_COOKIE_SECRET &&
      "AUTH_PROFILE_COOKIE_SECRET",
  ].filter((v): v is string => Boolean(v));

  if (missing.length > 0) throw new SupabaseConfigError(missing);

  return new SupabaseAuthProvider({
    credentials: supabaseCredentials(),
    resolveViewer: resolveViewerFromDatabase,
    bearerToken: bearerTokenFromRequest,
    signInPath: SIGN_IN_PATH,
  });
}

export { SupabaseAuthProvider, viewerFromUserRow };
export { mutableClient, readOnlyClient, supabaseCredentials } from "./session";
export { ensureUser } from "./provisioning";
export {
  clearPendingProfile,
  createPendingProfileNonce,
  readPendingProfile,
  storePendingProfile,
} from "./pending-profile";
