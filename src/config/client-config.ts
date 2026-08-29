/**
 * ClientConfig — the canonical static configuration for one client.
 *
 * Grouped into six concerns so it stays legible as capability grows:
 *   site         brand, theme, contact, SEO, navigation
 *   product      preset, terminology, delivery/booking modes
 *   pages        section composition per page
 *   modules      which feature modules are enabled
 *   policies     compensation, identity, recording, moderation, marketplace rules
 *   integrations provider selection and endpoints
 *
 * HARD RULE: this file describes *configuration*, never *business records*.
 * Experiences, bookings, hosts, reviews and ledger entries are mutable runtime
 * data and live in repositories (src/data), not here. A client config is safe to
 * commit to git; a booking is not.
 */

import type { ModuleId } from "@/modules/registry";
import type { Terminology } from "./terminology";
import type { BookingMode, DeliveryMode } from "@/domain/experience";
import type { CompensationPolicy } from "@/domain/ledger";
import type { DisplayNameStyle } from "@/domain/identity";
import type {
  Brand,
  Contact,
  ImageRef,
  Link,
  Navigation,
  Seo,
  Sections,
  ThemeConfig,
} from "./types";

/* ------------------------------- Presets -------------------------------- */

export type ProductPreset = "marketing" | "appointments" | "interactive-experiences";

/* ------------------------------- Pages ---------------------------------- */

/** A section instance in a page composition. */
export type PageSection = {
  /** Section id registered in src/sections/registry.ts. */
  id: string;
  /** Optional per-instance options (heading overrides, limits, filters). */
  options?: Record<string, unknown>;
};

export type PageComposition = {
  /** Convenience default; `sections` still wins when both are present. */
  preset?: "marketing" | "marketplace";
  sections: PageSection[];
};

export type PagesConfig = {
  home: PageComposition;
};

/* ------------------------------ Policies -------------------------------- */

export type IdentityPolicy = {
  /** Display styles a user may choose for their public identity. */
  allowedDisplayStyles: DisplayNameStyle[];
  /** Whether public profiles are pseudonymous by default. */
  pseudonymousByDefault: boolean;
  /** Whether identity verification is offered (modeled only in this pass). */
  identityVerificationOffered: boolean;
};

export type RecordingPolicy = {
  /**
   * Whether the platform itself offers any recording control. False in this
   * implementation — the demo has no recording feature at all.
   */
  platformRecordingEnabled: boolean;
  /** Require explicit acceptance of session policies before joining. */
  requirePolicyAcceptance: boolean;
  /** Overlay an individualized watermark on the live-session surface. */
  watermarkEnabled: boolean;
  /** Seconds between watermark position changes (anti-crop). */
  watermarkMoveIntervalSeconds: number;
  /** Whether promotional host samples are exempt (they are public by design). */
  samplesExempt: boolean;
};

export type ModerationPolicy = {
  reportingEnabled: boolean;
  hostModerationControls: boolean;
  /** Block messages containing unambiguous contact/payment exchange. */
  antiCircumventionEnabled: boolean;
  /** Retain non-content operational metadata for dispute review. */
  retainOperationalMetadata: boolean;
};

export type MarketplacePolicy = {
  /** Delivery modes offered. Remote-only for the first product. */
  deliveryModes: DeliveryMode[];
  bookingModes: BookingMode[];
  /** Maximum seats for a crowdshared occurrence. */
  maxCrowdsharedSeats?: number;
  /** Future in-person fields — modeled, disabled, and unused while remote-only. */
  inPerson?: {
    enabled: false;
    /** Publish only an approximate region until shortly before start. */
    approximateLocationOnly: true;
    exactLocationDisclosureMinutesBefore: number;
  };
};

export type PoliciesConfig = {
  compensation?: CompensationPolicy;
  identity?: IdentityPolicy;
  recording?: RecordingPolicy;
  moderation?: ModerationPolicy;
  marketplace?: MarketplacePolicy;
};

/* ---------------------------- Integrations ------------------------------ */

export type IntegrationsConfig = {
  formEndpoint?: string;
  analytics?: { provider: "plausible" | "ga4" | "posthog"; id: string };
  /** Provider selection. "demo" adapters require no credentials. */
  auth?: { provider: "demo" | "supabase" | "auth0" };
  commerce?: { provider: "demo" | "stripe" };
  session?: { provider: "demo" | "livekit" | "daily" | "zoom" };
  media?: { provider: "demo" | "mux" | "cloudflare" };
  messaging?: { provider: "demo" | "stream" };
  /** Legacy booking embed for appointment clients. */
  bookingEmbedUrl?: string;
};

/* ------------------------------- Product -------------------------------- */

export type ProductConfig = {
  preset: ProductPreset;
  terminology: Terminology;
  /** Currency for all money in this client, ISO-4217. */
  currency: string;
  timezone?: string;
};

/* -------------------------------- Site ---------------------------------- */

export type SiteSection = {
  brand: Brand;
  theme: ThemeConfig;
  contact?: Contact;
  nav: Navigation;
  seo: Seo;
  /** Marketing copy for brochure sections; optional for pure marketplaces. */
  sections?: Sections;
};

/* ------------------------------ ClientConfig ---------------------------- */

export type ClientConfig = {
  slug: string;
  site: SiteSection;
  product: ProductConfig;
  pages: PagesConfig;
  /** Enabled modules. Capabilities are derived from these. */
  modules: ModuleId[];
  policies: PoliciesConfig;
  integrations: IntegrationsConfig;
};

export type { Brand, Contact, ImageRef, Link, Navigation, Seo, Sections, ThemeConfig };
