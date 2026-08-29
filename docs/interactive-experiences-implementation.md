# Interactive Experiences — Implementation Plan

Status: implemented in this pass unless explicitly marked otherwise.

## 1. Current architecture (before this change)

A lightweight, config-driven Next.js 14 App Router template:

- `src/config/types.ts` — a single `SiteConfig` type mixing brand, theme, marketing
  section copy, three optional feature `modules` (booking/content/community), and
  integrations.
- `src/config/active.ts` — a hand-maintained registry; `NEXT_PUBLIC_CLIENT` selects
  one client per deployment.
- `src/theme/theme.ts` — maps a client's theme to CSS custom properties consumed by
  Tailwind utilities.
- `src/app/page.tsx` — **hardcoded** assembly of `Header` + `Hero` + `Footer`.
- `clients/*/config.ts` — four clients (`_template`, `teen-edge`, `mentor-academy`,
  `collective`). The `modules` blocks were declarative intent only; nothing consumed
  them.
- No runtime validation, no tests, no lint config, no domain layer, no data layer.

Constraints observed: money appeared as display strings (`"$60"`), business records
(services, tiers) lived inside static client config, and there was no separation
between public and private identity because there were no users at all.

## 2. Proposed architecture

Five layers, each depending only on the ones above it:

```
clients/<slug>/client.ts      static, per-brand configuration (no mutable records)
        │
src/config/                   ClientConfig type, presets, Zod validation, registry
src/modules/                  module registry: capabilities, dependencies, nav, sections
        │
src/sections/ + components/   presentation; reads terminology + config, never vendors
        │
src/domain/                   framework-free types, state machines, money, risk
src/data/                     repository interfaces + in-memory demo adapters
src/providers/                Auth/Commerce/Session/Media/Messaging interfaces + demo adapters
```

Key decisions:

- **`ClientConfig` replaces `SiteConfig` as the canonical shape**, grouped into
  `site` / `product` / `pages` / `modules` / `policies` / `integrations`.
  `SiteConfig` is retained and adapted at load time (`normalizeLegacyConfig`), so the
  four existing clients keep working unmodified.
- **Capabilities are the source of truth**; presets (`marketing`, `appointments`,
  `interactive-experiences`) only supply defaults.
- **Routes are static.** Next.js App Router cannot generate route files at runtime, so
  marketplace routes exist physically and call `notFound()` when the active client
  lacks the required capability.
- **Terminology is configurable** (`host`/`guest`/`experience`/`session`/`crowdshared`),
  and shared components read it rather than hardcoding marketplace nouns.
- **Money is `{ amountMinor, currency }`** everywhere; formatting is a presentation
  concern only.
- **Public and private identity are separate types**, with a serializer that is the
  only sanctioned path from private to public.

## 3. Important invariants

1. One codebase, many clients; one deployment per client via `NEXT_PUBLIC_CLIENT`.
2. Shared components never hardcode a brand name, demo copy, or marketplace noun.
3. A client without marketplace capabilities exposes no marketplace nav and its
   marketplace routes 404.
4. Static config holds brand/terminology/policy; **mutable business records live in
   repositories**, never in `clients/*`.
5. Vendor SDKs stay behind provider interfaces; domain and UI never import them.
6. `PublicProfile` must never carry legal surname, email, phone, payout, address, or
   government ID.
7. Money is integer minor units.
8. Security-sensitive behavior is not enforced by client-side checks alone.
9. Invalid config combinations fail fast at load with descriptive errors.

## 4. Implemented in this pass

- Config refactor + Zod validation + three presets + legacy adapter.
- Module registry with capability dependency resolution and nav contributions.
- Page/section registry driving homepage composition (`marketing`, `marketplace`).
- Domain model: identity, experience, occurrence, booking, session, incident, review,
  ledger, money, risk detection — with state-transition validation.
- Repository interfaces + in-memory seeded adapters (no database required).
- Provider interfaces + demo adapters for auth, commerce, session, media, messaging.
- `clients/experience-demo` — remote-only interactive-experiences client with 10 seeded
  experiences, storytelling as a first-class category, pseudonymous hosts.
- Marketplace UI: discovery, experience detail, host profile, occurrence/event page,
  booking → mock checkout → lobby → session shell (moving watermark) → feedback → tip.
- Host surfaces (experiences, sessions, earnings ledger) and an operations incident queue.
- Tiered compensation as ledger entries; guaranteed compensation independent of rating.
- Anti-circumvention text detection with progressive warn/block handling + tests.
- Vitest suite, ESLint config, `.env.example`, docs, `CLAUDE.md`.
- `new-client` scaffolding with `--preset` support.

## 5. Remains a production integration (intentionally mocked)

| Area | This pass | Production requirement |
|---|---|---|
| Payments | `DemoCommerceProvider`, in-memory ledger | Stripe (or similar) + Connect payouts, webhooks, tax |
| Live video | `DemoSessionProvider`, room shell, no real media | LiveKit/Daily/Twilio: tokens, TURN, recording policy enforcement |
| Auth | `DemoAuthProvider`, seeded viewer identities | Real IdP, sessions, CSRF, server-side authorization |
| Identity verification | Status field modeled only | KYC/ID vendor, document handling, retention policy |
| Persistence | In-memory repositories | Postgres/Supabase adapter, migrations, tenant isolation |
| Messaging | In-memory conversations | Durable store, rate limits, abuse tooling |
| Moderation ops | Incident queue with seeded data | Real queue, audit log, reviewer permissions, SLAs |

No mock is presented in the UI as a real transaction, real payout, or real recording
guarantee.

## 6. Migration impact on existing clients

**Zero source changes required.** `teen-edge`, `mentor-academy`, `collective`, and
`_template` remain valid `SiteConfig` files. At load they pass through
`normalizeLegacyConfig()`, which maps them onto `ClientConfig` with the `marketing`
preset, their existing modules, and a backward-compatible page composition
(`header → hero → …existing sections… → footer`). Their rendered output is unchanged,
they gain no marketplace navigation, and marketplace routes 404 for them.

New clients should author the `ClientConfig` shape directly (see
`clients/experience-demo/client.ts`).
