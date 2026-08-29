import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { ExperienceCard } from "@/components/marketplace/ExperienceCard";
import {
  HostTrustSummary,
  VerifiedIdentityIndicator,
} from "@/components/marketplace/HostPreview";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { averageRating, toPublicReview } from "@/domain/review";
import { requireCapability } from "@/lib/guard";

/**
 * Public host profile.
 *
 * Renders `host.public` and nothing else. The private record exists (legal name,
 * email, payout identity) but is unreachable from this page's data — it is never
 * loaded here, so it cannot leak into the HTML.
 *
 * Only an approximate region is shown, never a precise location, which is also
 * the rule future in-person support must follow.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  const host = await getRepositories().experiences.getHostByHandle(
    CURRENT_TENANT,
    params.handle
  );
  if (!host) return { title: "Not found" };
  return {
    title: `${host.public.displayName} — ${client.config.site.brand.name}`,
    description: host.headline,
  };
}

export default async function HostPage({ params }: { params: { handle: string } }) {
  requireCapability("marketplace.hosts");

  const repos = getRepositories();
  const host = await repos.experiences.getHostByHandle(CURRENT_TENANT, params.handle);
  if (!host) notFound();

  const [experiences, reviews] = await Promise.all([
    repos.experiences.listByHost(CURRENT_TENANT, host.id),
    repos.reputation.listForHost(CURRENT_TENANT, host.id),
  ]);

  const cards = await Promise.all(
    experiences.map(async (experience) => {
      const occurrences = await repos.experiences.listOccurrences(
        CURRENT_TENANT,
        experience.id
      );
      const next = occurrences.find(
        (o) => o.status === "scheduled" && new Date(o.startsAt) > new Date()
      );
      return { experience, next };
    })
  );

  const rating = averageRating(reviews);

  return (
    <Container className="py-12">
      <header className="flex flex-wrap items-start gap-6 border-b border-border pb-8">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-2xl font-bold text-primary-fg"
          aria-hidden="true"
        >
          {host.public.displayName.charAt(0)}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-3xl font-bold text-fg">
            {host.public.displayName}
          </h1>
          <p className="mt-1.5 text-muted">{host.headline}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <VerifiedIdentityIndicator verified={host.public.identityVerified} />
            {host.approximateRegion && <span>{host.approximateRegion}</span>}
            <span>Speaks {host.languages.join(", ")}</span>
          </div>
        </div>
      </header>

      <section className="border-b border-border py-8">
        <h2 className="sr-only">Track record</h2>
        <HostTrustSummary trust={host.trust} />
        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted">
          {client.terms.provider({ plural: true })} appear under a chosen public
          name. Legal identity, contact details and payment information are held
          privately by the platform and are never shown to other members.
        </p>
      </section>

      <section className="py-8">
        <h2 className="font-heading text-xl font-bold text-fg">
          About {host.public.displayName}
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">{host.bio}</p>
      </section>

      {cards.length > 0 && (
        <section className="border-t border-border py-8">
          <h2 className="font-heading text-xl font-bold text-fg">
            {client.terms.listing({ plural: true })}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ experience, next }) => (
              <ExperienceCard
                key={experience.id}
                experience={experience}
                hostName={host.public.displayName}
                nextOccurrence={next}
                listingTerm={client.terms.listing()}
              />
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="border-t border-border py-8">
          <h2 className="font-heading text-xl font-bold text-fg">
            Reviews {rating !== undefined && `· ${rating.toFixed(1)}★`}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => {
              const pub = toPublicReview(review, "A guest");
              return (
                <li
                  key={pub.id}
                  className="rounded-theme border border-border bg-surface p-5"
                >
                  <p className="text-sm text-accent">{"★".repeat(pub.rating)}</p>
                  {pub.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {pub.comment}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Container>
  );
}
