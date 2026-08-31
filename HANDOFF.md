# Handoff — where this is and what's next

Written 2026-08-31. Read this, then `CLAUDE.md` for the coding conventions.

If you are an AI assistant picking this up: `CLAUDE.md` holds the rules you must
not break. This file holds the *state* — what's built, what's blocked, and the
one task in flight.

---

## The one task in flight

**Get the first live Supabase round trip working: a real magic-link sign-in
against the real project.**

Everything is built and committed. It is blocked on two secrets only the repo
owner can retrieve.

### What the owner needs to do

Edit `.env.local` (gitignored, already prefilled) and replace two placeholders:

| Placeholder | Where | Notes |
|---|---|---|
| `<ANON_KEY>` | Supabase dashboard → Project Settings → API Keys → `anon` / `public` | Long JWT starting `eyJ`. **Not** the `service_role` key — that bypasses RLS entirely and must never go in this file or any `NEXT_PUBLIC_` variable. |
| `<PASSWORD>` | Project Settings → Database → Database password | Appears **twice** in the file (runtime + migration URLs). Percent-encode any of `@ : / ? # [ ] %` — `@`→`%40`, `#`→`%23`. |

Then in the dashboard — the one thing no script can check:
**Authentication → URL Configuration → Redirect URLs** must include
`http://localhost:3000/auth/callback`. Supabase rejects any other redirect
target, which is what stops this being an open redirect. The emailed link fails
without it.

### Then run, in order

```bash
npm run db:doctor     # preflight — checks every link, names the broken one
npm run db:migrate    # applies 4 migrations (session-mode connection, port 5432)
npm run db:seed       # loads the demo fixtures
NEXT_PUBLIC_CLIENT=experience-demo npm run dev
```

`db:doctor` is read-only and redacts the password, so its output is safe to
paste into a chat. Start there — "sign-in doesn't work" has about eight causes
that look identical in a browser, and the doctor names which one it is.

### Known facts, so nothing is re-derived

- Supabase project ref: `szovcjtpyekmzkzybash`
- Region: **us-west-2** (found by probing Supavisor across all regions —
  it answers "tenant not found" for the wrong region, a password error for the
  right one). Pooler host `aws-0-us-west-2.pooler.supabase.com` is already
  correct in `.env.local`; there is nothing to look up.
- Runtime uses port **6543** (transaction pooler, `prepare: false` required).
  Migrations use port **5432** — DDL cannot run through the transaction pooler.
- The project is reachable and live (unauthenticated requests return 401, not a
  connection error).

### Expect this to bite first

**Supabase's built-in email sender is throttled to a handful per hour and is
documented as test-only.** The first magic link will probably arrive; the third
probably won't. That is not a bug in this codebase — it is why custom SMTP is
the top item in "next up" below. If links stop arriving, wire Resend rather than
debugging the flow.

---

## What is built and verified

**323 tests, 18 files. Five clients build. CI runs all of it on every push.**

| Area | State |
|---|---|
| Config-driven whitelabeling | Working. 5 clients, `NEXT_PUBLIC_CLIENT` selects one per deploy. |
| Marketplace domain + UI | Working. Full guest journey verified end to end against a production build. |
| Postgres persistence | Working, opt-in via `DATABASE_URL`. Tested against real Postgres (PGlite/WASM) running the real migration files. **Never run against hosted Supabase.** |
| Magic-link sign-in | Built, opt-in via `AUTH_PROVIDER=supabase`. **Never run against a live project** — that is the task above. |
| Rate limiting | Working on every public POST route. Verified live: 10 through, then 429 with correct `Retry-After`, scoped per IP. |
| Notifications | Seam + demo adapter only. Renders and logs; **no vendor adapter exists**, nothing is delivered. |
| Legal/policy pages | Working, config-driven. Documents are `templateOnly` — **not legally reviewed, not fit to publish.** |
| Payments, live video, media, user messaging | Demo adapters only. `getProviders()` throws if a client requests a real one. |

### Commit history (newest first)

```
2330adb  Make the live Supabase path actually runnable
c7626fd  Add rate limiting, CI, a notification seam, and policy pages
26f3456  Build the Supabase sign-in flow and close the public database API
08685ab  Add Postgres/Drizzle data adapter and Supabase auth adapter
c12d177  Refactor into a multi-preset platform with an interactive-experiences marketplace
79df582  Scaffold whitelabel site template (Next.js + Tailwind)
```

---

## Gaps that are deliberate, not oversights

Do not "fix" these without discussing them — each was a decision.

