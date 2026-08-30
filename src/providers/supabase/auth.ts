/**
 * Supabase Auth adapter.
 *
 * The only file in the codebase permitted to import `@supabase/supabase-js`.
 * Everything upstream depends on the `AuthProvider` interface, so swapping this
 * for Clerk, WorkOS or Stytch later touches nothing but this directory.
 *
 * Two deliberate choices:
 *
 * 1. **The access token is verified server-side on every call.** `getUser()`
 *    round-trips to Supabase rather than decoding the JWT locally, because a
 *    locally-decoded token proves only that *something* signed it, and this
 *    value gates bookings and payouts. Cache it per request if it becomes hot;
 *    do not replace it with an unverified decode.
 *
 * 2. **Roles come from the application's own user record, not from the token.**
 *    Supabase `user_metadata` is client-writable in some configurations, so
 *    trusting a `role` claim there would let a guest promote themselves to
 *    moderator. Roles resolve from the `users` table via `externalAuthId`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider, ProviderInfo, Viewer } from "../types";
import { userId } from "@/domain/ids";

export type SupabaseAuthConfig = {
  url: string;
  anonKey: string;
  /** Resolves an application user from the external auth id. */
  resolveViewer: (externalAuthId: string, email: string) => Promise<Viewer | null>;
  /** Reads the caller's access token (e.g. from a cookie or Authorization header). */
  getAccessToken: () => Promise<string | undefined> | string | undefined;
};

export class SupabaseAuthProvider implements AuthProvider {
  readonly info: ProviderInfo = {
    name: "Supabase Auth",
    mode: "live",
  };

  private readonly client: SupabaseClient;

  constructor(private readonly config: SupabaseAuthConfig) {
    this.client = createClient(config.url, config.anonKey, {
      auth: {
        // Server-side: never persist or refresh a session on this instance,
        // otherwise concurrent requests would share one user's tokens.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  async getViewer(): Promise<Viewer | null> {
    const token = await this.config.getAccessToken();
    if (!token) return null;

    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) return null;

    // Roles are resolved from our own records — never read from token metadata.
    return this.config.resolveViewer(data.user.id, data.user.email ?? "");
  }
}

/**
 * Builds a Viewer from an application user row.
 *
 * Public/pseudonymous fields only: a Viewer is passed around the app and must not
 * become a carrier for legal name, phone or payout identity.
 */
export function viewerFromUserRow(row: {
  id: string;
  displayName: string;
  handle: string;
  roles?: Viewer["roles"];
}): Viewer {
  return {
    userId: userId(row.id),
    displayName: row.displayName,
    handle: row.handle,
    roles: row.roles ?? ["guest"],
  };
}
