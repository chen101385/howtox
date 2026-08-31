# HowToX

One codebase, many businesses. A config-driven whitelabel site platform that runs
a brochure site, an appointment business, or a live interactive-experience
marketplace from the same source — the difference is a client config file.

**Stack:** Next.js 14 (App Router) · TypeScript (strict) · Tailwind · Zod · Vitest
**Model:** one deployment per client, selected by `NEXT_PUBLIC_CLIENT`.

## Quick start

```bash
npm install
npm run dev                                   # default client (teen-edge)
```

Run a specific client:

```bash
NEXT_PUBLIC_CLIENT=experience-demo npm run dev
```

| Slug | What it is |
|---|---|
| `teen-edge` | Coaching brochure + booking embed (legacy `SiteConfig`) |
| `mentor-academy` | Coaching + content modules (legacy) |
| `collective` | Community brochure, dark theme (legacy) |
| `template` | The scaffold you copy for a new client |
| `experience-demo` | **Interactive-experiences marketplace** ("Lantern Rooms") |

No environment variables are required. Every third-party integration is a demo
adapter, so the whole app runs with no credentials. See [`.env.example`](.env.example).

## The one rule

**Static client configuration holds *configuration*. Mutable business records do
not go in it.**

- `clients/<slug>/*.ts` — brand, theme, copy, terminology, enabled modules,
  policies. Safe to commit.
- `src/data/` — experiences, hosts, bookings, reviews, incidents, ledger entries.
  These are runtime records behind repository interfaces.

A booking is not configuration. If you find yourself adding one to a client file,
it belongs in a repository.

## How it fits together

```
clients/<slug>/client.ts      static per-brand configuration
        ↓
src/config/                   ClientConfig, presets, Zod validation, registry
src/modules/                  module registry: capabilities, deps, nav, sections
        ↓
src/sections/ + components/   presentation (reads terminology, never vendors)
        ↓
src/domain/                   framework-free types, state machines, money, risk
src/data/                     repository interfaces + in-memory and Postgres adapters
src/providers/                Auth/Commerce/Session/Media/Messaging/Notifications
```

- **Theming** — `src/theme/theme.ts` turns a client's colors/fonts/radius into CSS
  custom properties. Tailwind utilities (`bg-primary`, `text-fg`, `rounded-theme`)
  resolve against them, so a full rebrand is a config edit with zero CSS changes.
- **Page composition** — `pages.home.sections` in client config drives the
  homepage through `src/sections/registry.tsx`. `src/app/page.tsx` contains no
  section list of its own.
- **Capabilities decide behavior**, not presets. Marketplace routes exist as
  static files and call `requireCapability(...)`, which `notFound()`s for a client
  that lacks the module — so a brochure client exposes no marketplace navigation
  and its `/discover` 404s.

### Product presets

| Preset | Modules | For |
|---|---|---|
| `marketing` | marketing | Brochure sites |
| `appointments` | marketing, booking | Coaches, practitioners, single-provider bookings |
| `interactive-experiences` | marketplace, discovery, scheduling, sessions, commerce, messaging, reputation, trust-safety | Remote marketplaces for live interactive experiences |

A preset supplies defaults. Modules and their capabilities are the source of truth.

### Terminology is configurable

Shared components never hardcode "Host", "Guest" or "Experience" — they read
`client.terms.provider()`, `client.terms.customer()`, `client.terms.listing()`.
A coaching client renders "Practitioner / Client / Service" from the same code.

## The marketplace demo

```bash
NEXT_PUBLIC_CLIENT=experience-demo npm run dev
```

Remote-only marketplace for live, interactive entertainment and recreational
education — storytelling, comedy, magic, music, DJ, cooking, improv, trivia.
Ten seeded experiences, nine pseudonymous hosts, one-to-one / private-group /
crowdshared booking.

The complete guest journey works end to end:

