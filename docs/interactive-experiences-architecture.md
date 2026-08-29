# Interactive Experiences — Architecture Reference

Deep reference for how the codebase is put together. For the change log of what
landed in the marketplace pass, see
[interactive-experiences-implementation.md](./interactive-experiences-implementation.md).
For the integration seam and what is mocked, see
[provider-integrations.md](./provider-integrations.md). For identity, recording
policy, moderation and dispute handling, see
[trust-and-safety.md](./trust-and-safety.md).

Scope note: this document describes what is in the repository. Where something is
modeled but not built, it says so.

---

## 1. Layers and dependency direction

```
clients/<slug>/client.ts        static per-brand configuration (no business records)
        │
        ▼
src/config/                     ClientConfig type, presets, Zod validation, registry
src/modules/registry.ts         modules → capabilities, dependencies, nav, sections
        │
        ▼
src/sections/  src/components/  presentation; reads terminology + capabilities
        │
        ▼
src/domain/                     framework-free types, state machines, money, risk
        │
        ▼
src/data/     src/providers/    repository + provider interfaces, demo adapters
```

Rules that hold in the current tree:

- `src/domain/*` imports nothing from React, Next.js, or any vendor SDK. It is
  plain TypeScript.
- No file outside `src/providers/<vendor>/` imports a vendor SDK. Today no vendor
  SDK is installed at all — `package.json` dependencies are `next`, `react`,
  `react-dom`, `zod`.
- UI reads `ResolvedClient` (`src/config/resolve.ts`), never raw config plumbing,
  so a capability check has exactly one shape: `client.has("sessions.live")`.
- `src/config/active.ts` is the single place `process.env.NEXT_PUBLIC_CLIENT` is
  read. The only other `process.env` reads in the app are `NODE_ENV` guards in
  `src/sections/PageRenderer.tsx` and `src/app/api/lead/route.ts`.

---

## 2. `ClientConfig`

`src/config/client-config.ts` defines the canonical shape, grouped into six
concerns:

| Group | Holds | Key file |
|---|---|---|
| `site` | brand, theme, contact, nav, SEO, marketing section copy | `src/config/types.ts` (`Brand`, `ThemeConfig`, `Sections`) |
| `product` | preset, terminology, ISO-4217 `currency`, optional `timezone` | `src/config/terminology.ts` |
| `pages` | `home.sections`: an ordered list of `{ id, options? }` | `src/sections/registry.tsx` |
| `modules` | `ModuleId[]` — which feature modules are on | `src/modules/registry.ts` |
| `policies` | `compensation`, `identity`, `recording`, `moderation`, `marketplace` | `src/domain/ledger.ts`, `src/domain/identity.ts` |
| `integrations` | provider selection per family, plus `formEndpoint` / `analytics` / `bookingEmbedUrl` | `src/providers/index.ts` |

### The hard rule

> Static config holds **configuration**. Mutable business records live in
> **repositories**.

Experiences, occurrences, hosts, bookings, reviews, incidents and ledger entries
are runtime data and live behind `src/data/repositories.ts` — never in
`clients/*`. The demo's records are in `src/data/seed/*`, loaded by the in-memory
adapter. `clients/experience-demo/client.ts` restates this in a comment because it
is the rule most likely to be broken by someone adding "just one" listing to a
config file. A client config is safe to commit; a booking is not.

---

## 3. Module registry

`src/modules/registry.ts`. A module declares what it **provides** (capabilities),
what it **requires** (other modules), and what it contributes to the shell (nav
links, section ids, admin surfaces).

