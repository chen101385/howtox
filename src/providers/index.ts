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
import type { AuthProvider, Providers, ProviderInfo } from "./types";

/**
 * Pinned to `globalThis` for the same reason as the repositories: Next.js
 * compiles routes into separate bundles, so a module-scoped singleton would give
 * each route its own provider instance and lose any state they hold (such as the
 * demo session provider's rejoin blocklist).
 */
const PROVIDERS_KEY = Symbol.for("whitelabel.providers");

type GlobalWithProviders = typeof globalThis & { [PROVIDERS_KEY]?: Providers };

function createLiveAuthProvider(provider: string): AuthProvider {
  if (provider !== "supabase") {
    throw new Error(
      `Auth provider "${provider}" has no adapter. Implement it under ` +
        `src/providers/${provider}/ following docs/provider-integrations.md.`
    );
  }

  // Required lazily so the Supabase SDKs are only pulled into the bundle of a
  // client that actually selects them.
  const { createSupabaseAuthProvider } =
    require("./supabase") as typeof import("./supabase");

  return createSupabaseAuthProvider();
}

/**
 * Which auth provider is active.
 *
 * The client config is the default, and `AUTH_PROVIDER` overrides it. That
 * override exists because "which auth provider" is genuinely a property of the
 * *deployment*, not of the brand: the same client config has to work as a
 * credential-free demo (where there is no Supabase project) and as a live
 * deployment (where there is). Baking `supabase` into the config would break
 * `npm run dev` for anyone without credentials, which is a rule this repo keeps.
 *
 * Unset means the config wins, so the zero-configuration path is unchanged.
 */
export function activeAuthProvider(): string {
  return (
    process.env.AUTH_PROVIDER ?? client.config.integrations.auth?.provider ?? "demo"
  );
}

export function getProviders(): Providers {
  const scope = globalThis as GlobalWithProviders;
  const cached = scope[PROVIDERS_KEY];
  if (cached) return cached;

  const integrations = client.config.integrations;
  const authProvider = activeAuthProvider();

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

  if (authProvider !== "demo") {
    providers.auth = createLiveAuthProvider(authProvider);
  }

  scope[PROVIDERS_KEY] = providers;
  return providers;
}

/**
 * Every provider paired with the words a user would recognize it by.
 *
 * One list, derived from the container, so adding a seventh provider cannot
 * leave the disclosure banner silently under-reporting: `isDemoMode()` counts
 * against this list rather than a hardcoded number.
 */
function labelledProviders(): { provider: { info: ProviderInfo }; label: string }[] {
  const p = getProviders();
  return [
    { provider: p.auth, label: "sign-in" },
    { provider: p.commerce, label: "payments" },
    { provider: p.session, label: "live video" },
    { provider: p.media, label: "media hosting" },
    { provider: p.messaging, label: "message delivery" },
    { provider: p.notifications, label: "email" },
  ];
}

/** True when every active provider is a credential-free mock. */
export function isDemoMode(): boolean {
  const all = labelledProviders();
  return mockedProviders().length === all.length;
}

/**
 * Human-readable names of the providers that are still mocks.
 *
 * Drives the disclosure banner. Derived from `info.mode` rather than from
 * config, so an adapter cannot be swapped in without the banner noticing — and
 * it reports a partially-live deployment accurately instead of going quiet the
 * moment one real provider appears.
 */
export function mockedProviders(): string[] {
  return labelledProviders()
    .filter(({ provider }) => provider.info.mode === "demo")
    .map(({ label }) => label);
}

export * from "./types";
