/**
 * Supabase Auth adapter.
 *
 * With `src/providers/supabase/session.ts`, the only files permitted to import
 * `@supabase/supabase-js` or `@supabase/ssr`. Everything upstream depends on the
 * `AuthProvider` interface, so swapping this for Clerk, WorkOS or Stytch later
 * touches nothing but this directory.
 *
 * Two deliberate choices:
 *
 * 1. **The session is verified against the auth server on every call.**
 *    `getUser()` round-trips rather than decoding the JWT locally, because a
 *    locally-decoded token proves only that *something* signed it, and this
 *    value gates bookings and payouts. `getSession()` is NOT used: it returns
 *    whatever the cookie claims, unverified. Cache per request if it becomes
 *    hot; do not replace it with an unverified read.
 *
 * 2. **Roles come from the application's own user record, not from the token.**
 *    Supabase `user_metadata` is writable by the signed-in user, so trusting a
 *    `role` claim there would let a guest promote itself to moderator. Roles
 *    resolve from the `users` table via `externalAuthId`.
 */

import { createClient } from "@supabase/supabase-js";
import type { AuthProvider, ProviderInfo, Viewer } from "../types";
import { readOnlyClient, type SupabaseCredentials } from "./session";
import { userId } from "@/domain/ids";
import { isRole, type Role } from "@/domain/identity";

export type SupabaseAuthConfig = {
  credentials: SupabaseCredentials;
  /** Resolves an application user from the external auth id. */
  resolveViewer: (externalAuthId: string, email: string) => Promise<Viewer | null>;
  /**
   * Optional bearer token, for API and server-to-server callers that hold an
   * access token instead of the browser's session cookies.
   */
  bearerToken?: () => Promise<string | undefined>;
  signInPath: string;
};

export class SupabaseAuthProvider implements AuthProvider {
  readonly info: ProviderInfo = {
    name: "Supabase Auth",
    mode: "live",
  };

  constructor(private readonly config: SupabaseAuthConfig) {}

  async getViewer(): Promise<Viewer | null> {
    const identity = await this.authenticate();
    if (!identity) return null;

    // Roles are resolved from our own records — never read from token metadata.
    return this.config.resolveViewer(identity.id, identity.email);
  }

  signInPath(): string {
    return this.config.signInPath;
  }

  /**
   * Resolves the caller's verified Supabase identity, from an explicit bearer
   * token if one was supplied, otherwise from the session cookies.
   *
   * `protected` so tests can substitute a fixed identity and exercise everything
   * downstream — provisioning, role resolution, the privacy boundary — without
   * standing up a Supabase project. Overriding it in application code would
   * remove the token verification this class exists to perform.
   */
  protected async authenticate(): Promise<{ id: string; email: string } | null> {
    const token = await this.config.bearerToken?.();

    if (token) {
      // A one-off client: no session persistence, because concurrent requests
      // on a shared instance would otherwise clobber each other's tokens.
      const client = createClient(
        this.config.credentials.url,
        this.config.credentials.anonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? "" };
    }

    const { data, error } = await readOnlyClient(
      this.config.credentials
    ).auth.getUser();

    // A signed-out visitor produces an error here, which is ordinary rather than
    // exceptional — hence null, not a throw.
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "" };
  }
}

/**
 * Builds a Viewer from an application user row.
 *
 * Public/pseudonymous fields only: a Viewer is passed around the app and must not
 * become a carrier for legal name, phone or payout identity.
 *
 * Unrecognized role strings are dropped rather than trusted. `guest` is always
 * present, so a row with an empty or entirely unrecognized roles array still
 * yields a usable signed-in viewer rather than one who can do nothing.
 */
export function viewerFromUserRow(row: {
  id: string;
  displayName: string;
  handle: string;
  roles?: readonly string[] | null;
}): Viewer {
  const granted = (row.roles ?? []).filter(isRole);
  const roles: Role[] = granted.includes("guest") ? granted : ["guest", ...granted];

  return {
    userId: userId(row.id),
    displayName: row.displayName,
    handle: row.handle,
    roles,
  };
}
