# Trust and Safety

What this codebase actually does about identity, recording, session safety,
moderation, disputes and compensation fairness — and, just as importantly, what it
does not do.

The rule this document follows: never describe a protection the code does not
provide. Where something is modeled but not implemented, it is labeled. Where a
protection is inherently partial, the limitation is stated in the same breath as
the feature.

Related: [interactive-experiences-architecture.md](./interactive-experiences-architecture.md)
for the layer model and state machines,
[provider-integrations.md](./provider-integrations.md) for what the demo adapters
do and do not do.

---

## 1. Pseudonymity

`src/domain/identity.ts` splits what the platform knows from what other users can
see into **two separate types**.

**`UserPrivate`** — restricted. Holds `legalFirstName`, `legalLastName`, `email`,
`phone`, `payoutAccountRef`, `addressLine`, `governmentIdRef`, a
`VerificationState`, and the user's `DisplayIdentity`. It must never be serialized
to a client component, to an API response another user consumes, or to a log line.

**`PublicProfile`** — what any other user may see: `userId`, `displayName`,
`handle`, optional `avatar`, `identityVerified` (a boolean, never the underlying
data), and `memberSince`.

### The only sanctioned conversion

```ts
export function toPublicProfile(user: UserPrivate): PublicProfile
```

It enumerates every public field explicitly rather than spreading, so adding a
field to `UserPrivate` can never silently widen what is published. The rule stated
at the top of the file: **never construct a `PublicProfile` by spreading a
`UserPrivate`.**

### Fields that must never be public

`PRIVATE_ONLY_FIELDS` in `src/domain/identity.ts`:

| Field | Why |
|---|---|
| `legalLastName` | a surname plus a first name is usually enough to find someone |
| `email` | direct contact channel outside any moderation |
| `phone` | direct contact channel; also a doxxing vector |
| `payoutAccountRef` | financial routing identity |
| `addressLine` | physical safety |
| `governmentIdRef` | identity-document reference |

`assertNoPrivateFields(value, context)` is a defence-in-depth check used by tests
and at the serialization boundary: it throws naming the leaked fields and telling
the caller to use `toPublicProfile()`. It is a runtime backstop, not a substitute
for the type split.

### Display identity

`DisplayNameStyle` is `first_name | first_name_last_initial | nickname |
stage_name`. `deriveDisplayName()` is the single implementation of the
"last initial" rule and throws if a nickname or stage name is requested without an
explicit value. The `interactive-experiences` preset allows all four styles and
sets `pseudonymousByDefault: true` — a guest browsing a marketplace is never
required to publish their legal name.

### Verification is modeled, not implemented

`VerificationStatus` (`unverified | pending | verified | failed`) and
`VerificationState` (`{ identity, verifiedAt?, provider? }`) exist as types.
`identityVerificationOffered: true` in the demo client's identity policy is a
statement of product intent, not a working feature.

**There is no KYC or ID-verification integration.** Nothing in this codebase can
legitimately set `identity: "verified"` — no document capture, no vendor call, no
review workflow, no retention policy. The seed data in `src/data/seed/hosts.ts`
sets several demo hosts to `"verified"` with `provider: "demo-illustrative"` so
the badge and its absence both render; those values are fixtures illustrating UI
states, and a "verified" badge in this build attests to nothing.

---

## 2. Public versus private, structurally

| Type | Public projection | Where |
|---|---|---|
| `UserPrivate` | `PublicProfile` via `toPublicProfile()` | `src/domain/identity.ts` |
| `Review` | `PublicReview` via `toPublicReview()` — drops `structured`, `privateNotes`, `tip` | `src/domain/review.ts` |
| `HostProfile` | already public-shaped; carries `public: PublicProfile`, `headline`, `bio`, `approximateRegion`, `languages`, `trust`, `categories` | `src/domain/identity.ts` |

`HostProfile.approximateRegion` is broad region only. Exact location is never
published — a constraint written for the in-person delivery mode that does not
exist yet (§9).

---

## 3. The no-recording policy