| `ModuleId` | Provides | Requires | Contributes |
|---|---|---|---|
| `marketing` | `marketing.sections` | — | sections: hero, services, about, testimonials, pricing, faq, cta, contact |
| `booking` | `booking.appointments` | — | section: booking |
| `marketplace` | `marketplace.listings`, `marketplace.hosts` | `discovery`, `scheduling`, `commerce` | nav: Discover, Become a *provider*; 10 marketplace sections; admin: Experiences, Upcoming sessions |
| `discovery` | `discovery.browse`, `discovery.intents` | — | sections: intentFilters, liveTonight |
| `scheduling` | `scheduling.occurrences`, `scheduling.capacity` | — | — |
| `sessions` | `sessions.live`, `sessions.lobby` | — | — |
| `commerce` | `commerce.checkout`, `commerce.tips`, `commerce.ledger` | — | admin: Earnings |
| `messaging` | `messaging.threads` | — | — |
| `reputation` | `reputation.reviews` | — | — |
| `trust-safety` | `trust.reporting`, `trust.watermarking`, `trust.moderation` | — | section: trustAndSafety; admin: Incident queue |
| `content` | `content.library`, `content.live` | — | `foundationOnly: true` — scaffolding, no UI |
| `community` | `community.forum` | — | `foundationOnly: true` — scaffolding, no UI |

`marketplace` is currently the only module with dependencies.

**Capabilities, not presets, are the source of truth.** `resolveCapabilities()`
unions the `provides` of every enabled module; every gate in the app — route
guards, nav contributions, admin surfaces, config cross-field rules — asks the
capability set, never the preset name. A client can start from a preset and then
add or remove modules freely without any of those gates going stale.

`validateModuleDependencies()` deliberately does **not** auto-add missing
dependencies. It throws `ModuleDependencyError` naming the module and the fix, so
a config states plainly what it runs rather than acquiring modules invisibly.

Nav contributions carry `label: (t: Terms) => string` rather than a literal, which
is why "Become a Host" is really `` (t) => `Become a ${t.provider({ lower: true })}` ``.
A client can suppress a contributed link by declaring its own link with the same
`href` — `resolveClient()` filters module links against the client's hrefs.

---

## 4. Presets

`src/config/presets.ts`. A preset is a documented starting point: default modules,
terminology, policies and a home composition. Three exist:

| Preset | Modules | Terminology | Policies | Home |
|---|---|---|---|---|
| `marketing` | `marketing` | `DEFAULT_TERMINOLOGY` (Provider / Customer / Offering) | none | hero, services, about, testimonials, pricing, faq, cta |
| `appointments` | `marketing`, `booking` | `APPOINTMENTS_TERMINOLOGY` (Practitioner / Client / Service) | none | the marketing sections plus `booking` |
| `interactive-experiences` | `marketing`, `marketplace`, `discovery`, `scheduling`, `sessions`, `commerce`, `messaging`, `reputation`, `trust-safety` | `MARKETPLACE_TERMINOLOGY` (Host / Guest / Experience / Session / Crowdshared) | `DEFAULT_COMPENSATION_POLICY`, identity, recording, moderation, marketplace | 10 marketplace sections |

The `interactive-experiences` preset sets `deliveryModes: ["remote"]`,
`bookingModes: ["one_to_one", "private_group", "crowdshared"]`,
`maxCrowdsharedSeats: 100`, `platformRecordingEnabled: false`,
`watermarkEnabled: true`, `watermarkMoveIntervalSeconds: 20`, and an `inPerson`
block that is disabled.

**No runtime code merges preset defaults into a config.** `resolveClient()` does
not consult `PRESETS`; a client config must state its own modules, policies and
page composition in full, which is why `clients/experience-demo/client.ts` repeats
what the `interactive-experiences` preset lists. The only runtime import from
`presets.ts` is `PRESET_IDS`, used by the Zod enum for `product.preset`.

`getPreset()` exists for tooling but has no
runtime callers in `src/`; `scripts/new-client.mjs` scaffolds from its own preset
table in `scripts/new-client-lib.mjs` rather than importing the TypeScript one.
Nothing at runtime re-derives behavior from `product.preset` other than one
validation rule (§5, rules 6–7) — a resolved config's `modules` array stands on
its own.

---

## 5. Config validation

`src/config/schema.ts`. Two stages, run at module load inside
`resolveClient()` — so an invalid config fails during `next build` rather than on
a user's request. `ClientConfigError` collects **all** problems from a stage so
one run surfaces them together.

