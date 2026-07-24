import type { SiteConfig } from "@/config/types";

/**
 * DEMO CLIENT #2 — "Mentor Academy"
 * Same coaching mission as Teen Edge, PLUS an online content library and
 * (later) live video sessions/webinars. Shows the `content` module toggled on.
 */
const config: SiteConfig = {
  slug: "mentor-academy",

  brand: {
    name: "Mentor Academy",
    tagline: "Coaching + a library of on-demand guidance",
    logo: { src: "/clients/mentor-academy/assets/logo.svg", alt: "Mentor Academy logo" },
    domain: "mentoracademy.example.com",
  },

  theme: {
    colors: {
      primary: "#7c3aed", // violet
      primaryFg: "#ffffff",
      secondary: "#1e1b4b",
      secondaryFg: "#ffffff",
      accent: "#22d3ee",
      accentFg: "#0f172a",
      bg: "#ffffff",
      surface: "#faf5ff",
      fg: "#1e1b4b",
      muted: "#5b5570",
      border: "#e9d5ff",
    },
    fonts: {
      sans: "'Inter', system-ui, sans-serif",
      heading: "'Inter', system-ui, sans-serif",
    },
    radius: "0.5rem",
    mode: "light",
  },

  contact: { email: "hello@mentoracademy.example.com" },

  nav: {
    links: [
      { label: "Programs", href: "#services" },
      { label: "Library", href: "#content" },
      { label: "Pricing", href: "#pricing" },
    ],
    cta: { label: "Start free", href: "#booking", emphasized: true },
  },

  sections: {
    hero: {
      eyebrow: "Coaching + on-demand",
      headline: "Coaching your teen can access anytime",
      subheadline:
        "Live one-to-one coaching plus a growing library of short videos on habits, focus, and resilience — watch together or on their own schedule.",
      ctaPrimary: { label: "Start free", href: "#booking", emphasized: true },
      ctaSecondary: { label: "Browse the library", href: "#content" },
      highlights: ["50+ video lessons", "New live sessions weekly"],
    },
    services: {
      heading: "Two ways to grow",
      items: [
        {
          title: "1:1 Coaching",
          description: "Personal sessions tailored to your teen's goals.",
          icon: "compass",
        },
        {
          title: "On-Demand Library",
          description: "Bite-sized lessons your teen can watch anytime.",
          icon: "play",
        },
        {
          title: "Live Workshops",
          description: "Weekly group sessions on a rotating theme.",
          icon: "video",
        },
      ],
    },
    pricing: {
      heading: "Membership",
      tiers: [
        {
          name: "Library",
          price: "$19",
          cadence: "/month",
          description: "Full access to on-demand content.",
          features: ["50+ video lessons", "New videos monthly", "Cancel anytime"],
          cta: { label: "Start free", href: "#booking" },
        },
        {
          name: "Coaching + Library",
          price: "$149",
          cadence: "/month",
          description: "Everything, plus weekly 1:1 coaching.",
          features: ["Weekly 1:1 sessions", "Full library access", "Live workshops"],
          cta: { label: "Book intro call", href: "#booking" },
          featured: true,
        },
      ],
    },
    cta: {
      heading: "Start with a free week",
      button: { label: "Start free", href: "#booking", emphasized: true },
    },
  },

  modules: {
    booking: { enabled: true, provider: "calcom", embed: { url: "https://cal.com/your-handle/intro" } },
    content: {
      enabled: true,
      library: { heading: "The Library", provider: "youtube", gated: true },
      live: { enabled: true, provider: "zoom" },
    },
    community: { enabled: false },
  },

  integrations: { formEndpoint: "/api/lead" },

  seo: {
    title: "Mentor Academy — Coaching + on-demand guidance for teens",
    description:
      "Live coaching plus a library of on-demand videos and weekly live workshops on habits, focus and resilience.",
  },
};

export default config;