`/discover` → experience page → pick booking mode, time and seats → mock checkout
→ `/bookings/[code]` → `/lobby/[code]` (policy acceptance) → `/session/[code]`
(session shell with a moving watermark) → `/feedback/[code]` → optional tip.

Host surfaces at `/host`, `/host/experiences`, `/host/sessions`, `/host/earnings`.
Operations at `/ops/incidents`.

### What is real vs. mocked

| Real | Mocked / not implemented |
|---|---|
| Config validation, module resolution | Payments (no charge, no payout) |
| Domain model + state machines | Live audio/video (session shell only) |
| Compensation ledger arithmetic | Identity verification (modeled only) |
| Anti-circumvention detection | Moderation operations |
| Watermarking, policy acceptance | Per-row database authorization policies |
| Incident/dispute modelling | Role administration (edit `users.roles` by hand) |
| Postgres persistence (opt-in) | Email delivery (seam only, no vendor adapter) |
| Magic-link sign-in (opt-in) | Session reminders (nothing schedules them) |
| Rate limiting on every public write | |

Demo mode is disclosed in the UI. No mock is presented as a real transaction,
payout, or recording guarantee.

## Notifications and rate limiting

Transactional email — booking confirmations, host booking alerts, review
requests — renders in `src/domain/notifications.ts` and dispatches through the
`NotificationProvider` seam. The demo adapter logs the subject and the
recipient's *display name* (never their address) and delivers nothing; no vendor
adapter exists yet. Session reminders are **not** built: nothing in this codebase
schedules anything, and a reminder template without a scheduler would be
decoration.

Copy takes the client's terminology, so the same template reads "your session is
confirmed" for one client and "your class is confirmed" for another. Tests assert
that, and that no message carries a legal surname, email, phone or payout
reference — a confirmation email gets forwarded and pasted into support tickets.

Every public POST route goes through `enforceRateLimits()`. Limits are code, in
one reviewable table in `src/lib/rate-limit-guard.ts`. Sign-in is strictest, in
two dimensions (per IP and per email address), because it sends mail on your
domain's reputation. Reporting is the loosest write limit on purpose — a
distressed person filing a report must never be told to come back later.

The limiter follows `DATABASE_URL` like the repositories: unset means per-process
counters, set means shared ones. **It must run behind a proxy that overwrites
`x-forwarded-for`** (Vercel, Cloudflare) or the per-IP dimension is decorative.

## Policies

Terms, privacy, cancellation and conduct live in `legal.documents` in the client
config and render at `/legal` and `/legal/[id]`, with footer links generated
automatically. A client with checkout enabled fails validation without terms and
privacy; a marketplace client also needs cancellation and conduct.

The demo client's documents are marked `templateOnly`, which renders a visible
"not legal advice" notice. They describe what this platform actually does —
rating-independent compensation, watermarking without recording detection,
nothing auto-adjudicated — which is the part a lawyer can't write for you.
**They have not been reviewed and are not fit to publish as-is.**

## Persistence

The app runs with **no environment variables and no database**. Set
`DATABASE_URL` and it switches to Postgres via Drizzle; leave it unset and it
uses the in-memory adapter, which resets on restart. Both satisfy the same
interfaces in `src/data/repositories.ts`, and nothing above `src/data/index.ts`
knows the difference.

```bash
npm run db:generate   # schema change -> SQL migration in drizzle/
npm run db:migrate    # apply migrations (needs a session-mode connection)
npm run db:seed       # load the demo fixtures into Postgres
npm run db:studio     # browse the data
```

