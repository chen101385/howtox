import type { ClientConfig } from "@/config/client-config";
import { MARKETPLACE_TERMINOLOGY } from "@/config/terminology";
import { DEFAULT_COMPENSATION_POLICY } from "@/domain/ledger";
import { DEMO_LEGAL_DOCUMENTS } from "./legal";

/**
 * DEMO CLIENT — "Lantern Rooms"
 *
 * A neutral, replaceable placeholder brand for the interactive-experiences preset.
 * Not a real company; swap the brand block and assets for a real client.
 *
 * Remote-only. In-person fields are modeled but disabled, and config validation
 * rejects enabling them until location handling and safety review exist.
 *
 * NOTE: hosts, experiences, occurrences, bookings and reviews are NOT here.
 * They are mutable business records and live in src/data/seed.
 */
const config: ClientConfig = {
  slug: "experience-demo",

  site: {
    brand: {
      name: "Lantern Rooms",
      tagline: "Live, interactive experiences with real people",
      logo: {
        src: "/clients/experience-demo/assets/logo.svg",
        alt: "Lantern Rooms logo",
      },
      domain: "lanternrooms.example.com",
    },

    theme: {
      colors: {
        primary: "#f4a259", // lantern amber
        primaryFg: "#1a1626",
        secondary: "#2a2340",
        secondaryFg: "#f7f4ef",
        accent: "#7fd1c1",
        accentFg: "#12101c",
        bg: "#141122",
        surface: "#1d1930",
        fg: "#f7f4ef",
        muted: "#a9a2c0",
        border: "#2f2a47",
      },
      fonts: {
        sans: "'Inter', system-ui, sans-serif",
        heading: "'Inter', system-ui, sans-serif",
      },
      radius: "0.875rem",
      mode: "dark",
    },

    contact: {
      email: "hello@lanternrooms.example.com",
      hours: "Support 9am–9pm, seven days",
    },

    nav: {
      // "Discover" and "Become a Host" are contributed by the marketplace module,
      // so they are not repeated here.
      links: [
        { label: "How it works", href: "/#how-it-works" },
        { label: "Trust & safety", href: "/#trust-and-safety" },
      ],
      cta: { label: "Browse experiences", href: "/discover", emphasized: true },
    },

    seo: {
      title: "Lantern Rooms — live, interactive experiences",
      description:
        "Book live, interactive experiences with real hosts: storytelling, comedy, magic, music, cooking, improv and more. One-to-one, with friends, or join a small crowd.",
    },

    // Marketing copy reused by the shared marketing sections that appear on the
    // marketplace homepage (how it works, trust & safety, become a host).
    sections: {
      hero: {
        eyebrow: "Live tonight",
        headline: "Do something interesting with your evening",
        subheadline:
          "Real people, live and interactive. Learn something new or experience something different — one-to-one, with friends, or alongside a small crowd.",
        ctaPrimary: { label: "Browse experiences", href: "/discover", emphasized: true },
        ctaSecondary: { label: "How it works", href: "/#how-it-works" },
        highlights: [
          "Live and interactive, never pre-recorded",
          "Hosts are paid a guaranteed rate",
          "Pseudonymous by default",
        ],
      },
    },
  },

  product: {
    preset: "interactive-experiences",
    terminology: MARKETPLACE_TERMINOLOGY,
    currency: "USD",
    timezone: "America/Los_Angeles",
  },

  pages: {
    home: {
      preset: "marketplace",
      sections: [
        { id: "marketplaceHero" },
        { id: "intentFilters" },
        { id: "liveTonight", options: { limit: 4 } },
        { id: "featuredExperiences", options: { limit: 6 } },
        { id: "storytelling", options: { limit: 3 } },
        { id: "crowdsharedEvents", options: { limit: 3 } },
        { id: "featuredHosts", options: { limit: 4 } },
        { id: "howItWorks" },
        { id: "trustAndSafety" },
        { id: "becomeAHost" },
      ],
    },
  },

  modules: [
    "marketing",
    "marketplace",
    "discovery",
    "scheduling",
    "sessions",
    "commerce",
    "messaging",
    "reputation",
    "trust-safety",
  ],

  policies: {
    compensation: DEFAULT_COMPENSATION_POLICY,

    identity: {
      allowedDisplayStyles: [
        "first_name",
        "first_name_last_initial",
        "nickname",
        "stage_name",
      ],
      pseudonymousByDefault: true,
      identityVerificationOffered: true,
    },

    recording: {
      // The platform offers no recording feature at all in this implementation.
      platformRecordingEnabled: false,
      requirePolicyAcceptance: true,
      watermarkEnabled: true,
      watermarkMoveIntervalSeconds: 20,
      // Host promotional samples are public by design and not covered by the
      // live-session recording prohibition.
      samplesExempt: true,
    },

    moderation: {
      reportingEnabled: true,
      hostModerationControls: true,
      antiCircumventionEnabled: true,
      retainOperationalMetadata: true,
    },

    marketplace: {
      deliveryModes: ["remote"],
      bookingModes: ["one_to_one", "private_group", "crowdshared"],
      maxCrowdsharedSeats: 100,
      // Modeled for a future release; validation rejects enabling it today.
      inPerson: {
        enabled: false,
        approximateLocationOnly: true,
        exactLocationDisclosureMinutesBefore: 120,
      },
    },
  },

  integrations: {
    // Every provider is a demo adapter: the app runs with no credentials.
    auth: { provider: "demo" },
    commerce: { provider: "demo" },
    session: { provider: "demo" },
    media: { provider: "demo" },
    messaging: { provider: "demo" },
    formEndpoint: "/api/lead",
  },

  legal: {
    entityName: "Lantern Rooms (demo)",
    contactEmail: "policies@example.invalid",
    documents: DEMO_LEGAL_DOCUMENTS,
  },
};

export default config;