**Stage 1 — structural (Zod).** `clientConfigSchema` covers slug format
(lowercase kebab-case), brand/theme/nav/SEO shape, terminology term pairs, a
3-character currency, a non-empty `pages.home.sections`, at least one module drawn
from `ALL_MODULE_IDS`, and the policy sub-objects. Basis-point fields are integers
in `0…10000`. `policies.marketplace.inPerson.enabled` is typed
`z.literal(false)` and `approximateLocationOnly` is `z.literal(true)`.

**Stage 2 — module dependencies.** `validateModuleDependencies()` (see §3).

**Stage 3 — cross-field product coherence.** These are the checks structural
typing cannot express, implemented in `crossFieldProblems()`:

| # | Rule | Failure message points at |
|---|---|---|
| 1 | `marketplace` module + `deliveryModes` includes `"remote"` ⇒ requires `sessions.live` | add the `sessions` module, or drop `remote` |
| 2 | `bookingModes` includes `"crowdshared"` ⇒ requires `scheduling.capacity` | add the `scheduling` module |
| 3 | `bookingModes` includes `"crowdshared"` ⇒ requires `commerce.checkout` | add the `commerce` module |
| 4 | `bookingModes` includes `"crowdshared"` ⇒ `maxCrowdsharedSeats` must be set | bound the occurrence capacity |
| 5 | `compensation.tipsEnabled` ⇒ requires `commerce.tips` | add the `commerce` module |
| 6 | preset `interactive-experiences` ⇒ terminology must not be the generic defaults (`provider.singular === "Provider"`, `customer.singular === "Customer"`, or `listing.singular === "Offering"`) | define marketplace terminology |
| 7 | preset `interactive-experiences` ⇒ `policies.marketplace` must be defined | add the block |
| 8 | `deliveryModes` includes `"in_person"` ⇒ **always a failure** | in-person is modeled, not implemented |
| 9 | `guaranteedShareBps + maxPerformanceBonusBps + platformFeeBps + processingAllocationBps > 10000` ⇒ failure | allocations exceed the guest price |
| 10 | `recording.watermarkEnabled` ⇒ requires `trust.watermarking` | enable `trust-safety` |
| 11 | `moderation.reportingEnabled` ⇒ requires `trust.reporting` | enable `trust-safety` |

Rule 8 is the one worth remembering: enabling in-person delivery does not degrade
gracefully, it refuses to boot. That is deliberate — location handling, safety
review and logistics do not exist, and a half-built in-person flow is worse than
none.

---

## 6. Page composition and the section registry

Page composition is data. `pages.home.sections` is an ordered list of
`{ id, options? }`; `src/sections/registry.tsx` maps ids to renderers; and
`src/sections/PageRenderer.tsx` walks the list. Adding a section means registering
it and naming it in a composition — no page file changes.

Unknown ids warn in development (`NODE_ENV !== "production"`) and are skipped,
rather than crashing a live site over a typo.

Marketing renderers read `client.config.site.sections?.<key>` and return `null`
when the content is absent, so a composition may safely list a section the client
did not fill in.

### Why renderers are async functions, not components

`src/sections/types.ts`:

```ts
export type SectionRenderer = (ctx: SectionContext) => Promise<ReactNode> | ReactNode;
```

Each section owns its own data query — the "live tonight" rail asks the repository
for upcoming occurrences itself, rather than a page assembling every query and
prop-drilling. Expressing that as async *server components* runs into the
async-component JSX typing friction in React 18's type definitions. Expressing it
as an async **function returning a node** sidesteps that: `PageRenderer` does
`await Promise.all(...)` over the compositions's renderers and renders the
resulting nodes inside `Fragment`s.

The second benefit is opt-out. Returning `null` is how a section removes itself —
a rail with nothing scheduled disappears instead of rendering an empty shell.

---

## 7. Domain model

`src/domain/` is framework-free. Branded ids (`src/domain/ids.ts`) make passing a
`BookingId` where an `ExperienceId` is expected a compile error while keeping the
runtime representation a plain string.

### Experience vs ExperienceOccurrence

`src/domain/experience.ts`.