1. **No per-row database authorization.** Migration `0002` revokes the
   PostgREST grants and enables RLS with no policies, which *closes* the
   auto-exposed public API. It is a lock, not an authorization model — tenant
   scoping and "may this viewer read this booking" are enforced in application
   code. Real per-row policies need the app to connect as `authenticated` and
   pass the user's JWT: an architectural change, not a migration.
2. **No session reminders.** Nothing in this codebase schedules anything. A
   reminder template without a scheduler is decoration, so it wasn't written.
3. **No i18n.** The terminology system already enforces most of the discipline.
   Machinery before a second language is premature.
4. **Content and forum modules contribute no UI.** They exist as capability
   stubs. Two of the three business types from the original brief (video
   content, forum) are therefore *not* covered by the template yet. Deliberate
   while the marketplace is the active bet — but know it.
5. **`legal` documents are `templateOnly: true`.** Clearing that flag is a claim
   that a lawyer has read them. Nobody has.
6. **Scripts must not use top-level await.** This package is CommonJS; `tsx`
   treats top-level await as a transform error and the script never runs. Wrap
   in `async function main()` + `void main()`. This already bit `db:migrate` and
   `db:seed` once.

---

## Next up, stack-ranked

Agreed priorities after the round trip lands.

1. **Custom SMTP + a Resend/Postmark notification adapter.** ~half a day. The
   seam is built and wired; only the vendor adapter is missing. Blocks real
   sign-in *and* booking confirmations, so it is genuinely first.
2. **Analytics + consent gating.** `integrations.analytics` is typed and read by
   nothing — the config currently lies. ~1 day.
3. **Per-client SEO surface** — `sitemap.ts`, `robots.ts`, per-client OG images.
   ~4h. Discovery is the growth engine and per-client generation is a template
   job.
4. **Error monitoring.** ~2h. There is now a live database and real auth; silent
   500s are the failure mode.
5. **Timezone display audit.** ~1 day. Emails now name their zone
   (`occurrenceDateTimeWithZone`); the on-page surfaces have not been swept.
6. **Role admin surface.** ~1–2 days. `moderator`/`admin` are granted by
   `UPDATE users SET roles` by hand, with no audit trail, and `/ops/*` has only
   a routing guard — no server-side role check.
7. **Content module UI (video)** — 1–2 weeks.
8. **Community/forum UI** — 2–3 weeks.

### Mobile: decided to wait

Do not scaffold React Native/Expo yet. The reasoning, so it isn't relitigated:

- **The whitelabel model and native apps fight each other.** One deploy per
  client is free on web and means one App Store listing per client on native —
  each with its own review cycle and rejection risk. Ten clients means ten
  submissions per release. Any viable native strategy is probably *one* app with
  runtime tenant selection, which is a different architecture from what exists.
- **It would be built around a hole.** The core is live interactive video, which
  is the hardest thing to get right on mobile and is still a demo adapter here.
- **The model is still moving** (teen coaching → live-experience marketplace).

Cheap things worth doing instead: a PWA manifest + installability + mobile-web
polish (~1 day), and keeping route handlers returning JSON and accepting
`Authorization: Bearer` — which they already do.

**The forcing function to watch for is push notifications.** "Your session
starts in 10 minutes" is the one thing web can't do reliably on iOS. When
no-shows are hurting and email reminders aren't landing, revisit.

---

## Machine and repo notes

- **Repo:** `git@github.com:chen101385/howtox.git`, branch `main`, public.
  Local path on the previous machine: `~/Documents/Code Projects/whitelabel-site`.
- **Git over SSH.** HTTPS push fails (no stored credential; GitHub no longer
  accepts passwords). An ed25519 key is registered on the account.
- **Git identity was unset** and is now configured repo-locally as
  `Chris <christopher.chen@descript.com>` to match existing history. A fresh
  clone will need it set again.
- **npm cache is broken on the previous machine** — root-owned files under
  `~/.npm/_cacache` cause `EACCES`. Workaround is `npm install --cache <some
  writable dir>`, never `sudo`. This is a pre-existing machine issue and may not
  follow you.
- **`npm audit` reports two moderate/high findings**, both dev-only transitive
  (esbuild via `drizzle-kit`, glob via `eslint-config-next`). Neither ships in
  the runtime bundle. Fixing them requires major-version bumps of both tools;
  deliberately deferred.
- **`.env.local` is gitignored** and will not be in a fresh clone. Recreate it
  from the table at the top of this file, or from `.env.example`.

## Verification before calling anything done

```bash
npm run verify                                  # typecheck + lint + test + build
NEXT_PUBLIC_CLIENT=experience-demo npm run build
```

Config validation is **per-client**: a broken client config passes every other
check and only fails when that specific client is built. CI builds all five for
this reason. Run at least `experience-demo` locally.
