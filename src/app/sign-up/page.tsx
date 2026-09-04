import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { SignInForm } from "@/components/auth/SignInForm";
import { client } from "@/config/active";
import { activeAuthProvider, getProviders } from "@/providers";
import { safeRedirectPath } from "@/lib/redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Sign up — ${client.config.site.brand.name}`,
  description: "Create an account with an emailed sign-up link.",
};

const ERRORS: Record<string, string> = {
  link_invalid:
    "That sign-up link did not work. Links expire after about an hour and can only be used once — request a new one below.",
  provisioning_failed:
    "We verified your email but could not finish creating your account. Request a new sign-up link and try again.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  if (activeAuthProvider() === "demo") notFound();

  const next = safeRedirectPath(searchParams.next);
  const viewer = await getProviders().auth.getViewer();
  if (viewer) redirect(next);

  const error = searchParams.error ? ERRORS[searchParams.error] : undefined;
  const logInHref =
    next === "/" ? "/sign-in" : `/sign-in?next=${encodeURIComponent(next)}`;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-heading text-3xl font-bold text-fg">Sign up</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {`Create your ${client.config.site.brand.name} account. We’ll email a one-time link to finish signing you in.`}
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
          <SignInForm
            mode="sign-up"
            next={next === "/" ? undefined : next}
            collectFamilyProfile={
              client.config.integrations.auth?.collectFamilyProfile ?? false
            }
          />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <a
            href={logInHref}
            className="font-medium text-primary underline underline-offset-4"
          >
            Log in
          </a>
        </p>
      </div>
    </Container>
  );
}
