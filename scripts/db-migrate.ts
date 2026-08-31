/**
 * Applies pending migrations.
 *
 *   npm run db:migrate
 *
 * Uses MIGRATION_DATABASE_URL when set, falling back to DATABASE_URL. On Supabase
 * this must be the DIRECT connection (port 5432) — DDL cannot run through the
 * transaction-mode pooler.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadEnv } from "./load-env";

// tsx does not read .env.local the way Next.js does.
loadEnv();

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (!url) {
  console.error(
    "\n✖ No MIGRATION_DATABASE_URL or DATABASE_URL set.\n" +
      "  The app runs without a database on the in-memory adapter; you only need\n" +
      "  this when you have provisioned Postgres. See .env.example.\n"
  );
  process.exit(1);
}

if (url.includes(":6543")) {
  console.warn(
    "⚠ That looks like a Supabase pooler URL (port 6543). Migrations need the\n" +
      "  direct connection (port 5432). Set MIGRATION_DATABASE_URL to it.\n"
  );
}

// Wrapped in a function rather than using top-level await: this package is
// CommonJS, and tsx compiles top-level await to a hard error there. It fails at
// transform time, so the script never runs at all.
async function main(connectionString: string) {
  // `max: 1` because migrations must run serially on a single session-mode
  // connection; a pool would interleave DDL statements.
  const client = postgres(connectionString, { max: 1 });

  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations applied.");
  } catch (error) {
    console.error("✖ Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main(url);
