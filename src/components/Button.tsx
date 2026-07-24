import type { Link as LinkType } from "@/config/types";

/**
 * Config-driven link/button. `emphasized` → filled primary button;
 * otherwise a subtle outline. All colors come from theme CSS vars.
 */
export function Button({
  link,
  size = "md",
  className = "",
}: {
  link: LinkType;
  size?: "md" | "lg";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-theme font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const sizes = size === "lg" ? "px-7 py-3.5 text-base" : "px-5 py-2.5 text-sm";
  const variant = link.emphasized
    ? "bg-primary text-primary-fg hover:opacity-90"
    : "border border-border text-fg hover:bg-surface";

  return (
    <a
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener noreferrer" : undefined}
      className={`${base} ${sizes} ${variant} ${className}`}
    >
      {link.label}
    </a>
  );
}
