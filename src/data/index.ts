import { createMemoryRepositories } from "./memory";
import { DEMO_TENANT } from "./seed/hosts";
import type { Repositories } from "./repositories";

/**
 * Repository selection.
 *
 * Only the in-memory demo adapter exists today. A Postgres/Supabase adapter would
 * be registered here; nothing above this file changes when it is.
 *
 * The instance is pinned to `globalThis` rather than a module-level `let`. In
 * Next.js, route handlers and pages are compiled into separate bundles and dev
 * mode re-evaluates modules on HMR, so a module-scoped singleton gives each
 * bundle its OWN store — a booking created by an API route would then be
 * invisible to the page that renders it. This is the same pattern used for
 * database clients in Next.js, for the same reason.
 */

const REGISTRY_KEY = Symbol.for("whitelabel.repositories");

type GlobalWithRepos = typeof globalThis & {
  [REGISTRY_KEY]?: Repositories;
};

export function getRepositories(): Repositories {
  const scope = globalThis as GlobalWithRepos;
  scope[REGISTRY_KEY] ??= createMemoryRepositories();
  return scope[REGISTRY_KEY];
}

/** The tenant this deployment serves. Carried through every repository call. */
export const CURRENT_TENANT = DEMO_TENANT;

export * from "./repositories";
