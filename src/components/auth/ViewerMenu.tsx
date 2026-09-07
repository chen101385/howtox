import { activeAuthProvider } from "@/providers";
import { SIGN_IN_PATH } from "@/providers/supabase";

export function ViewerMenuContent({ email }: { email?: string }) {
  if (!email) {
    return (
      <a
        href={SIGN_IN_PATH}
        className="text-sm font-medium text-fg underline underline-offset-4"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted">Signed in as {email}</span>
      <form action="/api/auth/sign-out" method="post">
        <button
          type="submit"
          className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-fg"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

/**
 * Signed-in state in the header.
 *
 * Renders nothing at all on the demo adapter: seeded personas are not accounts,
 * and a "Sign out" button that signs no one out would be a lie in the nav bar.
 *
 * Sign-out is a form POST rather than a link so it cannot be triggered by a
 * third-party page embedding an image or link to it.
 */
export async function loadViewerMenu(): Promise<{
  menu: React.ReactNode;
  signedIn: boolean;
}> {
  if (activeAuthProvider() === "demo") {
    return { menu: null, signedIn: false };
  }

  const { getSupabaseViewerContext } = await import("@/providers/supabase");
  const context = await getSupabaseViewerContext();

  return {
    menu: <ViewerMenuContent email={context?.email} />,
    signedIn: Boolean(context),
  };
}

export async function ViewerMenu() {
  return (await loadViewerMenu()).menu;
}
