# CLAUDE.md

Conventions for working in this repository. Read this before making changes.

## What this project is

A config-driven whitelabel site platform. One codebase serves brochure sites,
appointment businesses, and a remote marketplace for live interactive
experiences. Which one a build serves is decided by `NEXT_PUBLIC_CLIENT`.

## Commands

```bash
npm run dev                                   # default client (teen-edge)
NEXT_PUBLIC_CLIENT=experience-demo npm run dev
npm run typecheck                             # tsc --noEmit
npm run lint                                  # eslint (next lint)
npm test                                      # vitest
npm run verify                                # typecheck + lint + test + build
npm run new-client -- <slug> "Name" [--preset <preset>]
node scripts/generate-demo-assets.mjs         # regenerate demo SVG artwork

npm run db:generate                           # drizzle-kit: schema -> SQL migration
npm run db:migrate                            # apply migrations (MIGRATION_DATABASE_URL)
npm run db:seed                               # load demo data into Postgres
npm run db:studio                             # drizzle-kit studio
```

The `db:*` scripts need a connection string; everything else runs credential-free.

Before calling work done, run `npm run verify`, and build the marketplace client
too — a config-validation failure only surfaces for the client being built:

```bash
NEXT_PUBLIC_CLIENT=experience-demo npm run build
```

## Architecture rules

**1. Never hardcode brand-specific behavior in shared modules.**
No client name, demo copy, or `if (slug === "…")` in `src/`. Everything
client-specific comes from config. Generic UI labels ("Most popular", "Sold out")
are fine.

**2. Never hardcode marketplace nouns.**
Use `client.terms.provider()`, `.customer()`, `.listing()`, `.occurrence()`,
`.groupBooking()` — each accepts `{ plural: true, lower: true }`. Writing "Host"
or "Experience" as user-visible text breaks every non-marketplace client.

**3. Static config holds configuration; repositories hold business records.**
`clients/<slug>/*` may contain brand, theme, copy, terminology, modules, policies.
It must NOT contain experiences, bookings, users, reviews, or ledger entries.
Those live behind `src/data/repositories.ts`.

**4. Capabilities are the source of truth, not presets.**
Gate behavior on `client.has("sessions.live")`, never on
`product.preset === "interactive-experiences"`. Presets only seed defaults.

**5. Vendor SDKs stay behind provider interfaces.**
Nothing outside `src/providers/<vendor>/` may import Stripe, LiveKit, Daily,
Zoom, Supabase, or similar. Domain and UI depend on the interfaces in
`src/providers/types.ts`.

**6. Money is `{ amountMinor, currency }`.**
Integer minor units everywhere. Never a formatted string, never a float.
Formatting happens only in `src/lib/format.ts` and presentation helpers.

**7. Public and private identity are separate types.**
`toPublicProfile()` in `src/domain/identity.ts` is the ONLY sanctioned conversion.
Never build a public view by spreading a `UserPrivate`. Never let
`legalLastName`, `email`, `phone`, `payoutAccountRef`, `addressLine`, or
`governmentIdRef` reach a view model, a client component, or a log line.

**8. Route guards are not authorization.**
`requireCapability()` says what the product offers, not who may see it. Anything
sensitive needs an additional server-side check against the viewer.

**9. State changes go through the state machines.**
Use `bookingMachine` / `sessionMachine` / `incidentMachine` rather than assigning
a status directly, so invalid transitions are rejected in one place.

**10. Server components by default.**
Add `"use client"` only where interaction genuinely requires it. Section
renderers are async *functions* returning nodes (see `src/sections/types.ts`),
not components.

**11. Shared runtime singletons are pinned to `globalThis`.**
`getRepositories()` and `getProviders()` use `Symbol.for` keys because Next.js
compiles routes into separate bundles — a module-scoped `let` gives each route
its own store, and state silently stops being shared.

**12. Two data adapters, selected by `DATABASE_URL`.**
Unset -> in-memory; set -> Postgres/Drizzle. Both must satisfy the same
interfaces in `src/data/repositories.ts`, so a change to one usually needs the
other. Every repository method takes `tenantId` and every query must filter on
it — a missing tenant predicate is a cross-client data leak, not a slow query.
When you change a domain union that has a `pgEnum`, update
`src/data/postgres/schema.ts` and run `npm run db:generate`; `schema.test.ts`
fails if they drift.

## Product invariants (do not break these)

- **Guaranteed compensation must never depend on a star rating.** Only the
  discretionary bonus may respond to feedback, and it stays pending human review.
  If you add a code path where a rating influences base pay, that is a bug.
- **Never claim recording is prevented, blocked, impossible, or detected.** It is
  prohibited by policy and attributable via watermark. Do not add fake detection.
  Do not record sessions secretly. Watermarks carry a pseudonymous display name
  and booking code only.
- **Never use the word "escrow"** unless it legally and technically is escrow.
- **Nothing is auto-adjudicated.** Disputes produce suggested defaults for a human.
  Risk signals are indicators, not proof of misconduct.
- **Remote-only.** In-person delivery is modeled but validation rejects enabling
  it. Do not build maps, exact-location sharing, or physical-event logistics.
- **Demo adapters must never look real.** Mock references are prefixed `demo_`,
  and demo mode is disclosed in the UI.

## Adding things

**A new section:** register it in `src/sections/registry.tsx` and name it in a
client's `pages.home.sections`. Do not edit `src/app/page.tsx`.

**A new module:** add it to `MODULES` in `src/modules/registry.ts` with its
capabilities, dependencies, nav and admin contributions.

**A new config rule:** add it to `crossFieldProblems()` in `src/config/schema.ts`
with a message that names the fix, and cover it in `src/config/config.test.ts`.

**A new client:** use `npm run new-client`. Do not hand-edit
`src/config/active.ts` unless the script's anchors have moved.

**A live provider:** implement the interface under `src/providers/<vendor>/` and
register it in `src/providers/index.ts`. Auth resolves `"supabase"` to a live
adapter; commerce, session, media and messaging still *throw* for any non-demo
provider rather than silently falling back to mocks — keep that behavior.

## Testing

Tests live beside the code (`*.test.ts`) and run under Vitest in a node
environment. New work should cover:

- config validation and module dependency rules
- money arithmetic and ledger generation
- state-machine transitions, valid and invalid
- that public serialization leaks no private identity
- anti-circumvention detection, **including false-positive cases** — wrongly
  blocking an innocent message is the expensive failure mode here

## Style

- TypeScript strict. No `any`, no `@ts-ignore`, no file-scope `eslint-disable`,
  no unsafe assertions, no placeholder functions that silently return success.
- Use theme tokens only (`bg-primary`, `text-fg`, `text-muted`, `border-border`,
  `rounded-theme`, `font-heading`). Never raw Tailwind palette colors.
- Components must be responsive, keyboard accessible, labeled, and usable without
  hover. Wide content scrolls inside its own `overflow-x-auto` container.
- Comment the *why*, not the *what*. Match the density of surrounding files.
- Be honest in user-facing copy about what is simulated. If something isn't
  implemented, say so rather than shipping a convincing placeholder.
