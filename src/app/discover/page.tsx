import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { ExperienceCard } from "@/components/marketplace/ExperienceCard";
import { IntentFilters } from "@/components/marketplace/IntentFilters";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import {
  DISCOVERY_INTENTS,
  EXPERIENCE_CATEGORIES,
  INTENT_LABELS,
  CATEGORY_LABELS,
  type DiscoveryIntent,
  type ExperienceCategory,
} from "@/domain/experience";
import { money } from "@/domain/money";
import { requireCapability } from "@/lib/guard";

/**
 * Discovery.
 *
 * Filters arrive as query parameters rather than client state so every filtered
 * view is linkable and works without JavaScript. Unrecognized values are ignored
 * instead of erroring — a stale shared link should still show something useful.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Discover — ${client.config.site.brand.name}`,
  description: client.config.site.seo.description,
};

function parseIntent(value?: string): DiscoveryIntent | undefined {
  return DISCOVERY_INTENTS.find((i) => i === value);
}

function parseCategory(value?: string): ExperienceCategory | undefined {
  return EXPERIENCE_CATEGORIES.find((c) => c === value);
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { intent?: string; category?: string; max?: string; q?: string };
}) {
  requireCapability("discovery.browse", "marketplace.listings");

  const intent = parseIntent(searchParams.intent);
  const category = parseCategory(searchParams.category);
  const maxMinor = Number(searchParams.max);
  const maxPrice =
    Number.isFinite(maxMinor) && maxMinor > 0
      ? money(Math.round(maxMinor), client.config.product.currency)
      : undefined;

  const repos = getRepositories();
  const experiences = await repos.experiences.list({
    tenantId: CURRENT_TENANT,
    intent,
    category,
    maxPrice,
    search: searchParams.q,
  });

  const cards = await Promise.all(
    experiences.map(async (experience) => {
      const host = await repos.experiences.getHost(CURRENT_TENANT, experience.hostId);
      const occurrences = await repos.experiences.listOccurrences(
        CURRENT_TENANT,
        experience.id
      );
      const next = occurrences.find(
        (o) => o.status === "scheduled" && new Date(o.startsAt) > new Date()
      );
      return { experience, hostName: host?.public.displayName ?? "", next };
    })
  );

  const activeLabel = intent
    ? INTENT_LABELS[intent]
    : category
      ? CATEGORY_LABELS[category]
      : null;

  return (
    <Container className="py-12">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-fg sm:text-4xl">
          {activeLabel ?? `All ${client.terms.listing({ plural: true, lower: true })}`}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {cards.length}{" "}
          {cards.length === 1
            ? client.terms.listing({ lower: true })
            : client.terms.listing({ plural: true, lower: true })}
          {activeLabel ? " match this filter" : " available"}
        </p>
      </header>

      <div className="mb-10">
        <IntentFilters
          activeIntent={intent}
          activeCategory={category}
          crowdsharedTerm={client.terms.groupBooking()}
        />
      </div>

      {cards.length === 0 ? (
        <p className="rounded-theme border border-border bg-surface p-8 text-center text-sm text-muted">
          Nothing matches that filter yet. Try a different one.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ experience, hostName, next }) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              hostName={hostName}
              nextOccurrence={next}
              listingTerm={client.terms.listing()}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
