/**
 * SiteConfig — the entire "whitelabel surface".
 *
 * Everything that differs between clients lives here. Components read from this
 * object and never hardcode brand, copy, colors, or feature availability.
 *
 * To launch a new client: copy clients/_template, fill in a config of this
 * shape, drop assets in the folder, point src/config/active.ts at it, deploy.
 *
 * The `modules` block is how one template serves very different businesses:
 *   - booking   → appointment / discovery-call scheduling
 *   - content   → video library + (later) live sessions/webinars
 *   - community → forum with public / private / DM channels
 * Each module is independently toggleable. Marketing sections render only when
 * their config is present, so a lean brochure and a full portal share one build.
 */

/* ----------------------------- Primitives ------------------------------ */

export type ImageRef = {
  /** Local path under the client's assets/ folder, or an absolute https URL. */
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type Link = {
  label: string;
  href: string;
  /** Renders as a button when true; plain link otherwise. */
  emphasized?: boolean;
  external?: boolean;
};

export type MegaMenuGroup = {
  label: string;
  links: Link[];
};

export type MegaMenuItem = {
  label: string;
  title: string;
  description: string;
  groups: MegaMenuGroup[];
};

export type IconName = string; // maps to an icon registry entry (see components/Icon)

/* ------------------------------- Brand --------------------------------- */

export type Brand = {
  name: string;
  /** Short tagline used near the logo / in the footer. */
  tagline?: string;
  logo: ImageRef;
  /** Optional inverted logo for dark surfaces. */
  logoInverse?: ImageRef;
  favicon?: string;
  /** Primary production domain, used for canonical URLs / SEO. */
  domain?: string;
};

/* ------------------------------- Theme --------------------------------- */

export type ThemeConfig = {
  /** Any valid CSS color string. */
  colors: {
    primary: string;
    primaryFg: string; // text/icon color that sits on primary
    secondary: string;
    secondaryFg: string;
    accent: string;
    accentFg: string;
    bg: string; // page background
    surface: string; // cards / raised panels
    fg: string; // default text
    muted: string; // secondary text
    border: string;
  };
  fonts: {
    /** CSS font-family stacks. Wire real webfonts in later via next/font. */
    sans: string;
    heading: string;
  };
  /** Base corner radius, e.g. "0.75rem". */
  radius: string;
  mode?: "light" | "dark";
};

/* ------------------------------ Contact -------------------------------- */

export type Contact = {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  socials?: { platform: string; href: string; icon?: IconName }[];
};

/* ------------------------- Marketing sections -------------------------- */

export type Hero = {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  image?: ImageRef;
  ctaPrimary?: Link;
  ctaSecondary?: Link;
  /** Small trust signals shown under the CTAs, e.g. "500+ families helped". */
  highlights?: string[];
};

export type Service = {
  title: string;
  description: string;
  icon?: IconName;
  price?: string;
  duration?: string;
  href?: string;
};

export type Stat = { value: string; label: string };

export type About = {
  heading: string;
  body: string;
  image?: ImageRef;
  stats?: Stat[];
};

export type Testimonial = {
  quote: string;
  author: string;
  role?: string;
  avatar?: ImageRef;
};

export type PricingTier = {
  name: string;
  price: string;
  cadence?: string; // "/month", "one-time"
  description?: string;
  features: string[];
  cta?: Link;
  featured?: boolean;
};

export type QA = { question: string; answer: string };

export type CtaBand = {
  heading: string;
  subheading?: string;
  button: Link;
};

export type Sections = {
  hero: Hero;
  services?: { heading?: string; subheading?: string; items: Service[] };
  about?: About;
  testimonials?: { heading?: string; items: Testimonial[] };
  pricing?: { heading?: string; subheading?: string; tiers: PricingTier[] };
  faq?: { heading?: string; items: QA[] };
  cta?: CtaBand;
};

/* ----------------------------- Modules --------------------------------- */

export type BookingService = {
  id: string;
  name: string;
  duration: number; // minutes
  price?: string;
  description?: string;
  buffer?: number; // minutes between appointments
};

export type BookingModule = {
  enabled: boolean;
  /**
   * 'calcom' / 'calendly' → embed an external scheduler (fastest path).
   * 'internal' → the template's own booking flow (built when a client needs it).
   */
  provider: "calcom" | "calendly" | "internal";
  /** Embed link or username for external providers. */
  embed?: { url: string };
  services?: BookingService[];
  timezone?: string;
  payments?: { enabled: boolean; provider?: "stripe" };
};

export type ContentModule = {
  enabled: boolean;
  /** Video-on-demand library. */
  library?: {
    heading?: string;
    /** Where videos are hosted; the player adapts per source. */
    provider?: "youtube" | "vimeo" | "mux" | "self";
    /** Gate content behind auth/membership when true. */
    gated?: boolean;
  };
  /** Live sessions / webinars (Zoom-like). Wired via plugin later. */
  live?: {
    enabled: boolean;
    provider?: "zoom" | "daily" | "livekit" | "custom";
  };
};

export type CommunityModule = {
  enabled: boolean;
  /** Forum feature set. Public browse + gated posting is the common pattern. */
  channels?: { public: boolean; private: boolean; directMessages: boolean };
  /** Backend to power it when built out. */
  provider?: "internal" | "discourse" | "circle" | "custom";
  moderation?: { enabled: boolean };
};

export type Modules = {
  booking?: BookingModule;
  content?: ContentModule;
  community?: CommunityModule;
};

/* --------------------------- Integrations ------------------------------ */

export type Integrations = {
  /** Endpoint the contact/lead form POSTs to (Resend route, Formspree, etc.). */
  formEndpoint?: string;
  analytics?: { provider: "plausible" | "ga4" | "posthog"; id: string };
  mapsKey?: string;
};

/* ------------------------------- SEO ----------------------------------- */

export type Seo = {
  title: string;
  description: string;
  ogImage?: ImageRef;
};

/* ---------------------------- Navigation ------------------------------- */

export type Navigation = {
  links: Link[];
  /** Optional full-width dropdown navigation. Flat links remain the fallback. */
  megaMenu?: MegaMenuItem[];
  /** Supporting action shown before the primary CTA. */
  secondaryCta?: Link;
  cta?: Link;
};

/* ---------------------------- Root config ------------------------------ */

export type SiteConfig = {
  /** Unique client slug, matches the folder name under clients/. */
  slug: string;
  brand: Brand;
  theme: ThemeConfig;
  contact?: Contact;
  nav: Navigation;
  sections: Sections;
  modules?: Modules;
  integrations?: Integrations;
  seo: Seo;
};
