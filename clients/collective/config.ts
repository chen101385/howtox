import type { SiteConfig } from "@/config/types";

/**
 * DEMO CLIENT #3 — "The Collective"
 * A members' community: forum with public, private and DM channels where
 * members connect, share ideas and collaborate. Shows the `community` module
 * toggled on. Marketing landing sells the membership; the app itself is built
 * out in a later phase.
 */
const config: SiteConfig = {
  slug: "collective",

  brand: {
    name: "The Collective",
    tagline: "Where members connect, share and build together",
    logo: { src: "/clients/collective/assets/logo.svg", alt: "The Collective logo" },
    domain: "thecollective.example.com",
  },

  theme: {
    colors: {
      primary: "#e11d48", // rose
      primaryFg: "#ffffff",
      secondary: "#111827",
      secondaryFg: "#ffffff",
      accent: "#fbbf24",
      accentFg: "#111827",
      bg: "#0b0f17",
      surface: "#111827",
      fg: "#f9fafb",
      muted: "#9ca3af",
      border: "#1f2937",
    },
    fonts: {
      sans: "'Inter', system-ui, sans-serif",
      heading: "'Inter', system-ui, sans-serif",
    },
    radius: "0.75rem",
    mode: "dark",
  },

  contact: { email: "hello@thecollective.example.com" },

  nav: {
    links: [
      { label: "Why join", href: "#services" },
      { label: "Members", href: "#testimonials" },
      { label: "Pricing", href: "#pricing" },
    ],
    cta: { label: "Request an invite", href: "#booking", emphasized: true },
  },

  sections: {
    hero: {
      eyebrow: "A private members' community",
      headline: "Find your people. Build something together.",
      subheadline:
        "A space to connect with like-minded members, share ideas in the open, collaborate in private groups, and message directly.",
      ctaPrimary: { label: "Request an invite", href: "#booking", emphasized: true },
      ctaSecondary: { label: "How it works", href: "#services" },
      highlights: ["Public & private channels", "Direct messaging", "Member-led collaboration"],
    },
    services: {
      heading: "What you get inside",
      items: [
        {
          title: "Public channels",
          description: "Open discussions anyone in the community can join.",
          icon: "globe",
        },
        {
          title: "Private groups",
          description: "Invite-only spaces for focused collaboration.",
          icon: "lock",
        },
        {
          title: "Direct messages",
          description: "One-to-one conversations with other members.",
          icon: "message",
        },
      ],
    },
    testimonials: {
      heading: "From our members",
      items: [
        {
          quote: "I found two collaborators here within a month. This is the good part of the internet.",
          author: "Jordan P.",
          role: "Founding member",
        },
      ],
    },
    pricing: {
      heading: "Membership",
      tiers: [
        {
          name: "Member",
          price: "$12",
          cadence: "/month",
          description: "Full access to the community.",
          features: ["All public channels", "Join private groups", "Direct messaging"],
          cta: { label: "Request an invite", href: "#booking" },
          featured: true,
        },
      ],
    },
    cta: {
      heading: "Ready to join?",
      subheading: "Membership is invite-reviewed to keep the community high-signal.",
      button: { label: "Request an invite", href: "#booking", emphasized: true },
    },
  },

  modules: {
    booking: { enabled: false, provider: "internal" },
    content: { enabled: false },
    community: {
      enabled: true,
      channels: { public: true, private: true, directMessages: true },
      provider: "internal",
      moderation: { enabled: true },
    },
  },

  integrations: { formEndpoint: "/api/lead" },

  seo: {
    title: "The Collective — a private members' community",
    description:
      "Connect, share ideas and collaborate in public and private channels with direct messaging. Request an invite.",
  },
};

export default config;
