/**
 * Provider selection.
 *
 * Reads the active client's `integrations` block and returns the matching
 * adapters. Only demo adapters exist today; live vendor adapters slot in here
 * without any change to domain code or UI (see docs/provider-integrations.md).
 */

import { client } from "@/config/active";
import { createDemoProviders } from "./demo";
import type { Providers } from "./types";

/**
 * Pinned to `globalThis` for the same reason as the repositories: Next.js
 * compiles routes into separate bundles, so a module-scoped singleton would give
 * each route its own provider instance and lose any state they hold (such as the
 * demo session provider's rejoin blocklist).
 */
const PROVIDERS_KEY = Symbol.for("whitelabel.providers");

type GlobalWithProviders = typeof globalThis & { [PROVIDERS_KEY]?: Providers };

export function getProviders(): Providers {
  const scope = globalThis as GlobalWithProviders;
  const cached = scope[PROVIDERS_KEY];
  if (cached) return cached;

  const integrations = client.config.integrations;
  const requested: string[] = [
    integrations.auth?.provider,
    integrations.commerce?.provider,
    integrations.session?.provider,
    integrations.media?.provider,
    integrations.messaging?.provider,
  ].filter((p): p is NonNullable<typeof p> => Boolean(p) && p !== "demo");

  if (requested.length > 0) {
    // Fail loudly rather than silently falling back to mocks in production.
    throw new Error(
      `Client "${client.slug}" requests live provider(s) [${requested.join(", ")}], ` +
        `but no live adapter is implemented yet. Set these to "demo" in the client's ` +
        `integrations block, or implement the adapter under src/providers/<vendor>/ ` +
        `following docs/provider-integrations.md.`
    );
  }

  const providers = createDemoProviders();
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
