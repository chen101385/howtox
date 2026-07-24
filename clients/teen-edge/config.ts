import type { SiteConfig } from "@/config/types";

/**
 * DEMO CLIENT #1 — "Teen Edge"
 * Coaching for parents who want to give their teenagers an edge: positive
 * habits, grit, resilience, and a vision for long-term goals.
 * Marketing + booking (external scheduler). Content/community off.
 */
const config: SiteConfig = {
  slug: "teen-edge",

  brand: {
    name: "Teen Edge",
    tagline: "Habits, grit, and direction for the teenage years",
    logo: { src: "/clients/teen-edge/assets/logo.svg", alt: "Teen Edge logo" },
    domain: "teenedge.example.com",
  },

  theme: {
    colors: {
      primary: "#0d9488", // teal
      primaryFg: "#ffffff",
      secondary: "#0f172a",
      secondaryFg: "#ffffff",
      accent: "#f97316", // warm orange
      accentFg: "#0f172a",
      bg: "#ffffff",
      surface: "#f0fdfa",
      fg: "#0f172a",
      muted: "#475569",
      border: "#d1e7e3",
    },
    fonts: {
      sans: "'Inter', system-ui, sans-serif",
      heading: "'Inter', system-ui, sans-serif",
    },
    radius: "1rem",
    mode: "light",
  },

  contact: {
    email: "hello@teenedge.example.com",
    phone: "+1 (555) 010-2030",
    hours: "Mon–Fri, 9am–6pm",
    socials: [
      { platform: "Instagram", href: "https://instagram.com" },
      { platform: "LinkedIn", href: "https://linkedin.com" },
    ],
  },

  nav: {
    links: [
      { label: "Programs", href: "#services" },
      { label: "How it works", href: "#about" },
      { label: "Results", href: "#testimonials" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: { label: "Book a free intro call", href: "#booking", emphasized: true },
  },

  sections: {
    hero: {
      eyebrow: "For parents of 13–18 year olds",
      headline: "Give your teenager an edge that lasts a lifetime",
      subheadline:
        "One-to-one coaching that helps teens build positive habits, develop grit and resilience, and discover a vision for what they actually want.",
      ctaPrimary: { label: "Book a free intro call", href: "#booking", emphasized: true },
      ctaSecondary: { label: "See the programs", href: "#services" },
      highlights: ["500+ families coached", "Backed by behavioral science", "No lock-in contracts"],
    },
    services: {
      heading: "Programs built around your teen",
      subheading: "Start with a free intro call — we'll recommend the right fit.",
      items: [
        {
          title: "Habits & Focus",
          description:
            "Build the daily systems that make school, sleep and screen-time work with your teen instead of against them.",
          icon: "target",
          duration: "8 weeks",
        },
        {
          title: "Grit & Resilience",
          description:
            "Turn setbacks into fuel. Practical tools for handling pressure, failure and self-doubt.",
          icon: "shield",
          duration: "8 weeks",
        },
        {
          title: "Vision & Purpose",
          description:
            "Help your teen uncover what genuinely excites them and set goals worth chasing.",
          icon: "compass",
          duration: "6 weeks",
        },
      ],
    },
    about: {
      heading: "How it works",
      body:
        "Every teen starts with a free intro call so we understand where they are and what matters to them. From there we build a weekly rhythm of one-to-one sessions, small challenges, and check-ins that create momentum. Parents get a monthly progress summary — support without hovering.",
      stats: [
        { value: "500+", label: "families coached" },
        { value: "92%", label: "renew after term one" },
        { value: "4.9/5", label: "parent rating" },
      ],
    },
    testimonials: {
      heading: "What parents say",
      items: [
        {
          quote:
            "My son went from dreading Sunday nights to planning his own week. The change in confidence is night and day.",
          author: "Sarah M.",
          role: "Parent of a 15-year-old",
        },
        {
          quote:
            "They didn't just push productivity hacks — they helped my daughter figure out what she cares about.",
          author: "David R.",
          role: "Parent of a 17-year-old",
        },
      ],
    },
    pricing: {
      heading: "Simple, transparent pricing",
      tiers: [
        {
          name: "Single Program",
          price: "$480",
          cadence: "per term",
          description: "One focused program, weekly sessions.",
          features: ["Weekly 1:1 sessions", "Monthly parent summary", "Session workbooks"],
          cta: { label: "Get started", href: "#booking" },
        },
        {
          name: "Full Journey",
          price: "$1,200",
          cadence: "per year",
          description: "All three programs across the year.",
          features: [
            "Everything in Single Program",
            "All three programs",
            "Priority scheduling",
            "Quarterly parent call",
          ],
          cta: { label: "Book intro call", href: "#booking" },
          featured: true,
        },
      ],
    },
    faq: {
      heading: "Common questions",
      items: [
        {
          question: "How involved do I need to be as a parent?",
          answer:
            "Very little day-to-day. You'll get a monthly summary and can request a call any time, but the coaching relationship is directly with your teen.",
        },
        {
          question: "What ages do you work with?",
          answer: "We focus on ages 13–18. The approach adapts to where your teen is developmentally.",
        },
        {
          question: "Is it online or in person?",
          answer: "Sessions are online by default, which most teens prefer. In-person is available in select cities.",
        },
      ],
    },
    cta: {
      heading: "Ready to give your teen an edge?",
      subheading: "The free intro call takes 20 minutes and there's no obligation.",
      button: { label: "Book a free intro call", href: "#booking", emphasized: true },
    },
  },

  modules: {
    booking: {
      enabled: true,
      provider: "calcom",
      embed: { url: "https://cal.com/your-handle/intro" },
      services: [
        { id: "intro", name: "Free intro call", duration: 20 },
        { id: "session", name: "Coaching session", duration: 50, price: "$60" },
      ],
      timezone: "America/Los_Angeles",
    },
    content: { enabled: false },
    community: { enabled: false },
  },

  integrations: {
    formEndpoint: "/api/lead",
  },

  seo: {
    title: "Teen Edge — Coaching that gives teenagers an edge",
    description:
      "One-to-one coaching helping teens build habits, grit, resilience and a vision for their goals. Book a free intro call.",
  },
};

export default config;
