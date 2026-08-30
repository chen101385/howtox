/**
 * In-process Postgres for tests.
 *
 * PGlite is a real Postgres compiled to WASM, so these tests exercise actual
 * Postgres semantics — enums, arrays, JSONB, `RETURNING`, transactions and the
 * conditional-update concurrency check — without a server or credentials.
 *
 * It runs the SAME migration files as production, so a migration that would fail
 * on Supabase fails here first.
 */

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import type { PostgresDatabase } from "./client";

export type TestDatabase = {
  db: PostgresDatabase;
  close: () => Promise<void>;
};

export async function createTestDatabase(): Promise<TestDatabase> {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });

  await migrate(db, { migrationsFolder: "./drizzle" });

  return {
    // PGlite and postgres-js drivers expose the same Drizzle query surface used
    // by the repositories; the cast keeps the repository code driver-agnostic.
    db: db as unknown as PostgresDatabase,
    close: () => pg.close(),
  };
}
