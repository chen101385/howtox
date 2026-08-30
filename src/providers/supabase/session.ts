/**
 * Supabase session transport.
 *
 * The browser holds its session in cookies that Supabase writes and rotates.
 * Those cookies are chunked and their encoding is an implementation detail of
 * `@supabase/ssr`, so this file delegates all of it to that library rather than
 * parsing anything by hand.
 *
 * Two clients, deliberately separated:
 *
 * - `readOnlyClient()` — for render paths. Server Components cannot set cookies,
 *   so its `setAll` is a no-op. A refreshed token is used for the current
 *   request and then discarded; middleware is what persists the rotation.
 * - `mutableClient()` — for Route Handlers, which *can* set cookies. Sign-in,
 *   the auth callback and sign-out all need this one, because each of them
 *   changes the session.
 *
 * Getting this backwards is the classic Supabase-on-Next bug: sign-in appears to
 * succeed, no cookie is written, and the user bounces straight back to the
 * sign-in page.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export type SupabaseCredentials = { url: string; anonKey: string };

/** Reads credentials, or explains precisely which one is missing. */
export function supabaseCredentials(): SupabaseCredentials {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter((v): v is string => Boolean(v));

  if (missing.length > 0) {
    throw new Error(
      `Supabase auth is selected but ${missing.join(" and ")} ${
        missing.length === 1 ? "is" : "are"
      } not set. See .env.example.`
    );
  }

  return { url: url!, anonKey: anonKey! };
}

type CookieRecord = { name: string; value: string; options?: CookieOptions };

function client(
  credentials: SupabaseCredentials,
  setAll: (records: CookieRecord[]) => void
): SupabaseClient {
  return createServerClient(credentials.url, credentials.anonKey, {
    cookies: {
      getAll: () => cookies().getAll(),
      setAll,
    },
  });
}

/**
 * For Server Components. Session cookies are read but never written — Next
 * forbids mutating cookies during render, and swallowing that error here is
 * correct rather than lossy: middleware writes the rotated token.
 */
export function readOnlyClient(
  credentials: SupabaseCredentials = supabaseCredentials()
): SupabaseClient {
  return client(credentials, () => {
    /* Render paths cannot set cookies; middleware persists the rotation. */
  });
}

/** For Route Handlers, which may write cookies. */
export function mutableClient(
  credentials: SupabaseCredentials = supabaseCredentials()
): SupabaseClient {
  const store = cookies();
  return client(credentials, (records) => {
    for (const { name, value, options } of records) {
      store.set(name, value, options);
    }
  });
}
