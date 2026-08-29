# Provider Integrations

The boundary between this application and anything third-party. Interfaces live in
`src/providers/types.ts`; the only implementations that exist are the demo
adapters in `src/providers/demo/index.ts`.

Related: [interactive-experiences-architecture.md](./interactive-experiences-architecture.md)
for the layer model, [trust-and-safety.md](./trust-and-safety.md) for the safety
behavior these adapters do and do not support, and
[interactive-experiences-implementation.md](./interactive-experiences-implementation.md)
for what landed in the marketplace pass.

---

## 0. Ground rules

**No vendor SDK may be imported outside `src/providers/<vendor>/`.** Domain code
(`src/domain`), data code (`src/data`), sections and components depend on the
interface only. This is what makes swapping Daily for LiveKit a change to one
directory rather than a search-and-replace across the tree. Today the rule is
trivially satisfied: no vendor SDK is installed at all — `package.json`
dependencies are `next`, `react`, `react-dom`, `zod`.

**Selection fails loudly.** `src/providers/index.ts` reads the active client's
`integrations` block, collects every provider value that is not `"demo"`, and
**throws** if the list is non-empty:

```
Client "<slug>" requests live provider(s) [stripe, livekit], but no live adapter
is implemented yet. Set these to "demo" in the client's integrations block, or
implement the adapter under src/providers/<vendor>/ following
docs/provider-integrations.md.
```

It does not silently fall back to mocks. A production deployment that thinks it is
charging cards and is not is a far worse failure than a build that refuses to
start. `isDemoMode()` reports whether every active provider is a credential-free
mock; the UI uses it to label demo behavior.

**Every provider declares its own mode.** `ProviderInfo` carries
`{ name, mode: "demo" | "live", notice? }`. Demo references are prefixed `demo_`
(`demo_charge_1`, `demo_room_4`, `demo_token_7`) so a mock value is recognizable
anywhere it surfaces — logs, UI, tests.

---

## 1. Auth

### Interface

```ts
type Viewer = {
  userId: UserId;
  displayName: string;
  handle: string;
  roles: ("guest" | "host" | "moderator" | "admin")[];
};

interface AuthProvider {
  readonly info: ProviderInfo;
  getViewer(): Promise<Viewer | null>;
  listDemoViewers?(): Promise<Viewer[]>;   // demo-only affordance
}
```

### What the demo adapter does

`DemoAuthProvider` looks a viewer id up in the seeded array `DEMO_VIEWERS`
(`src/data/seed/viewers.ts`) and returns it, defaulting to the first entry. It
never returns `null`. `listDemoViewers()` returns the whole seeded list so the UI
can offer persona switching.

There is **no authentication**: no credential check, no session cookie, no token,
no CSRF protection, no server-side authorization. Its own notice says so —
`"Seeded personas only — no real authentication, sessions, or authorization."`

This matters for reading the rest of the codebase. API routes such as
`POST /api/reviews` and `POST /api/sessions/accept-policies` compare
`viewer.userId` to `booking.guestUserId` and return 403 on a mismatch. That
comparison is written correctly, but behind the demo adapter the "viewer" is
whichever seeded persona is configured — so those checks demonstrate the shape of
an authorization check without providing one.

### What a production adapter must implement

- A real identity provider, with sign-in, sign-out and account recovery.
- Server-side sessions. `getViewer()` must resolve from a request-scoped,
  server-verified session — never from a client-supplied id, header or query
  parameter.
- CSRF protection on every mutating route, and same-site/secure cookie settings.
- Real role assignment. `roles` currently comes from seed data; `moderator` and
  `admin` must be granted by a system of record, and `/ops/*` must check them
  server-side rather than relying on the `trust.reporting` capability guard, which
  is a routing guard only.
- A decision about what a signed-out viewer sees. `getViewer()` returning `null`
  is currently an unexercised path.

---

## 2. Commerce

### Interface

```ts
interface CommerceProvider {
  readonly info: ProviderInfo;
  charge(intent: ChargeIntent): Promise<ChargeResult>;
  refund(intent: RefundIntent): Promise<ChargeResult>;
  scheduleHostCompensation(args: {
    tenantId: TenantId;
    bookingId: BookingId;
    hostUserId: UserId;
    amount: Money;
    kind: "guaranteed" | "bonus" | "tip" | "cancellation";
  }): Promise<ChargeResult>;
}
```

`ChargeIntent` = `{ tenantId, bookingId, amount: Money, description }`.
`RefundIntent` = `{ tenantId, bookingId, amount: Money, reason }`.
`ChargeResult` = `{ ok, reference, mode, message? }`.

