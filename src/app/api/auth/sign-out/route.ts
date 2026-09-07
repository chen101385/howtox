import { NextResponse } from "next/server";
import { activeAuthProvider } from "@/providers";
import { clearSessionLifetime, mutableClient } from "@/providers/supabase";

/**
 * Sign-out.
 *
 * POST only. A GET sign-out can be triggered by any image tag or link on
 * another site, which is a nuisance rather than a breach, but a nuisance worth
 * not shipping.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (activeAuthProvider() !== "supabase") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const { error } = await mutableClient().auth.signOut();
  clearSessionLifetime();
  if (error) console.error("[auth] sign-out failed:", error.message);

  // Redirect regardless. The cookies are cleared either way, and leaving
  // someone on an error page after they asked to leave is the wrong answer.
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
