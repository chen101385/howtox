/**
 * Preflight for a live Supabase deployment.
 *
 *   npm run db:doctor
 *
 * Checks each link in the chain in order and stops describing things once one
 * breaks, because a failure early on makes every later result meaningless.
 *
 * Exists because "sign-in doesn't work" has about eight causes — wrong pooler
 * port, unapplied migrations, missing redirect allow-list entry, throttled
 * built-in email — and they produce nearly identical symptoms in the browser.
 * Each check below names the specific fix.
 *
 * Read-only. It creates nothing and changes nothing.
 */

import postgres from "postgres";
import { loadEnv } from "./load-env";

const files = loadEnv();

type Status = "pass" | "fail" | "warn" | "skip";

const results: { status: Status; label: string; detail?: string }[] = [];

function record(status: Status, label: string, detail?: string) {
  results.push({ status, label, detail });
  const icon = { pass: "✅", fail: "✖ ", warn: "⚠ ", skip: "· " }[status];
  console.log(`${icon} ${label}`);
  if (detail) {
    for (const line of detail.split("\n")) console.log(`     ${line}`);
  }
}

/** Hides the password so output can be pasted into a bug report. */
function redact(url: string): string {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:••••••@");
}

console.log(
  `\nSupabase preflight${files.length ? ` (loaded ${files.join(", ")})` : ""}\n`
);


/**
 * Prints the tally and sets the exit code. Called at every early return so a
 * bail-out still ends with a summary rather than trailing off.
 */
