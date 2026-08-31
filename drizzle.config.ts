import { defineConfig } from "drizzle-kit";
import { loadEnv } from "./scripts/load-env";

// drizzle-kit does not read .env.local the way Next.js does, so without this a
// correctly-filled file still produces a connection to localhost.
loadEnv();

/**
 * Migrations run against the DIRECT connection (Supabase port 5432), not the
 * transaction-mode pooler (6543) — DDL requires a session-mode connection.
 * `MIGRATION_DATABASE_URL` therefore exists separately from `DATABASE_URL`,
 * which the app uses at runtime through the pooler.
 */
export default defineConfig({
  schema: "./src/data/postgres/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.MIGRATION_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgres://localhost:5432/postgres",
  },
  strict: true,
  verbose: true,
});
