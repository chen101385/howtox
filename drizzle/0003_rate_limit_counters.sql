CREATE TABLE "rate_limit_counters" (
	"tenant_id" text NOT NULL,
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY("tenant_id","key","window_start")
);
--> statement-breakpoint
CREATE INDEX "rate_limit_window_idx" ON "rate_limit_counters" USING btree ("window_start");--> statement-breakpoint
-- Required by the rule in CLAUDE.md: any new public-schema table is exposed
-- through Supabase's PostgREST API by default. See 0002 for the full reasoning.
-- The keys here are hashed, but a counter table is still a free traffic-volume
-- readout for anyone holding the browser key.
ALTER TABLE "rate_limit_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "rate_limit_counters" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "rate_limit_counters" FROM authenticated;
  END IF;
END
$$;
