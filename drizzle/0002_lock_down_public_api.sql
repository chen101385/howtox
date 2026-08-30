-- Close the auto-exposed PostgREST API over these tables.
--
-- WHY THIS EXISTS
--
-- Supabase publishes every table in the `public` schema through PostgREST, and
-- the anon key that reaches the browser is enough to call it. Without this
-- migration, anyone who opens devtools, copies NEXT_PUBLIC_SUPABASE_ANON_KEY and
-- issues `GET /rest/v1/users?select=*` reads every legal name, email address,
-- phone number and payout reference in the database. That is not a theoretical
-- risk; it is the default state of a new Supabase project, and it is why
-- Supabase's own dashboard flags unrestricted tables.
--
-- HOW IT IS CLOSED
--
-- 1. REVOKE removes the grants PostgREST relies on for the `anon` (signed-out)
--    and `authenticated` (signed-in) roles. No grant, no API access.
-- 2. ENABLE ROW LEVEL SECURITY is defence in depth: should a grant be restored
--    by hand or by a future tool, RLS with no permissive policy still denies
--    every row.
--
-- WHY THE APPLICATION KEEPS WORKING
--
-- The app connects as the table owner (`postgres`), and a table owner is exempt
-- from RLS unless FORCE ROW LEVEL SECURITY is set. So Drizzle's queries are
-- unaffected, while the public API is shut.
--
-- WHAT THIS IS NOT
--
-- This is NOT per-user authorization. Tenant scoping and "may this viewer read
-- this booking" are still enforced in application code, in the repositories and
-- route handlers. Writing per-row policies requires the database to know who the
-- caller is, which in turn requires connecting as `authenticated` and passing
-- the user's JWT — a deliberate architectural change, not a migration.
--
-- CONSEQUENCE: do not add a browser-side Supabase data client and expect it to
-- read these tables. It will get nothing, by design. Data reaches the browser
-- through server components and route handlers, which is the boundary where the
-- privacy rules in src/domain/identity.ts are actually applied.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "host_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "experiences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "occurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "seats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "incidents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "risk_signals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Guarded: `anon` and `authenticated` exist on Supabase but not on a plain
-- Postgres or PGlite instance, where this migration must still apply cleanly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    -- Without this, tables created by later migrations would be granted again.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
  END IF;
END
$$;
