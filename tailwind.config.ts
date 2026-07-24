import type { Config } from "tailwindcss";

/**
 * Colors, fonts and radius all resolve to CSS custom properties that are
 * injected at runtime from the active client's config (see src/theme).
 * This is what makes a full rebrand possible with zero CSS edits.
 */
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./clients/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          fg: "var(--color-primary-fg)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          fg: "var(--color-secondary-fg)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          fg: "var(--color-accent-fg)",
        },
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        fg: "var(--color-fg)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        heading: "var(--font-heading)",
      },
      borderRadius: {
        theme: "var(--radius)",
      },
      maxWidth: {
        content: "80rem",
      },
    },
  },
  plugins: [],
};

export default config;
