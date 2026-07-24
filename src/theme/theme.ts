import type { CSSProperties } from "react";
import type { ThemeConfig } from "@/config/types";

/**
 * Converts a client's ThemeConfig into a style object of CSS custom properties.
 * Attach the result to a top-level element (see app/layout.tsx) and every
 * `bg-primary`, `text-fg`, `rounded-theme`, `font-heading` utility resolves to
 * the client's brand automatically. A full rebrand = editing hex values here.
 */
export function themeToCssVars(theme: ThemeConfig): CSSProperties {
  const { colors, fonts, radius } = theme;
  return {
    "--color-primary": colors.primary,
    "--color-primary-fg": colors.primaryFg,
    "--color-secondary": colors.secondary,
    "--color-secondary-fg": colors.secondaryFg,
    "--color-accent": colors.accent,
    "--color-accent-fg": colors.accentFg,
    "--color-bg": colors.bg,
    "--color-surface": colors.surface,
    "--color-fg": colors.fg,
    "--color-muted": colors.muted,
    "--color-border": colors.border,
    "--font-sans": fonts.sans,
    "--font-heading": fonts.heading,
    "--radius": radius,
  } as CSSProperties;
}
