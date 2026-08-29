import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { BookingPanel, type OccurrenceOption } from "@/components/marketplace/BookingControls";
import { ExperienceSampleView } from "@/components/marketplace/ExperienceSample";
import { HostPreview } from "@/components/marketplace/HostPreview";
import { RecordingPolicyNotice } from "@/components/marketplace/RecordingPolicyNotice";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { isBookable, seatsRemaining } from "@/domain/experience";
import { DEFAULT_COMPENSATION_POLICY } from "@/domain/ledger";
import { toPublicReview, averageRating } from "@/domain/review";
import { categoryLabel, duration, occurrenceDateTime } from "@/lib/format";
import { requireCapability } from "@/lib/guard";

/**
 * Experience detail — the page a guest decides from.
 *
 * Only serializable view models cross into the client BookingPanel: prices go as
 * minor units, never as `Money` objects with methods or as formatted strings.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const experience = await getRepositories().experiences.getBySlug(
    CURRENT_TENANT,
    params.slug
  );
  if (!experience) return { title: "Not found" };
  return {
    title: `${experience.title} — ${client.config.site.brand.name}`,
    description: experience.tagline,
  };
}

export default async function ExperiencePage({
  params,
}: {
  params: { slug: string };
}) {
  requireCapability("marketplace.listings");

  const repos = getRepositories();
  const experience = await repos.experiences.getBySlug(CURRENT_TENANT, params.slug);
  if (!experience) notFound();

  const [host, occurrences, reviews] = await Promise.all([
    repos.experiences.getHost(CURRENT_TENANT, experience.hostId),
    repos.experiences.listOccurrences(CURRENT_TENANT, experience.id),
    repos.reputation.listForExperience(CURRENT_TENANT, experience.id),
  ]);

  const bookable = occurrences.filter((o) => isBookable(o));
  const options: OccurrenceOption[] = bookable.map((o) => ({
    id: o.id,
    startsAt: o.startsAt,
    timezone: o.timezone,
    bookingMode: o.bookingMode,
    capacity: o.capacity,
    seatsRemaining: seatsRemaining(o),
    priceMinor:
      o.pricePerSeat?.amountMinor ??
      experience.pricing.perSeat?.amountMinor ??
      experience.pricing.oneToOne?.amountMinor ??
      experience.pricing.privateGroup?.amountMinor ??
      0,
    currency: client.config.product.currency,
  }));

  const policy = client.config.policies.compensation ?? DEFAULT_COMPENSATION_POLICY;
  const recording = client.config.policies.recording;
  const rating = averageRating(reviews);

  return (
    <Container className="py-12">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/discover" className="hover:text-fg">
          {client.terms.listing({ plural: true })}
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href={`/discover?category=${experience.category}`}
          className="hover:text-fg"
        >
          {categoryLabel(experience.category)}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-10">
          <header>
            <p className="text-sm font-medium text-primary">
              {categoryLabel(experience.category)} ·{" "}
              {duration(experience.durationMinutes)} · Remote
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold leading-tight text-fg sm:text-4xl">
              {experience.title}
            </h1>
            <p className="mt-3 text-lg text-muted">{experience.tagline}</p>
            {rating !== undefined && (
              <p className="mt-3 text-sm text-muted">
                {rating.toFixed(1)}★ from {reviews.length}{" "}
                {reviews.length === 1 ? "review" : "reviews"}
              </p>
            )}
          </header>

          <div className="overflow-hidden rounded-theme border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={experience.cover.src}
              alt={experience.cover.alt}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>

          <section>
            <h2 className="font-heading text-xl font-bold text-fg">
              About this {client.terms.listing({ lower: true })}
            </h2>
            <p className="mt-3 leading-relaxed text-muted">{experience.description}</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-fg">What to expect</h2>
            <ul className="mt-3 space-y-2">
              {experience.whatToExpect.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
                  <span aria-hidden="true" className="text-accent">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-muted">Languages</dt>
                <dd className="text-fg">{experience.languages.join(", ")}</dd>
              </div>
              {experience.minimumAge && (
                <div>
                  <dt className="text-muted">Minimum age</dt>
                  <dd className="text-fg">{experience.minimumAge}+</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Delivery</dt>
                <dd className="text-fg">Remote only</dd>
              </div>
            </dl>
          </section>

          {experience.samples.length > 0 && (
            <section>
              <h2 className="font-heading text-xl font-bold text-fg">
                Watch a sample
              </h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                {experience.samples.map((sample) => (
                  <ExperienceSampleView
                    key={sample.id}
                    sample={sample}
                    listingTerm={client.terms.listing({ lower: true })}
                    showPolicyNote={Boolean(recording?.samplesExempt)}
                  />
                ))}
              </div>
            </section>
          )}

          {host && (
            <section>
              <h2 className="font-heading text-xl font-bold text-fg">
                Your {client.terms.provider({ lower: true })}
              </h2>
              <div className="mt-4">
                <HostPreview
                  host={host}
                  providerTerm={client.terms.provider()}
                  showBio
                />
              </div>
            </section>
          )}

          {reviews.length > 0 && (
            <section>
              <h2 className="font-heading text-xl font-bold text-fg">Reviews</h2>
              <ul className="mt-4 space-y-4">
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
                      <p className="mt-2 text-xs text-muted">{pub.authorDisplayName}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <BookingPanel
            experienceSlug={experience.slug}
            experienceTitle={experience.title}
            availableModes={experience.bookingModes}
            occurrences={options}
            modePricingMinor={{
              one_to_one: experience.pricing.oneToOne?.amountMinor,
              private_group: experience.pricing.privateGroup?.amountMinor,
              crowdshared: experience.pricing.perSeat?.amountMinor,
            }}
            currency={client.config.product.currency}
            policy={policy}
            maxCrowdsharedSeats={
              client.config.policies.marketplace?.maxCrowdsharedSeats ?? 10
            }
            terms={{
              provider: client.terms.provider(),
              customer: client.terms.customer(),
              crowdshared: client.terms.groupBooking(),
            }}
          />

          {bookable.length > 0 && (
            <section className="rounded-theme border border-border bg-surface p-5">
              <h2 className="font-heading text-sm font-semibold text-fg">
                Upcoming {client.terms.occurrence({ plural: true, lower: true })}
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {bookable.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex justify-between gap-2">
                    <Link href={`/events/${o.id}`} className="text-muted hover:text-fg">
                      {occurrenceDateTime(o.startsAt, o.timezone)}
                    </Link>
                    <span className="text-xs text-muted">
                      {seatsRemaining(o)} left
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recording && (
            <RecordingPolicyNotice
              variant="full"
              watermarkEnabled={recording.watermarkEnabled}
              platformRecordingEnabled={recording.platformRecordingEnabled}
            />
          )}
        </aside>
      </div>
    </Container>
  );
}