### What is actually implemented

**1. There is no recording feature.** `platformRecordingEnabled: false` in the
demo client, and no code path in this repository records, stores, streams to
storage, or transcribes session media. The demo session provider creates no room
and carries no media transport at all
([provider-integrations.md](./provider-integrations.md#3-session-live-video)),
so there is nothing to record even by accident.

**2. Mandatory policy acceptance, recorded server-side.**
`policies.recording.requirePolicyAcceptance` is `true`. `SessionLobby`
(`src/components/marketplace/SessionLobby.tsx`) requires two separate,
un-pre-ticked checkboxes — the recording prohibition and a conduct undertaking —
before the join button enables. Joining POSTs to
`/api/sessions/accept-policies`, which verifies the viewer is the booking's guest
and writes `policiesAcceptedAt` on the booking. `/session/[code]` re-checks
`booking.policiesAcceptedAt` **server-side** and sends the visitor back to the
lobby if it is missing, because a guest can navigate straight to that URL and a
client-side gate would be no gate at all.

**3. An individualized, moving watermark.**
`src/components/marketplace/WatermarkOverlay.tsx` renders two offset marks reading
`displayName · bookingCode`, rotated, and cycling through five positions every
`watermarkMoveIntervalSeconds` (20 in the demo, floored at 5). Two marks at
different positions mean cropping one corner does not clear the frame.

Its purpose is **attribution, not prevention**: if footage leaks, the mark ties it
to a specific booking. The identifier is a pseudonymous display name plus the
short booking code from `generateBookingCode()` — deliberately **not** a legal
name, email address or phone number, so a leaked frame cannot doxx the person who
was watching.

**4. A report category.** `unauthorized_recording` ("Unauthorized recording or
distribution") is one of the nine `ReportCategory` values, and
`defaultSeverity()` assigns it `medium`, routing it to a human reviewer.

**5. Copy that does not overclaim.**
`src/components/marketplace/RecordingPolicyNotice.tsx` carries an explicit copy
rule in its header comment — *never claim recording is impossible, blocked, or
detected* — and the rendered notice ends with: no website can stop someone filming
their own screen with another device; the policy works by making recording clearly
prohibited, individually attributable, and actionable.

### LIMITATIONS

Read this section as part of the feature, not as a caveat appended to it.

- **Browser-based recording prevention is not possible.** A web page cannot stop
  screen capture, cannot stop OBS or a system recorder, and cannot stop someone
  pointing a phone at their monitor. No amount of product design changes that.
- **No screen-recording detection exists, and none is faked.** There is no
  heuristic, no fingerprinting, no "we noticed you started recording" prompt, and
  no placeholder pretending to be one. Nothing in this codebase detects recording.
- **The watermark is deterrence and attribution only.** It makes leaked material
  traceable to an account. It does not prevent capture, and a determined person
  can crop, blur or obscure it — the two offset marks and the movement interval
  raise the cost, they do not close the hole.
- **Sessions are never secretly recorded.** Not for safety review, not for
  moderation, not for training, not for dispute evidence. If a recording feature
  is ever added, it must be announced before it starts — the notice component
  already has the branch for that (`platformRecordingEnabled: true` renders "Any
  platform recording is clearly indicated before it starts"), and it is currently
  unused.
- **The watermark deliberately excludes legal name, email and phone.** A stronger
  identifier would make leaked frames more damaging to the victim of the leak than
  to the leaker. This is a deliberate trade-off in favor of the person being
  watermarked.

---

## 4. Samples versus live sessions

Two different things with two different rules, and the product says so in both
places.

| | Promotional sample | Live session |
|---|---|---|
| What it is | media a host publishes to showcase an experience (`ExperienceSample` in `src/domain/experience.ts`) | a private, scheduled, interactive session |
| Audience | public by design | the booked participants |
| Recording policy | not covered — `policies.recording.samplesExempt: true` | prohibited |
| Watermark | none | individualized, moving |

`SamplePolicyNote` in `RecordingPolicyNotice.tsx` renders alongside sample
playback so a guest does not mistake one for the other: *"Samples are public. Live
sessions are private and covered by the no-recording policy."*

---

## 5. Session safety controls

### Participant controls

- **Report, always reachable.** `ReportMenu`
  (`src/components/marketplace/ReportMenu.tsx`) is rendered unconditionally in the
  session sidebar, available to every participant at any time — reporting must not
  be buried behind a menu a distressed person has to hunt for. Submitting shows
  the severity `defaultSeverity()` assigns to the chosen category and states that
  a person will review it and that the reported party is not told who reported
  them.

  *Not implemented:* there is no report API route. `SessionRoom` passes an
  `onSubmit` handler that appends a line to the local session log, so an
  in-session report is not persisted and creates no `Incident`. The only path that
  creates an incident today is the misconduct flag in `POST /api/reviews` (§8).
- **Leave now, unconditionally.** `EmergencyLeaveButton` is deliberately separate
  from "End session". A guest leaving a session they find unsafe should never have
  to weigh what it does to the host's payout.

### Host / moderator controls

`HostModerationControls` in `src/components/marketplace/SessionRoom.tsx`, rendered
when the viewer's role is `host` or `co_host`: mute/unmute, bring on stage, return
to audience, remove, block rejoin, and disable/enable chat. Each action appends to
a visible operational log.

In the demo these act on local component state and record a `SessionEvent`; the
demo session provider's corresponding methods are no-ops except `blockRejoin`,
which records the pair in an in-process map. **A production adapter must enforce
all of these at the media server** — see
[provider-integrations.md](./provider-integrations.md#3-session-live-video).

### Crowdshared audiences start without publishing rights

`defaultPermissions()` in `src/domain/session.ts`:

| Role | Publish audio | Publish video | Chat | Moderate |
|---|---|---|---|---|
| `host`, `co_host` | yes | yes | yes | yes |
| `moderator` | no | no | yes | yes |
| `stage_guest` | yes | yes | yes | no |
| `audience` | **no** | **no** | yes | no |

An audience member cannot broadcast to a room of strangers until the host
explicitly promotes them to the stage. The session page and room UI both state
this. As above: in a live deployment the grant must be enforced by the media
server, not by a hidden button.

### Report categories

The full `ReportCategory` list from `src/domain/incident.ts`, with the severity
`defaultSeverity()` assigns:

| Category | Label | Default severity |
|---|---|---|
| `harassment` | Harassment | high |
| `sexual_or_inappropriate` | Sexual or inappropriate conduct | high |
| `hate_or_threats` | Hate speech or threats | high |
| `intoxication_or_disruptive` | Intoxication or disruptive behavior | low |
| `unauthorized_recording` | Unauthorized recording or distribution | medium |
| `materially_different_from_listing` | Experience materially different from listing | low |
| `off_platform_transaction_attempt` | Attempt to transact outside the platform | medium |
| `technical_failure` | Technical failure | low |
| `other_safety` | Other safety issue | low |

`URGENT_CATEGORIES` — the three `high` ones — are the categories intended to page
a human quickly rather than sit in a backlog. That intent is encoded as a
constant; there is no paging or notification system in this codebase to act on it.

### Which policy flags are actually read

Worth knowing before you assume a toggle does something:

| Flag | Read by |
|---|---|
| `recording.requirePolicyAcceptance` | `/session/[code]` server-side gate |
| `recording.watermarkEnabled` | `/session/[code]` → `SessionRoom` → `WatermarkOverlay`; also a config validation rule |
| `recording.watermarkMoveIntervalSeconds` | `WatermarkOverlay` |
| `recording.platformRecordingEnabled` | `RecordingPolicyNotice` copy branch |
| `compensation.*` | booking service, `/api/reviews`, price breakdown UI |
| `moderation.reportingEnabled` | **config validation only** — no runtime gate |
| `moderation.hostModerationControls` | **not read at runtime** — controls render on host role |
| `moderation.antiCircumventionEnabled` | **not read at runtime** — assessment always runs |
| `moderation.retainOperationalMetadata` | **not read at runtime** — the event log is unconditional |
| `recording.samplesExempt` | **not read at runtime** — `SamplePolicyNote` renders on a component prop |
| `identity.allowedDisplayStyles`, `identity.pseudonymousByDefault`, `identity.identityVerificationOffered` | **not read at runtime** — no identity-settings UI exists |

The ones marked "not read at runtime" are declarations of product intent that a
future implementation is expected to honor. Today, turning one off would not
change behavior.

---

## 6. Operational metadata, and what is not retained

`policies.moderation.retainOperationalMetadata` is `true`. What that means
precisely: an append-only log of **actions**, on `Session.events`, typed as
`SessionEventType`:

| Event | |
|---|---|
| `participant_joined` | `participant_left` |
| `participant_muted` | `participant_removed` |
| `rejoin_blocked` | `chat_disabled` |
| `promoted_to_stage` | `returned_to_audience` |
| `policy_accepted` | `report_submitted` |
| `contact_sharing_warning` | `status_changed` |

Each `SessionEvent` carries `type`, `at`, optional `actorUserId` /
`subjectUserId`, and an optional short **non-content** note (`"muted by host"`, a
status label).

**Session audio and video are never recorded or transcribed.** Not stored, not
streamed to storage, not sent to a transcription service, not analyzed. The
session log panel in `SessionRoom.tsx` says this on screen: *"Actions are recorded
to support dispute review. Session audio and video are never recorded or
transcribed."*

The distinction is the whole point: a dispute needs to know that a guest joined at
20:03, that the host muted someone at 20:31, and that policies were accepted
before the room opened. None of that requires keeping what anyone said.

Messaging follows the same principle. A message blocked by anti-circumvention
stores only `"[Message blocked: shared contact or payment details]"` as its body,
never the original text (`src/domain/messaging.ts`), and a `RiskSignal` stores a
redacted excerpt rather than the full match (`redact()` in `src/domain/risk.ts`) —
enough for dispute review without warehousing people's contact details.

---

## 7. Incidents and disputes

### Incident lifecycle

`IncidentStatus`: `submitted → triaged → investigating → resolved / dismissed`,
with `appealed` reachable from `resolved` and `dismissed`, and returning to
`investigating`, `resolved` or `dismissed`. Full transition table in
[the architecture reference](./interactive-experiences-architecture.md#state-machines).

An `Incident` records the reporter, optionally the reported user, the category,
severity, status, the reporter's own words, timestamps, and reviewer
`reviewNotes`. The `description` field is documented as an **allegation, never a
finding**.

### Nothing is automatically adjudicated

`suggestedResolution(status)` in `src/domain/incident.ts` returns a
`DisputeSuggestion` — a **default** for a human reviewer to accept or override:

| Session status | Suggested outcome | Rationale |
|---|---|---|
| `cancelled_by_host` | `guest_refund` | host did not deliver; make the guest whole |
| `cancelled_by_guest` | `host_cancellation_compensation` | cancellation compensation per the client's policy window |
| `interrupted_by_guest` | `host_compensation_review` | guaranteed compensation is **reviewed, not automatically withheld** |
| `interrupted_by_host` | `payout_review` | payout enters review pending context |
| `technical_failure` | `credit_or_reschedule` | neither party at fault |
| `completed` | `release_guaranteed_compensation` | release and open feedback and tipping |
| anything else | `host_compensation_review` | no automatic default; route to a reviewer |

**No code path in this repository executes any of these.** The function is pure
and returns a suggestion. `/ops/incidents` lists incidents and risk signals;
`/ops/incidents/[incidentId]` shows the report as an allegation, reviewer notes,
and — only for a `technical_failure` report, the one category that reveals how the
session ended — the suggested starting point, labeled as a default a reviewer
accepts or overrides. The "valid next states" buttons on that page are
**disabled**, and the page says so: changing incident state is not implemented in
this pass. Money moves only where a route explicitly appends ledger entries, and
the entries produced for non-`completed` outcomes are `pending` or `held` — never
`released`.

`DisputeSuggestion.requiresHumanReview` is `true` for every branch except
`completed`, where the "outcome" is releasing compensation the host has already
earned by delivering the session. Note that the type's doc comment says "always
true", which does not match the `completed` branch — treat the branch values as
authoritative and the comment as stale.

---

## 8. Compensation fairness

The invariant, from `src/domain/ledger.ts`:

> **Guaranteed host compensation is earned by delivering legitimate, compliant
> time, and is NOT a function of the guest's star rating.**

How that holds in the code:

- **No rating anywhere in the ledger.** `entriesForSessionOutcome()` branches on
  `SessionStatus` only. There is no branch, in that function or anywhere else in
  `src/domain/ledger.ts`, that reads a star rating to decide whether guaranteed
  compensation is released.
- **Only the bonus is discretionary.** `recommendBonus()` in
  `src/domain/review.ts` is the single place a rating touches money. It counts the
  four structured quality answers, recommends when at least three are positive
  **and** the rating is 4 or 5, and returns `pendingHumanReview: true` — always.
  Its own rationale string ends: *"Bonus is discretionary and does not affect
  guaranteed compensation."* `POST /api/reviews` records the resulting
  `performance_bonus` entry with status `pending`.
- **A single low score is not a misconduct finding.** `requiresSafetyReview()` is
  deliberately narrow — it returns `feedback.inappropriateBehavior` and nothing
  else. A 1-star "wasn't for me" creates no incident and moves no money. Only the
  explicit misconduct flag opens an incident, and `POST /api/reviews` implements
  exactly that: it creates an `Incident` in `submitted` state solely when
  `requiresSafetyReview()` is true.
- **The four feedback channels stay separate**, on the server as well as in the
  UI (`src/components/marketplace/Feedback.tsx`): public rating and comment →
  the listing; structured answers → a bonus recommendation; the misconduct flag →
  a private incident; private notes → reviewer-only, never rendered publicly.
  Conflating "I didn't enjoy it" with "something was wrong" is how review systems
  end up punishing hosts for taste.
- **Late cancellation by a guest still pays the host.**
  `lateCancellationCompensationBps` (5000 in the default policy) inside
  `cancellationWindowHours` (24), recorded as a `cancellation_compensation` entry.
- **Tips are separate and go entirely to the host** — `tipEntry()` memo: *"Guest
  tip (100% to host)"* — and are never netted against the guaranteed share.

See the [architecture reference](./interactive-experiences-architecture.md#8-ledger-and-compensation)
for the full entry-type table, and for one implementation detail: the `completed`
branch appends a zero-amount marker entry rather than settling the `pending` entry
from purchase, which a real backend would need to do properly.

---

## 9. Anti-circumvention

`src/domain/risk.ts`. The purpose is to discourage moving repeat transactions
off-platform, where neither side has refund protection, dispute support, or
compensation guarantees.

### What is detected

Text only. `RiskFindingKind` values and their severity:

| Kind | Severity | Notes |
|---|---|---|
| `email` | clear | standard address pattern |
| `obfuscated_email` | clear | "name at gmail dot com"; requires **both** an at-word and a dot-word, so "meet at eight" cannot match. Suppressed when a plain email already matched |
| `phone` | clear (10–15 digits) or ambiguous (≥7 digits **plus** phone context words like "call", "text", "my number") | ISO dates, clock times and currency-prefixed runs are excluded |
| `payment_app` | clear | Venmo, Cash App, PayPal, Zelle, Revolut, Wise transfer, `$cashtag` |
| `payment_solicitation` | clear | "pay me directly", "book me direct", "avoid the fees", "cut out the middleman" |
| `external_meeting_link` | clear | zoom.us, meet.google.com, Teams, Whereby, discord.gg, Calendly, Skype |
| `social_handle` | **ambiguous only** | usually benign portfolio sharing |

### Progressive handling

`assessText()` maps severity to an action: no findings → `allow`; ambiguous only →
`warn`; any clear finding → `block`. `assessWithHistory()` layers account history
on top:

| Situation | Action |
|---|---|
| clean message | `allow` — always delivered |
| first clear violation | `block` |
| second or later clear violation | `block` **and** `review` (flagged for a human, creates a `RiskSignal`) |
| ambiguous signal | `warn` |
| third or later ambiguous signal | `review`, creates a `RiskSignal` |

A clean message is always delivered regardless of history. Prior history is
account state, not a reason to block someone's next sentence — punishing clean
messages would make the warning meaningless and the product hostile.

`assessListingText()` applies the same detectors to listing fields, surfacing a
publish-time error for `clear` findings rather than blocking a message. Hosts
sometimes embed contact details in a description to route guests off-platform.

### Findings are signals, not proof

`RiskSignal` in `src/domain/incident.ts` is documented as an **indicator, not
proof**. Its `confidence` field is "0–100 confidence that the pattern is real; not
a guilt score". Signals accumulate to prompt human review; they never by
themselves establish misconduct or trigger a penalty. `RiskWarning`
(`src/components/marketplace/RiskWarning.tsx`) is written accordingly — a warned
user is usually not a bad actor, so the copy explains what protection they would
lose rather than accusing them of anything.

### Live-session audio is never scanned

Stated as the first design constraint in `src/domain/risk.ts`: *"Text only. This
never inspects, transcribes, or analyses live-session audio."* There is no audio
pipeline to scan with, and there must not be one added for this purpose.

### False positives are the expensive failure mode

The detectors are written to fail toward delivery:

- Blocked messages are always explained to the sender with a reason, never
  dropped invisibly; `RiskWarning` renders the assessment's own message.
- Prices, times, dates and durations must never read as phone numbers: ISO dates
  and clock times are excluded outright, a run preceded by `$`, `£` or `€` is
  skipped as a price, and a 7–9 digit run only registers when accompanied by
  explicit phone context words.
- Social handles are capped at `ambiguous` no matter how many appear, because
  sharing a portfolio is normal behavior.
- The obfuscated-email pattern requires two independent obfuscation markers before
  it fires.

`src/domain/risk.test.ts` covers these cases with a table of innocuous messages
that must pass untouched ("It cost $60 and I'd pay it again.", "I booked for
2026-08-29, is that right?", "There were 12 of us and 3 dropped out.").

**Where the current implementation falls short of its own stated goal.** The file
header names "I'll Venmo my friend for dinner after" as the kind of message that
should not be silently blocked, but `PAYMENT_APP_RE` matches a payment-app name
with no surrounding context and every such match is `clear`, so that sentence
would in fact be blocked today. Payment-app names carry no context guard
equivalent to the one phone numbers get (`PHONE_CONTEXT_RE`). This is a known gap
between the design intent written in the file and the detector as implemented, not
a solved problem.

---

## 10. Future in-person delivery

The model has the shape; the product refuses to run it.

**Modeled:** `DeliveryMode` includes `"in_person"`; `Experience` and
`ExperienceOccurrence` carry `deliveryMode`; `policies.marketplace.inPerson` has
`enabled: false` (typed `z.literal(false)`), `approximateLocationOnly: true`
(typed `z.literal(true)`) and `exactLocationDisclosureMinutesBefore` (120 in the
demo); `HostProfile.approximateRegion` exists and is documented as broad region
only, with exact location never published.

**Disabled and rejected:** the cross-field validator in `src/config/schema.ts`
fails any client whose `policies.marketplace.deliveryModes` contains
`"in_person"`:

> In-person delivery is modeled but not implemented. Keep
> `policies.marketplace.deliveryModes` as `["remote"]` until location handling,
> safety review and logistics exist.

Configuration errors throw at module load, so this fails the build rather than
degrading at runtime. Meeting strangers in physical space raises safety questions —
address disclosure timing, emergency contact, check-in, insurance, jurisdiction —
that none of the current machinery answers, and shipping a half-built in-person
flow would be worse than shipping none.
