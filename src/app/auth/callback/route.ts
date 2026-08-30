import { NextResponse } from "next/server";
import { CURRENT_TENANT } from "@/data";
import { getDatabase } from "@/data/postgres/client";
import { activeAuthProvider } from "@/providers";
import { SIGN_IN_PATH, ensureUser, mutableClient } from "@/providers/supabase";
import { safeRedirectPath } from "@/lib/redirect";

/**
 * Where the magic link lands.
 *
 * Handles both shapes Supabase can send, because which one arrives depends on
 * the project's email template:
 *
 *   ?code=…                     PKCE — the default for @supabase/ssr
 *   ?token_hash=…&type=…        the older OTP verification link
 *
 * Supporting both means the flow works whether or not the template has been
 * customized, and costs one extra branch.
 *
 * On success the application account is provisioned before redirecting, so the
 * very first authenticated render already has a user to resolve.
 */
export const dynamic = "force-dynamic";

function failure(request: Request, reason: string) {
  const url = new URL(SIGN_IN_PATH, request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  if (activeAuthProvider() !== "supabase") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));

  // Supabase reports its own failures (expired or already-used link) here.
  if (requestUrl.searchParams.get("error")) {
    return failure(request, "link_invalid");
  }

  const supabase = mutableClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth] code exchange failed:", error.message);
      return failure(request, "link_invalid");
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      // Narrowed by the SDK's own union; an unexpected value fails below rather
      // than being coerced into something that might verify.
      type: type as "email" | "magiclink" | "recovery" | "invite" | "email_change",
    });
    if (error) {
      console.error("[auth] OTP verification failed:", error.message);
      return failure(request, "link_invalid");
    }
  } else {
    return failure(request, "link_invalid");
  }

  // Re-read from the auth server rather than trusting what the exchange
  // returned locally.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) {
    return failure(request, "link_invalid");
  }

  try {
    await ensureUser({
      db: getDatabase(process.env.DATABASE_URL ?? ""),
      tenantId: CURRENT_TENANT,
      externalAuthId: data.user.id,
      email: data.user.email,
    });
  } catch (cause) {
    // The session cookie is already set at this point. Signing out again avoids
    // stranding someone in the state the adapter warns about: authenticated to
    // Supabase, but with no account for anything to resolve.
    console.error("[auth] provisioning failed:", cause);
    await supabase.auth.signOut();
    return failure(request, "provisioning_failed");
  }

  return NextResponse.redirect(new URL(next, request.url));
}
