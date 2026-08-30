import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { SignInForm } from "@/components/auth/SignInForm";
import { client } from "@/config/active";
import { activeAuthProvider, getProviders } from "@/providers";
import { safeRedirectPath } from "@/lib/redirect";

/**
 * Sign-in.
 *
 * 404s unless the active client selects a real auth provider — a deployment on
 * the demo adapter has seeded personas and nothing to sign in to, and offering a
 * form that cannot work is worse than not offering one.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Sign in — ${client.config.site.brand.name}`,
  description: "Sign in with an emailed link.",
};

/** Reasons the callback can bounce someone back here, in plain language. */
const ERRORS: Record<string, string> = {
  link_invalid:
    "That sign-in link did not work. Links expire after about an hour and can only be used once — request a new one below.",
  provisioning_failed:
    "We verified your email but could not finish setting up your account. Try again, and if it keeps happening the address may already be linked to another account.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  if (activeAuthProvider() === "demo") notFound();

  const next = safeRedirectPath(searchParams.next);

  // Already signed in — send them where they were going rather than showing a
  // form that would do nothing.
  const viewer = await getProviders().auth.getViewer();
  if (viewer) redirect(next);

  const error = searchParams.error ? ERRORS[searchParams.error] : undefined;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-heading text-3xl font-bold text-fg">Sign in</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {`Sign in to book, host, and pick up conversations on ${client.config.site.brand.name}.`}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-theme border border-border bg-surface p-4 text-sm leading-relaxed text-fg"
          >
            {error}
          </p>
        )}

        <div className="mt-8">
          <SignInForm next={next === "/" ? undefined : next} />
        </div>
      </div>
    </Container>
  );
}