The interface deliberately has no holding-account concept. Holding a balance in a
platform account is not the legal protection people assume it is, and naming it as
though it were would misrepresent what users actually have. `scheduleHostCompensation`
is explicit that it *records an intended payout*; settlement is out of scope.

### What the demo adapter does

`DemoCommerceProvider` returns `{ ok: true }` with a `demo_charge_*`,
`demo_refund_*` or `demo_payout_*` reference and a message that states plainly
that no funds moved. No card is charged, no refund is issued, no payout is
scheduled. Its notice: *"No real payment is processed. No card is charged and no
payout is made."*

The booking path (`src/domain/services/booking-service.ts` → `createBooking`)
writes the compensation ledger entries on the same call that creates the booking,
so the ledger cannot be forgotten by a new caller. `POST /api/bookings` re-derives
price, seat availability and mode legality from stored records rather than
trusting the request body — that part is real logic, it just settles against a
mock.

### What a production adapter must implement, and the gotchas

- **Webhooks are the source of truth, not the API response.** A `charge()` call
  returning `ok` means "accepted", not "settled". Payment state must be driven by
  provider webhooks (`payment_intent.succeeded`, `charge.refunded`, dispute
  events), which means a public, signature-verified webhook endpoint and a
  reconciliation path for events that arrive before the local record exists.
- **Idempotency on both sides.** Send an idempotency key derived from the booking
  so a retried `charge()` cannot double-charge, and make webhook handling
  idempotent — providers redeliver, and out of order. Ledger appends must be
  keyed so a redelivery does not append a second `guest_charge`.
- **Payouts are a separate product surface.** Paying hosts needs connected
  accounts, onboarding and identity/KYC collection at the provider, payout
  schedules, and handling for failed or returned payouts. `payoutAccountRef` on
  `UserPrivate` is a placeholder for the provider's account id — the routing
  identity itself stays at the PSP and must never be stored here.
- **Tax, currency and fees.** `product.currency` is a single ISO-4217 code per
  client, and `processingAllocationBps` is a flat placeholder rather than actual
  processor cost. Real processing fees vary by method and geography, and sales
  tax/VAT on a digital live service is jurisdiction-dependent.
- **Refunds and disputes.** Chargebacks arrive weeks later and must map onto
  ledger entries (`refund`, `dispute_hold`, `adjustment`) rather than mutating
  history. The `reversed` status exists for exactly this.
- **Never log full payment identifiers**, and keep card data entirely out of this
  application — the adapter should only ever see provider tokens.

---

## 3. Session (live video)

### Interface

```ts
interface SessionProvider {
  readonly info: ProviderInfo;
  createRoom(args: CreateRoomArgs): Promise<RoomHandle>;
  createParticipantAccess(args: {
    roomId: RoomId; userId: UserId; displayName: string; role: ParticipantRole;
  }): Promise<ParticipantAccess>;
  updateParticipantPermissions(args: {
    roomId: RoomId; userId: UserId; permissions: Partial<ParticipantPermissions>;
  }): Promise<void>;
  muteParticipant(args: { roomId: RoomId; userId: UserId }): Promise<void>;
  removeParticipant(args: { roomId: RoomId; userId: UserId }): Promise<void>;
  blockRejoin(args: { roomId: RoomId; userId: UserId }): Promise<void>;
  closeRoom(args: { roomId: RoomId }): Promise<void>;
}
```

`CreateRoomArgs` = `{ tenantId, occurrenceId?, bookingId?, capacity }`.
`RoomHandle` = `{ roomId, mode, joinTarget }`.
`ParticipantAccess` = `{ token, role, permissions, mode }`.

### What the demo adapter does

**`DemoSessionProvider` creates no room on any service, and there is no media
transport anywhere in this codebase.**

- `createRoom()` mints a `demo_room_*` id and returns `joinTarget:
  "/session/<id>"` — an in-app route, not a provider URL.
- `createParticipantAccess()` returns a `demo_token_*` string. It is a
  non-functional placeholder; it authenticates against nothing.
- `updateParticipantPermissions()`, `muteParticipant()`, `removeParticipant()`
  and `closeRoom()` are no-ops. The caller records the corresponding
  `SessionEvent`; the demo shell holds permission state in local component state.
- `blockRejoin()` is the one method with observable behavior: it records the pair
  in an in-process `Map`, readable via the non-interface helper
  `isRejoinBlocked()`.

Its notice: *"No real audio or video. The session shell demonstrates UI,
moderation and watermarking only."*

`src/components/marketplace/SessionRoom.tsx` says the same thing on screen rather
than rendering a fake video feed: the stage area reads *"Session shell — this demo
has no audio or video."* Everything around it — participant list, host moderation
controls, the moving watermark, the report menu, the leave button, the operational
log — is real UI operating on local state.