- **`Experience`** — the reusable offering: title, tagline, description, category
  and secondary categories, booking/delivery modes, duration, pricing, samples,
  cover, `whatToExpect`, languages, discovery intents, `status`
  (`draft | published | paused`).
- **`ExperienceOccurrence`** — one scheduled instance: `startsAt` (ISO-8601 UTC),
  `timezone`, a single `bookingMode` and `deliveryMode`, `capacity`,
  `seatsBooked`, optional `pricePerSeat`, `status`
  (`scheduled | sold_out | cancelled | completed`).

Capacity and seat inventory live on the occurrence, never on the experience.
Collapsing the two would force one row per listing per night and make crowdshared
events, recurring sessions and per-seat inventory inexpressible.

`resolveSeatPrice()` falls back from the occurrence's `pricePerSeat` to the
experience's per-mode pricing (`perSeat` / `privateGroup` / `oneToOne`).

### Booking modes

| Mode | Meaning |
|---|---|
| `one_to_one` | a single guest with the host |
| `private_group` | one buyer brings their own group; seats are not sold to strangers |
| `crowdshared` | multiple unrelated guests independently buy seats |

### Delivery modes

`DeliveryMode = "remote" | "in_person"`. **Remote only** is what exists.
`in_person` is present in the type union and in
`policies.marketplace.inPerson` (`enabled: false`,
`approximateLocationOnly: true`, `exactLocationDisclosureMinutesBefore`) so the
future shape is written down — and config validation rejects any client that puts
`"in_person"` in `deliveryModes` (§5, rule 8).

### Discovery

`ExperienceCategory` has 11 values, with `storytelling` first-class rather than a
subcategory of "other". `DiscoveryIntent` is deliberately mood/occasion shaped
rather than taxonomy shaped: `live_tonight`, `learn_something_new`,
`great_with_friends`, `join_a_small_crowd`, `one_to_one`,
`interactive_performance`, `under_price`.

### State machines

`src/domain/state-machine.ts` encodes allowed edges once; `transition()` throws
`InvalidTransitionError` naming the machine, the edge and the legal alternatives.

**Booking** (`src/domain/booking.ts`):

| From | To |
|---|---|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `completed`, `cancelled`, `disputed` |
| `completed` | `disputed` |
| `disputed` | `refunded`, `completed` |
| `cancelled` | `refunded` |
| `refunded` | *(terminal)* |

`completed` is non-terminal on purpose: most disputes surface after the session
ends.

**Session** (`src/domain/session.ts`):

| From | To |
|---|---|
| `scheduled` | `lobby_open`, `cancelled_by_host`, `cancelled_by_guest` |
| `lobby_open` | `live`, `cancelled_by_host`, `cancelled_by_guest`, `technical_failure` |
| `live` | `completed`, `interrupted_by_host`, `interrupted_by_guest`, `technical_failure` |
| `completed` | `under_review` |
| `interrupted_by_host` / `interrupted_by_guest` / `technical_failure` | `under_review`, `resolved` |
| `cancelled_by_host` / `cancelled_by_guest` | `under_review`, `resolved` |
| `under_review` | `resolved` |
| `resolved` | *(terminal)* |

The status union distinguishes *who* interrupted and *why* it ended because those
distinctions drive compensation and dispute defaults. A boolean `ended` flag could
not separate a host no-show from a guest walkout from a network failure — three
cases with three different financial outcomes.

**Incident** (`src/domain/incident.ts`):

| From | To |
|---|---|
| `submitted` | `triaged`, `dismissed` |
| `triaged` | `investigating`, `dismissed`, `resolved` |
| `investigating` | `resolved`, `dismissed` |
| `resolved` | `appealed` |
| `dismissed` | `appealed` |
| `appealed` | `investigating`, `resolved`, `dismissed` |

### Money

`src/domain/money.ts`. `Money = { amountMinor: number; currency: string }` —
integer minor units only. `money()` throws on a non-integer, pointing the caller
at `Math.round()` at the boundary. `add`/`subtract`/`sum`/`compare` assert
matching currency and throw `CurrencyMismatchError` otherwise. `percentOf()` takes
basis points to avoid the float drift of `amount * 0.175`. `allocate()` splits an
amount into parts that sum exactly to the original, distributing remainder minor
units to the earliest shares. `formatMoney` / `formatMoneyCompact` are strictly
presentational — never store or compare their output.

