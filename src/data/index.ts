import { createMemoryRepositories } from "./memory";
import { createMemoryRateLimiter, type RateLimiter } from "./rate-limit";
import { DEMO_TENANT } from "./seed/hosts";
import type { Repositories } from "./repositories";

/**
 * Repository selection.
 *
 * `DATABASE_URL` present → Postgres. Absent → the in-memory demo adapter.
 *
 * The demo adapter stays the default deliberately: `git clone && npm install &&
 * npm run dev` must produce a working application with no credentials and no
 * database. Adding persistence is opt-in, not a prerequisite for running the
 * project.
 *
 * The instance is pinned to `globalThis` rather than a module-level `let`. In
 * Next.js, route handlers and pages are compiled into separate bundles and dev
 * mode re-evaluates modules on HMR, so a module-scoped singleton gives each
 * bundle its OWN store — a booking created by an API route would then be
 * invisible to the page that renders it.
 */

const REGISTRY_KEY = Symbol.for("whitelabel.repositories");

type GlobalWithRepos = typeof globalThis & {
  [REGISTRY_KEY]?: Repositories;
};

export type DataMode = "postgres" | "memory";

export function getDataMode(): DataMode {
  return process.env.DATABASE_URL ? "postgres" : "memory";
}

function createRepositories(): Repositories {
  const url = process.env.DATABASE_URL;
  if (!url) return createMemoryRepositories();

  // Required lazily so the Postgres driver is never loaded — or bundled into a
  // build — for a deployment that runs on the in-memory adapter.
  const { getDatabase } = require("./postgres/client") as typeof import("./postgres/client");
  const { createPostgresRepositories } =
    require("./postgres/repositories") as typeof import("./postgres/repositories");

  return createPostgresRepositories(getDatabase(url));
}

export function getRepositories(): Repositories {
  const scope = globalThis as GlobalWithRepos;
  scope[REGISTRY_KEY] ??= createRepositories();
  return scope[REGISTRY_KEY];
}

/**
 * The rate limiter, selected the same way and pinned for the same reason: a
 * per-bundle limiter would give each route its own counters, which is exactly
 * the bug the in-memory adapter is already apologetic about.
 */
const LIMITER_KEY = Symbol.for("whitelabel.rateLimiter");

type GlobalWithLimiter = typeof globalThis & { [LIMITER_KEY]?: RateLimiter };

function createRateLimiter(): RateLimiter {
  const url = process.env.DATABASE_URL;
  if (!url) return createMemoryRateLimiter();

  const { getDatabase } = require("./postgres/client") as typeof import("./postgres/client");
  const { createPostgresRateLimiter } =
    require("./postgres/rate-limit") as typeof import("./postgres/rate-limit");

  return createPostgresRateLimiter(getDatabase(url));
}

export function getRateLimiter(): RateLimiter {
  const scope = globalThis as GlobalWithLimiter;
  scope[LIMITER_KEY] ??= createRateLimiter();
  return scope[LIMITER_KEY];
}

/** The tenant this deployment serves. Carried through every repository call. */
export const CURRENT_TENANT = DEMO_TENANT;

export * from "./repositories";
export {
  identityKey,
  type RateLimitResult,
  type RateLimitRule,
  type RateLimiter,
} from "./rate-limit";
