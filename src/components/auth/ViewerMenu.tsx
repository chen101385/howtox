import { getProviders, activeAuthProvider } from "@/providers";
import { SIGN_IN_PATH } from "@/providers/supabase";

/**
 * Signed-in state in the header.
 *
 * Renders nothing at all on the demo adapter: seeded personas are not accounts,
 * and a "Sign out" button that signs no one out would be a lie in the nav bar.
 *
 * Sign-out is a form POST rather than a link so it cannot be triggered by a
 * third-party page embedding an image or link to it.
 */
export async function ViewerMenu() {
  if (activeAuthProvider() === "demo") return null;

  const viewer = await getProviders().auth.getViewer();

  if (!viewer) {
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
      <span className="hidden text-sm text-muted sm:inline">
        {viewer.displayName}
      </span>
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