function report(): void {
  const failed = results.filter((r) => r.status === "fail").length;
  const warned = results.filter((r) => r.status === "warn").length;

  console.log("");
  if (failed > 0) {
    console.log(
      `${failed} problem(s) to fix${warned ? `, ${warned} warning(s)` : ""}.\n`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Ready${warned ? ` (${warned} warning(s))` : ""}. ` +
      `Next: NEXT_PUBLIC_CLIENT=experience-demo npm run dev\n\n` +
      "  One thing this cannot check: the redirect allow-list. In the dashboard,\n" +
      "  Authentication -> URL Configuration -> Redirect URLs must include\n" +
      "  http://localhost:3000/auth/callback or the emailed link is rejected.\n"
  );
}

// Wrapped rather than top-level await: this package is CommonJS, where tsx
// treats top-level await as a transform error and nothing runs at all.
async function main(): Promise<void> {
  /* ------------------------- 1. Environment ------------------------------- */


  const authProvider = process.env.AUTH_PROVIDER;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  const migrationUrl = process.env.MIGRATION_DATABASE_URL ?? databaseUrl;

  const PLACEHOLDER = /<[A-Z_]+>/;

  const missing = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !databaseUrl && "DATABASE_URL",
  ].filter((v): v is string => Boolean(v));

  if (missing.length > 0) {
    record(
      "fail",
      `Missing: ${missing.join(", ")}`,
      "Fill them in .env.local and uncomment the lines. See .env.example."
    );
    return report();
  }

  const placeholders = Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey!,
    DATABASE_URL: databaseUrl!,
  })
    .filter(([, value]) => PLACEHOLDER.test(value))
    .map(([key]) => key);

  if (placeholders.length > 0) {
    record(
      "fail",
      `Still contains placeholders: ${placeholders.join(", ")}`,
      "Replace the <ANGLE_BRACKET> values with the real ones from the dashboard."
    );
    return report();
  }

  record("pass", "Environment variables present");

  if (authProvider !== "supabase") {
    record(
      "warn",
      `AUTH_PROVIDER is ${authProvider ? `"${authProvider}"` : "unset"}`,
      "Sign-in surfaces will 404 and the demo auth adapter stays active.\n" +
        'Set AUTH_PROVIDER=supabase to use the credentials below.'
    );
  }

  /* ------------------------- 2. Connection strings ------------------------ */

  if (!databaseUrl!.includes(":6543")) {
    record(
      "warn",
      "DATABASE_URL is not on port 6543",
      "Supabase's transaction pooler is 6543 and is what a serverless runtime\n" +
        "wants. Port 5432 works but exhausts connections under load."
    );
  } else {
    record("pass", "DATABASE_URL uses the transaction pooler (6543)");
  }

  if (migrationUrl!.includes(":6543")) {
    record(
      "fail",
      "MIGRATION_DATABASE_URL is on port 6543",
      "DDL cannot run through the transaction pooler. Set it to the session-mode\n" +
        "connection on port 5432 — migrations will fail otherwise."
    );
  } else {
    record("pass", "Migration URL uses a session-mode connection (5432)");
  }

  /* ------------------------- 3. Supabase Auth ----------------------------- */

  const authBase = `${supabaseUrl!.replace(/\/$/, "")}/auth/v1`;

  try {
    const response = await fetch(`${authBase}/settings`, {
      headers: { apikey: anonKey! },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 401) {
      record(
        "fail",
        "Supabase rejected the anon key",
        "Copy it again from Project Settings -> API Keys -> anon / public.\n" +
          "It is a long JWT starting with 'eyJ'."
      );
    } else if (!response.ok) {
      record("fail", `Supabase auth returned ${response.status}`);
    } else {
      const settings = (await response.json()) as {
        external?: Record<string, boolean>;
        mailer_autoconfirm?: boolean;
        disable_signup?: boolean;
      };

      record("pass", "Supabase auth reachable and the anon key is accepted");

      if (settings.disable_signup) {
        record(
          "fail",
          "Sign-ups are disabled on this project",
          "Magic-link sign-in creates a Supabase user on first use, so this blocks\n" +
            "every new account. Authentication -> Sign In / Providers."
        );
      }

      const social = Object.entries(settings.external ?? {})
        .filter(([name, on]) => on && name !== "email")
        .map(([name]) => name);
      if (social.length > 0) {
        record("pass", `Social providers enabled: ${social.join(", ")}`);
      }
    }
  } catch (cause) {
    record(
      "fail",
      "Could not reach Supabase auth",
      `${(cause as Error).message}\nCheck NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`
    );
  }

  /* ------------------------- 4. Database ---------------------------------- */

  let sql: ReturnType<typeof postgres> | undefined;

  try {
    // `prepare: false` is required for the transaction pooler; harmless otherwise.
    sql = postgres(databaseUrl!, { max: 1, prepare: false, connect_timeout: 15 });
    const [row] = await sql<{ version: string }[]>`select version()`;
    record("pass", `Database reachable — ${row.version.split(" ").slice(0, 2).join(" ")}`);
  } catch (cause) {
    const message = (cause as Error).message;

    /*
     * Ordered most-specific first. Supavisor's "tenant or user not found" is
     * reported with an ENOTFOUND code even though DNS resolved fine, so testing
     * for ENOTFOUND first would give the wrong advice — it means the project is
     * not in that region, or the username is not postgres.<project-ref>.
     */
    const hint = /tenant.*not found|not found.*tenant/i.test(message)
      ? "Supavisor has no such tenant on that host. Two causes:\n" +
        "  1. Wrong region — the host must be the one the dashboard shows.\n" +
        "  2. Wrong username — for the pooler it must be postgres.<project-ref>,\n" +
        "     not plain 'postgres'."
      : /password authentication failed|SASL|Wrong password/i.test(message)
        ? "The password is wrong, or a special character in it needs\n" +
          "percent-encoding (@ : / ? # [ ] % — @ becomes %40, # becomes %23)."
        : /ENOTFOUND|EAI_AGAIN/.test(message)
          ? "The hostname does not resolve. Copy it from Project Settings ->\n" +
            "Database -> Connection string rather than guessing the region."
          : /timeout|ETIMEDOUT/i.test(message)
            ? "Connection timed out. A paused free-tier project has to be resumed\n" +
              "from the dashboard before it accepts connections."
            : "";

    record("fail", "Cannot connect to the database", `${message}\n${hint}`.trim());
    console.log(`\n     Using: ${redact(databaseUrl!)}\n`);
    await sql?.end();
    return report();
  }

  /* ------------------------- 5. Migrations -------------------------------- */

  const EXPECTED_TABLES = [
    "users",
    "host_profiles",
    "experiences",
    "occurrences",
    "bookings",
    "seats",
    "conversations",
    "messages",
    "reviews",
    "incidents",
    "risk_signals",
    "ledger_entries",
    "rate_limit_counters",
  ];

  const tables = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public'
  `;
  const present = new Set(tables.map((t) => t.table_name));
  const absent = EXPECTED_TABLES.filter((t) => !present.has(t));

  if (absent.length === EXPECTED_TABLES.length) {
    record(
      "fail",
      "No tables — migrations have not been applied",
      "Run: npm run db:migrate"
    );
  } else if (absent.length > 0) {
    record(
      "fail",
      `Missing ${absent.length} table(s): ${absent.join(", ")}`,
      "Run: npm run db:migrate"
    );
  } else {
    record("pass", `All ${EXPECTED_TABLES.length} tables present`);
  }

  /* ------------------------- 6. RLS lockdown ------------------------------ */

  if (absent.length === 0) {
    const unprotected = await sql<{ tablename: string }[]>`
      select tablename from pg_tables
      where schemaname = 'public' and rowsecurity = false
    `;

    if (unprotected.length > 0) {
      record(
        "fail",
        `Row-level security is OFF on: ${unprotected.map((t) => t.tablename).join(", ")}`,
        "Supabase serves every public table over PostgREST using the anon key that\n" +
          "ships to the browser. Right now anyone with that key can read these.\n" +
          "Run: npm run db:migrate (migration 0002 closes this)"
      );
    } else {
      record("pass", "Row-level security enabled on every table");
    }

    // The grant check matters independently: RLS on a table the anon role cannot
    // even select from is belt and braces, and we want both.
    const grants = await sql<{ grantee: string; table_name: string }[]>`
      select distinct grantee, table_name
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')
    `;

    if (grants.length > 0) {
      const summary = [...new Set(grants.map((g) => g.grantee))].join(", ");
      record(
        "warn",
        `${summary} still hold table grants on ${new Set(grants.map((g) => g.table_name)).size} table(s)`,
        "RLS with no permissive policy still denies, so this is not an open door —\n" +
          "but migration 0002 revokes these too. Re-run npm run db:migrate."
      );
    } else {
      record("pass", "anon and authenticated hold no table grants");
    }
  }

  /* ------------------------- 7. Seed data --------------------------------- */

  if (absent.length === 0) {
    const [{ count: userCount }] = await sql<{ count: string }[]>`
      select count(*)::text as count from users
    `;
    const [{ count: experienceCount }] = await sql<{ count: string }[]>`
      select count(*)::text as count from experiences
    `;

    if (Number(userCount) === 0) {
      record(
        "warn",
        "No rows in users — the database is empty",
        "The site will render with no listings. Run: npm run db:seed"
      );
    } else {
      record(
        "pass",
        `Seeded — ${userCount} user(s), ${experienceCount} experience(s)`
      );
    }
  }

  /* ------------------------- 8. PostgREST exposure ------------------------ */

  if (absent.length === 0) {
    // The check that matters most, made from outside: can the browser key read
    // the users table over the public API?
    try {
      const response = await fetch(
        `${supabaseUrl!.replace(/\/$/, "")}/rest/v1/users?select=email&limit=1`,
        {
          headers: { apikey: anonKey!, Authorization: `Bearer ${anonKey!}` },
          signal: AbortSignal.timeout(15_000),
        }
      );

      const body = await response.text();
      const leaked = response.ok && body.trim() !== "[]" && body.includes("@");

      if (leaked) {
        record(
          "fail",
          "THE USERS TABLE IS READABLE WITH THE BROWSER KEY",
          "Anyone who opens devtools can read every email address in your database.\n" +
            "Run: npm run db:migrate"
        );
      } else {
        record(
          "pass",
          `Public API refuses the users table (HTTP ${response.status})`
        );
      }
    } catch (cause) {
      record("skip", `Could not test the public API: ${(cause as Error).message}`);
    }
  }

  await sql.end();


  report();
}

void main();
