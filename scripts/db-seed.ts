/**
 * Loads the demo seed data into Postgres.
 *
 *   npm run db:seed
 *
 * Idempotent — safe to re-run. Intended for a development or demo database, not
 * for production: it inserts fictional hosts, listings and incidents.
 */
import { createDatabase } from "../src/data/postgres/client";
import { seedDatabase } from "../src/data/postgres/seed";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error(
    "\n✖ No DATABASE_URL set. See .env.example.\n" +
      "  Without it the app uses the in-memory adapter, which is already seeded.\n"
  );
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PRODUCTION_SEED) {
  console.error(
    "\n✖ Refusing to seed with NODE_ENV=production.\n" +
      "  This inserts fictional demo records. Set ALLOW_PRODUCTION_SEED=1 to override.\n"
  );
  process.exit(1);
}

const db = createDatabase(url);

try {
  const counts = await seedDatabase(db);
  console.log("✅ Seeded:");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`   ${table.padEnd(16)} ${count}`);
  }
} catch (error) {
  console.error("✖ Seeding failed:", error);
  process.exitCode = 1;
}

process.exit(process.exitCode ?? 0);
