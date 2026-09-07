import { NextResponse } from "next/server";
import { client } from "@/config/active";
import { CURRENT_TENANT } from "@/data";
import { getDatabase } from "@/data/postgres/client";
import { activeAuthProvider } from "@/providers";
import {
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  clearPendingProfile,
  ensureUser,
  mutableClient,
  readPendingProfile,
  recordSuccessfulLogin,
  startSessionLifetime,
} from "@/providers/supabase";
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

type AuthFlow = "log-in" | "sign-up";

function failure(request: Request, flow: AuthFlow, reason: string) {
  const url = new URL(flow === "sign-up" ? SIGN_UP_PATH : SIGN_IN_PATH, request.url);
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
  const flow = requestUrl.searchParams.get("flow");
  const profileNonce = requestUrl.searchParams.get("profile");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  if (flow !== "log-in" && flow !== "sign-up") {
    return failure(request, "log-in", "link_invalid");
  }

  // Supabase reports its own failures (expired or already-used link) here.
  if (requestUrl.searchParams.get("error")) {
    return failure(request, flow, "link_invalid");
  }

  const supabase = mutableClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth] code exchange failed:", error.message);
      return failure(request, flow, "link_invalid");
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
      return failure(request, flow, "link_invalid");
    }
  } else {
    return failure(request, flow, "link_invalid");
  }

  // Re-read from the auth server rather than trusting what the exchange
  // returned locally.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) {
    return failure(request, flow, "link_invalid");
  }

  const db = getDatabase(process.env.DATABASE_URL ?? "");
  const loginAt = new Date();

  if (flow === "log-in") {
    const existing = await recordSuccessfulLogin({
      db,
      tenantId: CURRENT_TENANT,
      externalAuthId: data.user.id,
      at: loginAt,
    });
    if (!existing) {
      await supabase.auth.signOut();
      return failure(request, flow, "account_not_found");
    }
    await startSessionLifetime(loginAt.getTime());
    return NextResponse.redirect(new URL(next, request.url));
  }

  try {
    const profile = readPendingProfile(data.user.email, profileNonce);
    if (client.config.integrations.auth?.collectFamilyProfile && !profile) {
      throw new Error("The pending family profile is missing, expired, or invalid.");
    }

    await ensureUser({
      db,
      tenantId: CURRENT_TENANT,
      externalAuthId: data.user.id,
      email: data.user.email,
      profile,
      lastSuccessfulLogin: loginAt,
    });
    if (profile) clearPendingProfile();
    await startSessionLifetime(loginAt.getTime());
  } catch (cause) {
    // The session cookie is already set at this point. Signing out again avoids
    // stranding someone in the state the adapter warns about: authenticated to
    // Supabase, but with no account for anything to resolve.
    console.error("[auth] provisioning failed:", cause);
    await supabase.auth.signOut();
    return failure(request, flow, "provisioning_failed");
  }

  return NextResponse.redirect(new URL(next, request.url));
}