Money is stored as `bigint` minor units, `tenant_id` is non-null on all 12
tables, and seat reservation is a single conditional `UPDATE` so the database —
not application code — prevents overselling. The adapter is tested against
[PGlite](https://pglite.dev) (real Postgres in WASM) running the real migration
files, so `npm test` covers it with no Docker and no credentials.

Not yet done: per-row authorization policies, and verification against a hosted
Supabase project. See
[docs/provider-integrations.md](docs/provider-integrations.md) §7.

## Authentication

Off by default — the demo runs on seeded personas. Turn it on with
`AUTH_PROVIDER=supabase` plus the Supabase keys and `DATABASE_URL`:

- Email magic link at `/sign-in`. No passwords stored, hashed, reset or leaked.
- Cookie sessions, refreshed in `src/middleware.ts`.
- An account is provisioned in our `users` table on first sign-in, with the
  `guest` role. Nothing in that path can grant `host`, `moderator` or `admin`.
- Roles are read from `users.roles`, **never** from Supabase `user_metadata` —
  the signed-in user can write that, so a `role` claim there is self-granted.
  There's a test that puts `{"role":"admin"}` on the token and asserts the
  viewer is still a guest.

Migration `0002` also revokes the auto-exposed PostgREST API over these tables.
By default Supabase serves every `public` table to anyone holding the anon key
that ships to the browser; without that migration the `users` table is readable
by the internet.

Not verified: the browser round trip against a live project. Email delivery, the
redirect allow-list and cookie behavior on a real domain are untested until
someone signs in for real. See
[docs/provider-integrations.md](docs/provider-integrations.md) §1.

## Adding a client

```bash
npm run new-client -- acme-coaching "Acme Coaching"
npm run new-client -- night-owl "Night Owl" --preset interactive-experiences
```

The script validates the slug, refuses duplicates and reserved names, copies the
right preset, strips the source brand's identity, creates the asset folder, and
registers the client in `src/config/active.ts`. Then:

1. Edit `clients/<slug>/`
2. Add assets under `public/clients/<slug>/assets/`
3. `NEXT_PUBLIC_CLIENT=<slug> npm run dev`

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest
npm run verify       # typecheck + lint + test + build

npm run db:generate  # schema -> migration        (Postgres only)
npm run db:migrate   # apply migrations           (Postgres only)
npm run db:seed      # load demo fixtures         (Postgres only)
npm run db:studio    # drizzle-kit studio         (Postgres only)
```

CI runs typecheck, lint, the full test suite, and a build for **every** client on
each push and pull request — config validation is per-client, so a broken client
config passes every other check and only fails when that client is built.

## Safety, privacy and fairness

These are product commitments the code actually implements — read
[`docs/trust-and-safety.md`](docs/trust-and-safety.md) for the full account,
including what is *not* possible.

- **Pseudonymity.** Public profiles carry a chosen display name only.
  `toPublicProfile()` is the single sanctioned private→public conversion, and
  tests assert no private field escapes.
- **No recording.** Recording live sessions is prohibited, policy acceptance is
  recorded server-side, and each participant's view carries an individualized
  moving watermark (pseudonymous name + booking code — never a legal name, email
  or phone). **A browser cannot make recording impossible, and this codebase does
  not pretend otherwise.** There is no recording feature and no fake detection.
- **Guaranteed compensation.** Hosts are paid for delivering compliant time. No
  code path reduces the guarantee based on a star rating; only the discretionary
  bonus responds to feedback, and it always awaits human review.
- **Anti-circumvention.** Off-platform contact and payment exchange is detected in
  text with progressive warn → block → review handling. Findings are signals, not
  proof. Live-session audio is never scanned, recorded, or transcribed.
- **Remote-only.** In-person delivery is modeled but disabled; config validation
  rejects enabling it until location handling and safety review exist.

## Documentation

- [Architecture reference](docs/interactive-experiences-architecture.md)
- [Provider integrations](docs/provider-integrations.md) — what's mocked, what production needs
- [Trust & safety](docs/trust-and-safety.md)
- [Implementation plan](docs/interactive-experiences-implementation.md)
- [`CLAUDE.md`](CLAUDE.md) — conventions for working in this repo

## Deploy

One project per client, each with `NEXT_PUBLIC_CLIENT` set to its slug and its own
domain. Pushing to `main` redeploys every client from the same repo.
