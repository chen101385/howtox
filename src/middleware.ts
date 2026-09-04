/**
 * Session refresh.
 *
 * Supabase access tokens are short-lived. Server Components cannot write
 * cookies, so without this the refreshed token would be used for one render and
 * then thrown away — the user gets signed out mid-session for no visible reason.
 * Middleware runs before render and *can* write, so this is where rotation is
 * persisted.
 *
 * Two things this is NOT:
 *
 * - **Not authorization.** It refreshes a session and nothing else. It does not
 *   decide who may see a page; that belongs on the server, next to the data.
 * - **Not required for the demo adapter.** With `auth.provider = "demo"` there
 *   is no session to refresh, and this returns immediately.
 *
 * `getUser()` rather than `getSession()` on purpose: the former verifies with
 * the auth server, the latter returns whatever the cookie claims. The call looks
 * unused, and is not — it is what triggers the refresh.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_LIFETIME_COOKIE,
  sessionCookieSecret,
  verifySessionDeadline,
} from "@/providers/supabase/session-lifetime";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase configured — nothing to refresh. Deployments on the demo
  // adapter pass straight through.
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (records) => {
        for (const { name, value } of records) {
          request.cookies.set(name, value);
        }
        // Rebuilt from the mutated request so downstream handlers and the
        // browser observe the same cookie state.
        response = NextResponse.next({ request });
        for (const { name, value, options } of records) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (data.user) {
    let lifetimeValid = false;
    try {
      lifetimeValid = await verifySessionDeadline(
        request.cookies.get(SESSION_LIFETIME_COOKIE)?.value,
        sessionCookieSecret()
      );
    } catch {
      // A live session without the server-side signing secret cannot satisfy
      // the application's fixed lifetime guarantee.
    }

    if (!lifetimeValid) {
      await supabase.auth.signOut();
      response.cookies.set(SESSION_LIFETIME_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /**
     * Everything except static assets and image files. Refreshing a session
     * while serving a favicon is wasted work on a hot path.
     */
    "/((?!_next/static|_next/image|favicon.ico|clients/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
