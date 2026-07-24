# Whitelabel Site Template

One codebase → many businesses. Everything that differs between clients lives in a
single typed config file plus an assets folder. Components read from config and
never hardcode brand, copy, colors, or which features exist.

**Model:** config-driven, one deployment per client.
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS.

## Quick start

```bash
npm install
npm run dev            # serves the default client (teen-edge)
```

Choose which client to run:

```bash
NEXT_PUBLIC_CLIENT=mentor-academy npm run dev
NEXT_PUBLIC_CLIENT=collective npm run dev
```

## How it works

- **`src/config/types.ts`** — the `SiteConfig` type: the complete "whitelabel
  surface". This is the contract every client plugs into.
- **`clients/<slug>/config.ts`** — one file per client, shaped like `SiteConfig`.
- **`src/config/active.ts`** — registry + which client this build serves
  (via `NEXT_PUBLIC_CLIENT`).
- **`src/theme/theme.ts`** — turns a client's colors/fonts/radius into CSS
  variables injected in `app/layout.tsx`. Tailwind utilities (`bg-primary`,
  `text-fg`, `rounded-theme`) resolve against them, so a full rebrand = editing
  hex values in one config, zero CSS changes.
- **`src/sections/`** — config-driven UI blocks (Header, Hero, Footer today;
  Services/About/Testimonials/Pricing/FAQ/CTA/Booking next).

### Feature modules

The `modules` block lets one template serve very different businesses:

| Module      | Powers                                             | Demo client      |
|-------------|----------------------------------------------------|------------------|
| `booking`   | Appointment / discovery-call scheduling            | teen-edge        |
| `content`   | Video library + (later) live sessions / webinars   | mentor-academy   |
| `community` | Forum: public / private / DM channels              | collective       |

Each is independently toggleable. Sections and modules render only when the
active client has configured them.

## Add a new client

```bash
npm run new-client -- acme-coaching "Acme Coaching"
```

Then edit `clients/acme-coaching/config.ts`, drop assets in
`public/clients/acme-coaching/assets/`, add the import line the script prints to
`src/config/active.ts`, and run `NEXT_PUBLIC_CLIENT=acme-coaching npm run dev`.

## Assets

Client assets must be web-served, so they live in
`public/clients/<slug>/assets/` and are referenced from config as
`/clients/<slug>/assets/logo.svg`.

## Deploy (one project per client)

Each client is its own deployment with `NEXT_PUBLIC_CLIENT` set to its slug.
See the hosting notes shared separately for the recommended setup.

## Roadmap

1. ✅ Foundations: config type, theme pipeline, Header/Hero/Footer.
2. Marketing sections: Services, About, Testimonials, Pricing, FAQ, CTA, Contact.
3. Booking: Cal.com/Calendly embed → optional internal flow + Stripe.
4. Lead capture: contact form → `/api/lead` (Resend/Formspree) + spam protection.
5. Content module: video library + live sessions.
6. Community module: forum with public/private/DM.