### What a production adapter must implement, and the gotchas

- **Token minting is server-side, always.** A participant token encodes room,
  identity, role and grants, and must be signed with the provider's API secret on
  the server. The secret cannot reach the browser, and the client must not be able
  to choose its own role or grants — `createParticipantAccess()` takes a `role`
  from the caller precisely so the server decides it.
- **TURN.** A meaningful share of participants sit behind symmetric NAT or
  restrictive corporate firewalls and cannot establish a peer connection over
  STUN alone. A production deployment needs TURN relays (usually including
  TURN over TLS on 443), with credentials that are short-lived and minted
  server-side. This is the single most common cause of "it works for me" video
  bugs, and it is a recurring bandwidth cost, not a one-off setup step.
- **Permissions must be enforced at the media server, not the UI.** The domain
  default is that `audience` joins with `canPublishAudio: false` and
  `canPublishVideo: false` (`defaultPermissions()` in `src/domain/session.ts`).
  Promotion to `stage_guest` must update the grant server-side; a UI that merely
  hides a button is not a control.
- **Removal must be enforced server-side too.** `removeParticipant()` plus
  `blockRejoin()` must actually revoke the participant's token and refuse
  re-issue for that room — otherwise a removed person reloads and returns.
- **Reconnection and lifecycle.** Drops, refreshes, duplicate joins from two
  tabs, host disconnects, and rooms that must close on schedule. Map these onto
  the session state machine — in particular `technical_failure`, which has a
  distinct compensation default.
