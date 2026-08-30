/**
 * Supabase auth wiring.
 *
 * SCOPE — read before relying on this.
 *
 * What exists: the `AuthProvider` adapter (token verification + role resolution
 * from our own `users` table), and the selection wiring below.
 *
 * What does NOT exist: the login flow itself — sign-in UI, the OAuth callback
 * route, session refresh, and provisioning an application `users` row on first
 * login. Those need a real Supabase project to build against, and nothing here
 * fabricates them.
 *
 * Consequence: with `auth.provider = "supabase"` and no access token reaching
 * `getAccessToken`, `getViewer()` correctly returns null and the app behaves as
 * signed-out. It does not silently fall back to a demo persona.
 */

import { eq, and } from "drizzle-orm";
import { SupabaseAuthProvider, viewerFromUserRow } from "./auth";
import type { AuthProvider, Viewer } from "../types";
import { getDatabase } from "@/data/postgres/client";
import { users } from "@/data/postgres/schema";
import { CURRENT_TENANT } from "@/data";

export class SupabaseConfigError extends Error {
  constructor(missing: string[]) {
    super(
      `Supabase auth is selected but ${missing.join(" and ")} ${
        missing.length === 1 ? "is" : "are"
      } not set. ` +
        `Set them (see .env.example), or set integrations.auth.provider to "demo".`
    );
    this.name = "SupabaseConfigError";
  }
}

/**
 * Resolves an application user from a Supabase auth id.
 *
 * Roles come from our own record rather than from token metadata, which is
 * client-writable in some Supabase configurations — trusting it would let a
 * guest hand themselves a moderator role.
 */
async function resolveViewerFromDatabase(
  externalAuthId: string,
  email: string
): Promise<Viewer | null> {
  // Presence is guaranteed by the check in createSupabaseAuthProvider; read here
  // rather than closing over it so a value set later is still picked up.
  const db = getDatabase(process.env.DATABASE_URL ?? "");

  const [row] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      handle: users.handle,
    })
    .from(users)
    .where(
      and(eq(users.tenantId, CURRENT_TENANT), eq(users.externalAuthId, externalAuthId))
    )
    .limit(1);

  if (!row) {
    // A verified Supabase identity with no application user yet. Provisioning
    // that row is part of the unbuilt sign-up flow; until then the viewer is
    // legitimately unknown rather than assumed.
    console.warn(
      `[auth] No application user for Supabase id ${externalAuthId} (${email}). ` +
        `First-login provisioning is not implemented.`
    );
    return null;
  }

  return viewerFromUserRow(row);
}

export function createSupabaseAuthProvider(
  getAccessToken: () => Promise<string | undefined> | string | undefined
): AuthProvider {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    // Roles resolve from our own `users` table, so Supabase auth paired with the
    // in-memory adapter could never authenticate anyone — every sign-in would
    // land on the "no application user" path and read as signed out. Failing
    // here beats a deployment that looks configured and silently rejects
    // everybody.
    !process.env.DATABASE_URL && "DATABASE_URL",
  ].filter((v): v is string => Boolean(v));

  if (missing.length > 0) throw new SupabaseConfigError(missing);

  return new SupabaseAuthProvider({
    url: url!,
    anonKey: anonKey!,
    getAccessToken,
    resolveViewer: resolveViewerFromDatabase,
  });
}

export { SupabaseAuthProvider, viewerFromUserRow };
