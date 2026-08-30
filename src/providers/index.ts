/**
 * Provider selection.
 *
 * Reads the active client's `integrations` block and returns the matching
 * adapters. Live adapters slot in here without any change to domain code or UI
 * (see docs/provider-integrations.md). Supabase Auth is the only live adapter
 * implemented so far; every other non-demo provider still throws rather than
 * quietly serving mocks.
 */

import { client } from "@/config/active";
import { createDemoProviders } from "./demo";
import type { AuthProvider, Providers } from "./types";

/**
 * Pinned to `globalThis` for the same reason as the repositories: Next.js
 * compiles routes into separate bundles, so a module-scoped singleton would give
 * each route its own provider instance and lose any state they hold (such as the
 * demo session provider's rejoin blocklist).
 */
const PROVIDERS_KEY = Symbol.for("whitelabel.providers");

type GlobalWithProviders = typeof globalThis & { [PROVIDERS_KEY]?: Providers };

/**
 * Reads the caller's Supabase access token from the `Authorization` header.
 *
 * Deliberately header-based, not cookie-based. Supabase's browser session cookie
 * is chunked and its encoding is an implementation detail of `@supabase/ssr`;
 * hand-parsing it would be guesswork. A Bearer header is a fully specified
 * contract that works today for API routes and server-to-server calls.
 *
 * Browser cookie sessions need the sign-in flow, which is not built — see
 * `src/providers/supabase/index.ts`. Returning undefined here means "signed
 * out", which is the correct and safe answer, not a silent failure.
 */
async function bearerTokenFromRequest(): Promise<string | undefined> {
  // Imported lazily: `next/headers` throws outside a request scope, and this
  // module is also loaded by scripts and tests.
  const { headers } = await import("next/headers");
  const authorization = headers().get("authorization");
  if (!authorization) return undefined;

  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
}

function createLiveAuthProvider(provider: string): AuthProvider {
  if (provider !== "supabase") {
    throw new Error(
      `Auth provider "${provider}" has no adapter. Implement it under ` +
        `src/providers/${provider}/ following docs/provider-integrations.md.`
    );
  }

  // Required lazily so `@supabase/supabase-js` is only pulled into the bundle
  // of a client that actually selects it.
  const { createSupabaseAuthProvider } =
    require("./supabase") as typeof import("./supabase");

  return createSupabaseAuthProvider(bearerTokenFromRequest);
}

export function getProviders(): Providers {
  const scope = globalThis as GlobalWithProviders;
  const cached = scope[PROVIDERS_KEY];
  if (cached) return cached;

  const integrations = client.config.integrations;
  const authProvider = integrations.auth?.provider;

  // Auth is the one seam with a live adapter today. Everything else still fails
  // loudly rather than silently falling back to mocks in production.
  const unimplemented: string[] = [
    integrations.commerce?.provider,
    integrations.session?.provider,
    integrations.media?.provider,
    integrations.messaging?.provider,
  ].filter((p): p is NonNullable<typeof p> => Boolean(p) && p !== "demo");

  if (unimplemented.length > 0) {
    throw new Error(
      `Client "${client.slug}" requests live provider(s) [${unimplemented.join(", ")}], ` +
        `but no live adapter is implemented yet. Set these to "demo" in the client's ` +
        `integrations block, or implement the adapter under src/providers/<vendor>/ ` +
        `following docs/provider-integrations.md.`
    );
  }

  const providers = createDemoProviders();

  if (authProvider && authProvider !== "demo") {
    providers.auth = createLiveAuthProvider(authProvider);
  }

  scope[PROVIDERS_KEY] = providers;
  return providers;
}

/** True when every active provider is a credential-free mock. */
export function isDemoMode(): boolean {
  const p = getProviders();
  return [p.auth, p.commerce, p.session, p.media, p.messaging].every(
    (x) => x.info.mode === "demo"
  );
}

export * from "./types";
