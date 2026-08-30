/**
 * Postgres connection.
 *
 * Supabase notes:
 * - Use the **Supavisor transaction-mode pooler** URI (port 6543) for serverless
 *   deployments. A direct connection (5432) exhausts Postgres connection slots
 *   when every serverless invocation opens its own.
 * - Transaction mode does not support prepared statements, hence `prepare: false`.
 * - `drizzle-kit` migrations must use the **direct** connection (5432), because
 *   DDL needs a session-mode connection. That is why `MIGRATION_DATABASE_URL`
 *   exists separately.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type PostgresDatabase = ReturnType<typeof createDatabase>;

export function createDatabase(connectionString: string) {
  const client = postgres(connectionString, {
    // Required for Supavisor transaction mode; harmless on a direct connection.
    prepare: false,
    // Serverless invocations are short-lived; a large pool per instance is waste.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

/**
 * Pinned to `globalThis` for the same reason as the repositories: Next.js
 * compiles routes into separate bundles, and dev-mode HMR re-evaluates modules.
 * A module-scoped client would open a new connection pool per bundle and per
 * hot reload, which exhausts Postgres connection slots surprisingly fast.
 */
const DB_KEY = Symbol.for("whitelabel.postgres");

type GlobalWithDb = typeof globalThis & { [DB_KEY]?: PostgresDatabase };

export function getDatabase(connectionString: string): PostgresDatabase {
  const scope = globalThis as GlobalWithDb;
  scope[DB_KEY] ??= createDatabase(connectionString);
  return scope[DB_KEY];
}

export { schema };
