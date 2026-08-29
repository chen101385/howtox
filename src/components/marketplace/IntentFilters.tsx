import Link from "next/link";
import {
  CATEGORY_LABELS,
  DISCOVERY_INTENTS,
  EXPERIENCE_CATEGORIES,
  INTENT_LABELS,
  type DiscoveryIntent,
  type ExperienceCategory,
} from "@/domain/experience";

/**
 * Intent-first discovery.
 *
 * Someone browsing because they're bored does not know what category they want —
 * they know they have a free evening, or friends coming over. These filters are
 * therefore mood- and occasion-shaped, with taxonomy offered underneath.
 *
 * Implemented as links rather than client-side state so filtering works without
 * JavaScript and each filtered view is shareable.
 */
export function IntentFilters({
  activeIntent,
  activeCategory,
  basePath = "/discover",
  showCategories = true,
  crowdsharedTerm,
}: {
  activeIntent?: DiscoveryIntent;
  activeCategory?: ExperienceCategory;
  basePath?: string;
  showCategories?: boolean;
  crowdsharedTerm?: string;
}) {
  const intentLabel = (intent: DiscoveryIntent) =>
    intent === "join_a_small_crowd" && crowdsharedTerm
      ? `Join a ${crowdsharedTerm.toLowerCase()} event`
      : INTENT_LABELS[intent];

  return (
    <nav aria-label="Browse by intent" className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        <li>
          <FilterChip href={basePath} active={!activeIntent && !activeCategory}>
            Everything
          </FilterChip>
        </li>
        {DISCOVERY_INTENTS.map((intent) => (
          <li key={intent}>
            <FilterChip
              href={`${basePath}?intent=${intent}`}
              active={activeIntent === intent}
            >
              {intentLabel(intent)}
            </FilterChip>
          </li>
        ))}
      </ul>

      {showCategories && (
        <ul className="flex flex-wrap gap-2 border-t border-border pt-4">
          {EXPERIENCE_CATEGORIES.map((category) => (
            <li key={category}>
              <FilterChip
                href={`${basePath}?category=${category}`}
                active={activeCategory === category}
                subtle
              >
                {CATEGORY_LABELS[category]}
              </FilterChip>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function FilterChip({
  href,
  active,
  subtle = false,
  children,
}: {
  href: string;
  active: boolean;
  subtle?: boolean;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const style = active
    ? "bg-primary text-primary-fg font-medium"
    : subtle
      ? "border border-border text-muted hover:text-fg hover:border-primary/60"
      : "border border-border text-fg hover:border-primary/60 hover:bg-surface";

  return (
    <Link href={href} className={`${base} ${style}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