- **Provider recording features must stay off.** `platformRecordingEnabled` is
  `false` in the demo client and there is no recording feature in the product. If
  a vendor offers server-side recording, an adapter must not enable it silently;
  see [trust-and-safety.md](./trust-and-safety.md#3-the-no-recording-policy).
- **Capacity.** `CreateRoomArgs.capacity` must be passed to the provider, and
  reconciled against `policies.marketplace.maxCrowdsharedSeats` and the
  occurrence's own `capacity`.

---

## 4. Media

### Interface

```ts
interface MediaProvider {
  readonly info: ProviderInfo;
  resolvePlaybackUrl(ref: string): Promise<string>;
  resolvePosterUrl(ref: string): Promise<string | undefined>;
}
```

### What the demo adapter does

`DemoMediaProvider` does string manipulation only: a ref starting with `/` is
returned as-is, otherwise it is prefixed with
`/clients/experience-demo/assets/`. `resolvePosterUrl()` returns the ref when it
is already a path and `undefined` otherwise. No CDN, no remote host, no signing,
no transcoding. Samples are locally generated placeholder assets under `/public`.

### What a production adapter must implement

- Upload and ingest for host-published promotional samples, with transcoding to
  multiple renditions and poster generation.
- Signed, expiring playback URLs, and a decision about whether samples are public
  (they currently are, by design — see
  [trust-and-safety.md](./trust-and-safety.md#4-samples-versus-live-sessions)).
- Moderation of uploaded media before it appears in discovery. Nothing scans
  sample media today.
- Storage lifecycle: retention, deletion on host account closure, and cost
  controls.

---

## 5. Messaging

### Interface

```ts
interface MessagingProvider {
  readonly info: ProviderInfo;
  deliver(args: {
    conversationId: string;
    senderUserId: UserId;
    body: string;
  }): Promise<{ ok: boolean; mode: ProviderMode }>;
}
```

Note the comment on `deliver`: *"Delivers an already-moderated message. Moderation
happens in the domain."* Anti-circumvention assessment runs in
`src/domain/risk.ts` via `sendMessage()` in `src/domain/messaging.ts`, before the
provider is ever asked to deliver. A provider swap cannot bypass moderation.

### What the demo adapter does

`DemoMessagingProvider.deliver()` returns `{ ok: true, mode: "demo" }` and
delivers nothing. Conversations live in the in-memory repository for the lifetime
of the server process.

### What a production adapter must implement

- Durable message storage with ordering guarantees, read state, and pagination.
- Real-time delivery (websocket/push) and offline notification.
- Rate limiting and abuse tooling — blocking, muting, reporting a conversation.
- Retention and export policy, mindful that blocked message bodies are
  deliberately *not* stored (only a redaction notice and a redacted excerpt).

---

## 6. Mocked vs. production, at a glance

| Capability | What exists now | What production requires |
|---|---|---|
| Sign-in / sessions | `DemoAuthProvider` returns a seeded persona; never `null` | Real IdP, server-verified sessions, CSRF, sign-out |
| Authorization | `viewer.userId === booking.guestUserId` checks on 2 API routes; capability guards that 404 | Server-side authorization on every sensitive read and write, real roles for `/ops/*` |
| Identity verification | `VerificationState` field only; nothing can set it legitimately | KYC/ID vendor, document handling, retention policy |
| Charging a guest | `demo_charge_*` reference, no money moves | PSP integration, webhooks, idempotency keys, tax |
| Refunds | `demo_refund_*` reference, no money moves | Refund + chargeback handling mapped onto ledger entries |
| Host payouts | `demo_payout_*` reference; a ledger entry only | Connected accounts, payout schedules, failure handling |
| Live audio/video | **None.** No room, no transport, no media | Media server, server-side token minting, TURN, reconnection |
| Mute / remove / permissions | No-ops; UI state plus a `SessionEvent` | Enforcement at the media server; token revocation on removal |
| Block rejoin | In-process `Map` in the demo adapter | Server-side ban list, token re-issue refused |
| Sample playback | Local `/public` paths | Ingest, transcode, signed URLs, media moderation |
| Message delivery | `{ ok: true }`, delivered nowhere | Durable store, realtime transport, rate limits, abuse tooling |
| Persistence | In-memory, process lifetime | Database adapter — see §7 |
| Lead capture | `POST /api/lead` validates and acknowledges, delivers nowhere | An email/CRM provider |
| Analytics | `integrations.analytics` is typed but never read by any code | A script/SDK actually wired into the layout |

No mock is presented in the UI as a real transaction, a real payout, or a real
recording guarantee.

---

## 7. The repository boundary

`src/data/repositories.ts` defines six interfaces — `ExperienceRepository`,
`BookingRepository`, `ConversationRepository`, `IncidentRepository`,
`ReputationRepository`, `LedgerRepository` — bundled as `Repositories`. Every
method takes a `TenantId` as its first meaningful argument.

The only adapter is `src/data/memory/index.ts`, backed by `src/data/seed/*`.
`src/data/index.ts` caches one instance per server process, which is why a demo
booking survives navigation but not a restart — the honest behavior for an
in-memory adapter, and it says so in a comment. Every memory query filters on
`tenantId`, mirroring the isolation a real backend must enforce at the row level.

### What a future Postgres/Supabase adapter must provide

None of the following exists yet. That absence is the reason no database
dependency was added: a half-wired database is worse than a clearly-labeled
in-memory store, and adding the dependency before these are answered would make
the demo depend on infrastructure nobody has set up.

1. **Local setup** — a documented, one-command path to a working local database,
   plus a seeding routine that loads the same fixtures the in-memory adapter uses
   so the demo content survives the switch.
2. **Migrations** — versioned, forward-only, reviewable, and runnable in CI. Every
   branded id and every `Money` column needs a decided representation (integer
   minor units plus a currency column, never a float).
3. **Tenant isolation** — a `tenant_id` column on every table, enforced at the row
   level (Postgres RLS or an equivalent), not merely by remembering to add a
   `WHERE` clause. The interfaces already carry `TenantId` through every call so
   the adapter has the value to enforce with.
4. **Auth integration** — the database's notion of the current user must line up
   with `AuthProvider.getViewer()`. With Supabase in particular, RLS policies key
   off the authenticated JWT, so the auth adapter and the data adapter have to be
   designed together rather than in sequence.
5. **Tests** — the repository suite (`src/data/repositories.test.ts`) should run
   against the real adapter too, not only the in-memory one, or the interface
   stops meaning anything.
6. **A no-credential demo mode** — the in-memory adapter must remain selectable so
   `npm run dev` still works with nothing configured. Adding persistence must not
   take away the zero-setup path.

Until all six are answered, `getRepositories()` returns the in-memory adapter and
nothing above `src/data/index.ts` changes when that stops being true.

---

## 8. Adding a live adapter — the checklist

1. Create `src/providers/<vendor>/index.ts`. The vendor SDK import belongs in
   that directory and nowhere else.
2. Implement the interface class with `info.mode = "live"` and a truthful
   `info.name`.
3. Read credentials from the server environment inside that directory. Never
   expose a secret through a `NEXT_PUBLIC_*` variable — that prefix means "shipped
   to the browser". Add the variable names to `.env.example` and move them out of
   the NOT YET IMPLEMENTED section.
4. Wire it into `getProviders()` in `src/providers/index.ts`, replacing the throw
   for that family. Keep the throw for the families that are still demo-only.
5. Set the client's `integrations.<family>.provider` to the vendor's key.
6. Check `isDemoMode()` consumers: banners and copy that say "demo" must stop
   saying it for the surfaces that are now real, and must keep saying it for the
   ones that are not. A partially-real deployment is the case most likely to
   mislead someone.
