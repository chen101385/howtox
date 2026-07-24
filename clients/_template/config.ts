import type { SiteConfig } from "@/config/types";

/**
 * TEMPLATE CLIENT — copy this folder to clients/<your-slug>/ and edit.
 * Anything optional can be deleted; the matching section simply won't render.
 */
const config: SiteConfig = {
  slug: "_template",

  brand: {
    name: "Your Business",
    tagline: "A short line about what you do",
    logo: { src: "/clients/_template/assets/logo.svg", alt: "Your Business logo" },
    domain: "example.com",
  },

  theme: {
    colors: {
      primary: "#2563eb",
      primaryFg: "#ffffff",
      secondary: "#0f172a",
      secondaryFg: "#ffffff",
      accent: "#f59e0b",
      accentFg: "#0f172a",
      bg: "#ffffff",
      surface: "#f8fafc",
      fg: "#0f172a",
      muted: "#64748b",
      border: "#e2e8f0",
    },
    fonts: {
      sans: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      heading: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    },
    radius: "0.75rem",
    mode: "light",
  },

  contact: {
    email: "hello@example.com",
    phone: "",
  },

  nav: {
    links: [
      { label: "Services", href: "#services" },
      { label: "About", href: "#about" },
      { label: "Contact", href: "#contact" },
    ],
    cta: { label: "Book a call", href: "#booking", emphasized: true },
  },

  sections: {
    hero: {
      eyebrow: "Eyebrow text",
      headline: "The main promise, in one clear line",
      subheadline: "A supporting sentence that explains who this is for and why it matters.",
      ctaPrimary: { label: "Get started", href: "#booking", emphasized: true },
      ctaSecondary: { label: "Learn more", href: "#services" },
      highlights: ["Trust signal one", "Trust signal two"],
    },
  },

  modules: {
    booking: { enabled: false, provider: "calcom" },
    content: { enabled: false },
    community: { enabled: false },
  },

  seo: {
    title: "Your Business — tagline",
    description: "A concise description for search engines and social sharing.",
  },
};

export default config;
