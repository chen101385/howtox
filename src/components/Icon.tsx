import type { IconName } from "@/config/types";

/**
 * Tiny inline-SVG icon registry. Config references icons by name (e.g. "target")
 * so client configs stay free of JSX. Add new glyphs here as needed; unknown
 * names fall back to a neutral dot.
 */
const paths: Record<string, string> = {
  target:
    "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z",
  compass: "M12 2a10 10 0 100 20 10 10 0 000-20zm3.5 6.5l-2 5-5 2 2-5 5-2z",
  play: "M8 5v14l11-7L8 5z",
  video: "M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z",
  globe:
    "M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1.7 0 3.2 2.9 3.7 7H8.3C8.8 6.9 10.3 4 12 4zm-6 8c0-.7.1-1.4.2-2h3.6c-.1.6-.1 1.3-.1 2s0 1.4.1 2H6.2c-.1-.6-.2-1.3-.2-2z",
  lock: "M6 10V7a6 6 0 1112 0v3h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V7a4 4 0 10-8 0v3z",
  message: "M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H8l-4 4V5a1 1 0 011-1z",
  dot: "M12 10a2 2 0 100 4 2 2 0 000-4z",
};

export function Icon({
  name,
  className = "h-6 w-6",
}: {
  name?: IconName;
  className?: string;
}) {
  const d = (name && paths[name]) || paths.dot;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