---

## 8. Ledger and compensation

`src/domain/ledger.ts`. Money is recorded as discrete, signed entries rather than
one "payout" number, so a tip, bonus, dispute or partial refund is an additional
entry with its own timestamp and memo and the history stays reconstructible.

**Entry types:** `guest_charge`, `host_guaranteed_compensation`,
`performance_bonus`, `platform_fee`, `processing_allocation`, `tip`, `refund`,
`cancellation_compensation`, `dispute_hold`, `adjustment`.

**Entry statuses:** `pending` (recorded, not releasable yet), `released` (cleared
for settlement), `held` (frozen by a dispute, needs a human), `reversed` (undone
by a later corrective entry).

**`CompensationPolicy`** is per client, in basis points.
`DEFAULT_COMPENSATION_POLICY`: `guaranteedShareBps: 7000`,
`maxPerformanceBonusBps: 1000`, `platformFeeBps: 1500`,
`processingAllocationBps: 300`, `tipsEnabled: true`,
`lateCancellationCompensationBps: 5000`, `cancellationWindowHours: 24`.

`entriesForPurchase()` records the guest charge, platform fee and processing
allocation as `released`, and the host's guaranteed compensation as `pending`
because the session has not happened yet.

`entriesForSessionOutcome()` maps a terminal `SessionStatus` to entries:

| Session status | Entry | Status |
|---|---|---|
| `completed` | `host_guaranteed_compensation` marker recording release | `released` |
| `cancelled_by_guest` | `cancellation_compensation` at `lateCancellationCompensationBps` | `pending` |
| `cancelled_by_host` | `refund` of the full guest price | `pending` |
| `technical_failure`, `interrupted_by_guest`, `interrupted_by_host` | `dispute_hold` at `guaranteedShareBps` | `held` |

Implementation detail worth knowing before you build on it: the `completed` branch
appends a **zero-amount** `host_guaranteed_compensation` entry with status
`released` as a marker, rather than flipping the `pending` entry created at
purchase. `summarizeHostEarnings()` sums by status, so the guaranteed amount stays
in the `pending` bucket. A real backend would settle the original entry (or write
an explicit reversing pair); this is a demo-adapter shortcut, not a modeled rule.

### The invariant

> **Guaranteed host compensation does not depend on the guest's star rating.**

