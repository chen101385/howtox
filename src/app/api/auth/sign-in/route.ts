import { NextResponse } from "next/server";
import { activeAuthProvider } from "@/providers";
import { AUTH_CALLBACK_PATH } from "@/providers/supabase";
import { client } from "@/config/active";
import { parseAuthRequest, type AuthRequest } from "@/domain/auth-flow";
import { safeRedirectPath } from "@/lib/redirect";
import {
  RATE_LIMITS,
  clientAddress,
  enforceRateLimits,
} from "@/lib/rate-limit-guard";

/**
 * Magic-link initiation for sign-up and returning-user log-in.
 *
 * No passwords: nothing here stores, hashes, resets or leaks one, and there is
 * no credential for an attacker to stuff. The tradeoff is a dependency on email
 * deliverability, which is the right trade for an early product.
 *
 * Adding Google or Apple later is additive — a second route calling
 * `signInWithOAuth` and landing on the same callback.
 *
 * The response is deliberately identical whether or not the address belongs to
 * an existing account. Differentiating would turn this endpoint into an account
 * enumeration oracle: "which of these 10,000 addresses has an account here?"
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (activeAuthProvider() !== "supabase") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  let parsed: AuthRequest;
  try {
    parsed = parseAuthRequest(
      await request.json(),
      client.config.integrations.auth?.collectFamilyProfile ?? false
    );
  } catch {
    return NextResponse.json(
      { error: "Check the form fields and try again." },
      { status: 400 }
    );
  }

  // The strictest limit in the app, because this route sends mail on our
  // domain's reputation. Two dimensions on purpose: per IP stops one machine
  // walking a list of addresses, per address stops one mailbox being flooded
  // from many machines. Both are recorded even when the first one denies.
  //
  // Rate limiting happens after parsing (which sends nothing) and before the
  // Supabase call (which sends an email).
  const limited = await enforceRateLimits([
    {
      scope: "sign-in-ip",
      value: clientAddress(request),
      rule: RATE_LIMITS.signInPerIp,
    },
    { scope: "sign-in-email", value: parsed.email, rule: RATE_LIMITS.signInPerEmail },
  ]);
  if (limited) return limited;

  // Route handlers may write cookies, which this needs: the PKCE code verifier
  // is stored now and read back in the callback.
  const {
    clearPendingProfile,
    createPendingProfileNonce,
    mutableClient,
    storePendingProfile,
  } = await import("@/providers/supabase");

  // Built from the request origin rather than a configured base URL so previews
  // and local dev work without extra configuration. Supabase only honors
  // redirect targets on its own allow-list, so a forged Host header cannot turn
  // this into an open redirect.
  const redirectTo = new URL(AUTH_CALLBACK_PATH, request.url);
  const next = safeRedirectPath(parsed.next);
  if (next !== "/") redirectTo.searchParams.set("next", next);
  redirectTo.searchParams.set("flow", parsed.mode);
  const profile = "profile" in parsed ? parsed.profile : undefined;
  const profileNonce = profile ? createPendingProfileNonce() : undefined;
  if (profileNonce) redirectTo.searchParams.set("profile", profileNonce);

  // Write the encrypted, short-lived profile before sending mail so a missing
  // server secret fails without sending a link that cannot finish sign-in.
  if (profile && profileNonce) {
    try {
      storePendingProfile({
        email: parsed.email,
        nonce: profileNonce,
        profile,
      });
    } catch (cause) {
      console.error("[auth] pending profile setup failed:", cause);
      return NextResponse.json(
        { error: "Could not prepare sign-in. Try again shortly." },
        { status: 500 }
      );
    }
  }

  const { error } = await mutableClient().auth.signInWithOtp({
    email: parsed.email,
    options: {
      emailRedirectTo: redirectTo.toString(),
      // Log in must not silently create a new Supabase identity. Sign up is the
      // only flow allowed to create both the identity and application account.
      shouldCreateUser: parsed.mode === "sign-up",
    },
  });

  if (error) {
    if (profile) clearPendingProfile();
    // Rate limiting is the expected failure and is worth saying plainly; the
    // rest stays generic so nothing about the account is revealed.
    const message =
      error.status === 429
        ? "Too many requests. Wait a minute and try again."
        : "Could not send the sign-in link. Try again shortly.";
    console.error("[auth] signInWithOtp failed:", error.message);
    return NextResponse.json({ error: message }, { status: error.status ?? 500 });
  }

  return NextResponse.json({ ok: true });
}
