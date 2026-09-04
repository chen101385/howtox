import type { ClientConfig } from "@/config/client-config";
import { APPOINTMENTS_TERMINOLOGY } from "@/config/terminology";

/**
 * How to X — one-to-one appointments for people who need a clear next step
 * on a skill, project, or decision they've been circling.
 *
 * Appointments preset: marketing + booking. Business records (bookings,
 * customers, sessions) do NOT belong here — they live in repositories.
 */
const config: ClientConfig = {
  slug: "how-to-x",

  site: {
    brand: {
      name: "How to X",
      tagline: "Sit down with the thing you've been circling",
      logo: {
        src: "/clients/how-to-x/assets/logo.svg",
        alt: "How to X logo",
      },
      domain: "howto-x.example.com",
    },

    theme: {
      colors: {
        // Warm paper, espresso and copper — deliberately unlike the other
        // demo clients so a rebrand is visible at a glance.
        primary: "#8c4a2f",
        primaryFg: "#fffaf5",
        secondary: "#1f1714",
        secondaryFg: "#fffaf5",
        accent: "#c4a35a",
        accentFg: "#1f1714",
        bg: "#fbf7f2",
        surface: "#f4ebe3",
        fg: "#1f1714",
        muted: "#6b5e56",
        border: "#e4d6c9",
      },
      fonts: {
        sans: "'Inter', system-ui, sans-serif",
        heading: "'Inter', system-ui, sans-serif",
      },
      radius: "0.625rem",
      mode: "light",
    },

    contact: {
      email: "hello@howto-x.example.com",
      hours: "Tue–Thu, 10am–6pm",
    },

    nav: {
      links: [
        { label: "Services", href: "#services" },
        { label: "How it works", href: "#about" },
        { label: "Pricing", href: "#pricing" },
        { label: "FAQ", href: "#faq" },
      ],
      cta: { label: "Book a first session", href: "#booking", emphasized: true },
    },

    seo: {
      title: "How to X — one-to-one sessions for the thing you've been circling",
      description:
        "Book a working session with How to X. We help you name the skill, project, or decision you've been circling, then leave with a next step you can actually take.",
    },

    sections: {
      hero: {
        eyebrow: "One-to-one appointments",
        headline: "The thing you've been circling has a next step",
        subheadline:
          "How to X is a working session, not a pep talk. Bring the skill, project, or decision that's been sitting in the back of your mind. We'll name it, cut it down to size, and book the work.",
        ctaPrimary: { label: "Book a first session", href: "#booking", emphasized: true },
        ctaSecondary: { label: "See how sessions work", href: "#about" },
        highlights: ["Remote by default", "No package lock-in", "Leave with a written next step"],
      },
      services: {
        heading: "What we sit down for",
        subheading: "Pick the shape that matches where you are. Every session is one-to-one.",
        items: [
          {
            title: "First session",
            description:
              "Forty-five minutes to name the X, what's blocking it, and whether working together is a good fit. No homework until we both say yes.",
            icon: "message",
            duration: "45 min",
          },
          {
            title: "Working session",
            description:
              "A focused hour on one skill, decision, or draft. You leave with a next action small enough to start the same day.",
            icon: "target",
            duration: "60 min",
          },
          {
            title: "Ongoing practice",
            description:
              "A weekly or fortnightly rhythm for people who already know the X and need someone in the chair while they do it.",
            icon: "compass",
            duration: "60 min",
          },
        ],
      },
      about: {
        heading: "How a session actually goes",
        body:
          "You book a time. Before we meet, you send a short note about the X — a skill you want, a project that's stalled, a decision you keep postponing. We spend the session on that, not on a generic intake. You get a written recap the same day: what we named, what you're trying next, and when it makes sense to meet again. If it doesn't, that's a fine outcome too.",
        stats: [
          { value: "1:1", label: "every session" },
          { value: "Same day", label: "written recap" },
          { value: "Remote", label: "from wherever you work" },
        ],
      },
      testimonials: {
        heading: "What people say after",
        items: [
          {
            quote:
              "I came in with a vague 'I should get better at this.' I left with a two-week plan I actually started on Tuesday.",
            author: "Maya K.",
            role: "Product designer",
          },
          {
            quote:
              "No jargon, no funnel. We talked about the work, I booked another hour, and that was the whole relationship.",
            author: "James L.",
            role: "Independent consultant",
          },
        ],
      },
      pricing: {
        heading: "Pay for the hour, not a programme",
        subheading: "Start with one session. Continue only if it's useful.",
        tiers: [
          {
            name: "First session",
            price: "$90",
            cadence: "one-off",
            description: "Name the X and decide whether to keep going.",
            features: ["45-minute call", "Same-day recap", "No follow-up obligation"],
            cta: { label: "Book a first session", href: "#booking" },
          },
          {
            name: "Working session",
            price: "$140",
            cadence: "per hour",
            description: "Focused time on one skill, draft, or decision.",
            features: [
              "60-minute call",
              "Written next step",
              "Book the next hour when you need it",
            ],
            cta: { label: "Book a working session", href: "#booking" },
            featured: true,
          },
        ],
      },
      faq: {
        heading: "Before you book",
        items: [
          {
            question: "What is an 'X' here?",
            answer:
              "Whatever you've been circling: a skill, a stalled project, a decision, a piece of writing. If you can name it in a sentence, we can work on it. If you can't, the first session is for that.",
          },
          {
            question: "Is this therapy, tutoring, or career coaching?",
            answer:
              "None of those, exactly. It's a working appointment. We look at the work in front of you. If you need a clinician, a course, or a specialist, we'll say so.",
          },
          {
            question: "Do I have to buy a package?",
            answer:
              "No. Book one hour. Book another if it helped. There is no term, retainer, or minimum.",
          },
          {
            question: "Are sessions in person?",
            answer:
              "They're remote. You need a quiet room and a decent connection. That's the whole setup.",
          },
        ],
      },
      cta: {
        heading: "Bring the thing you've been putting off",
        subheading: "A first session is 45 minutes. You leave with a next step, even if we don't meet again.",
        button: { label: "Book a first session", href: "#booking", emphasized: true },
      },
    },
  },

  product: {
    preset: "appointments",
    terminology: APPOINTMENTS_TERMINOLOGY,
    currency: "USD",
    timezone: "America/Los_Angeles",
  },

  pages: {
    home: {
      preset: "marketing",
      sections: [
        { id: "hero" },
        { id: "services" },
        { id: "about" },
        { id: "testimonials" },
        { id: "pricing" },
        { id: "faq" },
        { id: "booking" },
        { id: "cta" },
      ],
    },
  },

  modules: ["marketing", "booking"],

  policies: {},

  integrations: {
    formEndpoint: "/api/lead",
    // No scheduler is connected. The booking section renders its "not connected
    // yet" placeholder rather than an iframe pointing at a handle nobody owns;
    // add the real embed URL when the calendar exists.
  },
};

export default config;