No branch anywhere in `entriesForSessionOutcome()` — or anywhere else in the
ledger — reads a rating. Ordinary dissatisfaction reduces the discretionary bonus,
never the base. `recommendBonus()` in `src/domain/review.ts` is the only place a
rating influences money, it returns a **recommendation** carrying
`pendingHumanReview: true`, and `POST /api/reviews` records the resulting
`performance_bonus` entry as `pending`. See
[trust-and-safety.md](./trust-and-safety.md#8-compensation-fairness).

`summarizeHostEarnings()` buckets host-credit entry types
(`host_guaranteed_compensation`, `performance_bonus`, `tip`,
`cancellation_compensation`, `adjustment`) by status, excluding `reversed`.
`bookingNet()` gives the net position for one booking, used by dispute review.

---

## 9. Backward compatibility

`src/config/normalize.ts` adapts legacy `SiteConfig` (v0.1) to `ClientConfig`
(v0.2) at load time. `isLegacySiteConfig()` distinguishes the shapes without a
version field: a legacy config has `brand` at the top level and no `site`.

`normalizeLegacyConfig()`:

- picks preset `appointments` when `modules.booking.enabled`, else `marketing`,
  and the matching terminology;
- derives `pages.home.sections` from whichever marketing sections the legacy
  config actually defined, preserving the original render order (hero → services →
  about → testimonials → pricing → faq → booking → cta);
- derives `modules` as `["marketing"]` plus `booking` / `content` / `community`
  where each was enabled;
- sets `currency: "USD"` and carries `modules.booking.timezone`;
- maps `integrations.formEndpoint`, `integrations.analytics` and
  `modules.booking.embed.url` → `integrations.bookingEmbedUrl`;
- sets **`policies: {}`**.

That empty policies object is the point. Legacy clients gain no marketplace,
compensation, identity, recording or moderation policy, no marketplace modules,
and therefore no marketplace capabilities — so no marketplace nav links are
contributed and every marketplace route 404s for them. `template`, `teen-edge`,
`mentor-academy` and `collective` require zero source changes and render exactly
as before. New clients should author `ClientConfig` directly; see
`clients/experience-demo/client.ts`.

---

## 10. Routing and capability guards

Next.js App Router route files are static — they cannot be generated per client at
runtime. So every marketplace route file exists in every build, and
`src/lib/guard.ts` makes them behave correctly for a client without a
marketplace:

```ts
export function requireCapability(...capabilities: CapabilityId[]): void {
  if (!client.has(...capabilities)) notFound();
}
```

The route resolves, finds the capability missing, and 404s. `hasCapability()` is
the non-throwing variant for conditional rendering inside a shared page.

Guards in place today:

| Route | Required capabilities |
|---|---|
| `/discover` | `discovery.browse`, `marketplace.listings` |
| `/experiences/[slug]` | `marketplace.listings` |
| `/events/[occurrenceId]` | `scheduling.occurrences`, `marketplace.listings` |
| `/hosts/[handle]`, `/become-a-host` | `marketplace.hosts` |
| `/bookings`, `/bookings/[code]` | `commerce.checkout` |
| `/lobby/[code]` | `sessions.lobby` |
| `/session/[code]` | `sessions.live` |
| `/feedback/[code]` | `reputation.reviews` |
| `/host`, `/host/experiences`, `/host/experiences/new` | `marketplace.listings` |
| `/host/sessions` | `scheduling.occurrences` |
| `/host/earnings` | `commerce.ledger` |
| `/ops/incidents`, `/ops/incidents/[incidentId]` | `trust.reporting` |

**This is a routing guard, not an authorization boundary.** A capability check
says what the *product* offers, not who may see a given record. Anything genuinely
sensitive must additionally be enforced server-side against the viewer's identity.
The API routes do both: `POST /api/sessions/accept-policies` and
`POST /api/reviews` check the capability, then re-check that the viewer is the
booking's guest and return 403 otherwise. `/session/[code]` re-checks
`booking.policiesAcceptedAt` server-side, because a guest can navigate straight to
that URL and a client-side gate would be no gate at all.

The demo's auth provider returns a seeded persona, so those viewer checks are only
as strong as the demo adapter behind them — see
[provider-integrations.md](./provider-integrations.md#1-auth).

---

## 11. Tenant scoping

Every repository method in `src/data/repositories.ts` takes a `TenantId`, and
every query in the in-memory adapter filters on it — mirroring the row-level
isolation a real backend must enforce. `src/data/index.ts` exports
`CURRENT_TENANT` (the demo's `DEMO_TENANT`, `"experience-demo"`), which pages and
API routes pass into every call. `TenantId` also appears on `UserPrivate`,
`HostProfile`, `Experience`, `ExperienceOccurrence`, `Booking`, `Conversation`,
`Incident`, `RiskSignal`, `Review` and `LedgerEntry`, and in the provider
interfaces (`ChargeIntent`, `RefundIntent`, `CreateRoomArgs`).

One deployment serves one client today, so this buys nothing immediately. It is
carried anyway because retrofitting a tenant column onto a live multi-brand
backend is a destructive migration, and adding it now costs a parameter.

---

## 12. Where the seams are

| Seam | Interface file | Only implementation today |
|---|---|---|
| Third-party services | `src/providers/types.ts` | `src/providers/demo/index.ts` |
| Mutable records | `src/data/repositories.ts` | `src/data/memory/index.ts` |

Both are covered in detail in
[provider-integrations.md](./provider-integrations.md). The short version:
`src/providers/index.ts` throws if a client asks for anything other than `"demo"`,
and `src/data/index.ts` returns a process-lifetime in-memory store. No database
dependency has been added and no vendor SDK is installed.
