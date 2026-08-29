import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { BookingPanel, type OccurrenceOption } from "@/components/marketplace/BookingControls";
import { HostPreview } from "@/components/marketplace/HostPreview";
import { RecordingPolicyNotice } from "@/components/marketplace/RecordingPolicyNotice";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { occurrenceId as toOccurrenceId } from "@/domain/ids";
import { seatsRemaining, resolveSeatPrice } from "@/domain/experience";
import { DEFAULT_COMPENSATION_POLICY } from "@/domain/ledger";
import { bookingModeLabel, duration, occurrenceDateTime, price } from "@/lib/format";
import { requireCapability } from "@/lib/guard";

/**
 * A single scheduled occurrence.
 *
 * Distinct from the experience page because a crowdshared event is a thing people
 * share a link to — "come to this one on Friday" — not a catalogue entry. It is
 * therefore addressable, and its seat inventory is the headline.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { occurrenceId: string };
}): Promise<Metadata> {
  const repos = getRepositories();
  const occurrence = await repos.experiences.getOccurrence(
    CURRENT_TENANT,
    toOccurrenceId(params.occurrenceId)
  );
  if (!occurrence) return { title: "Not found" };
  const experience = await repos.experiences.getById(
    CURRENT_TENANT,
    occurrence.experienceId
  );
  return {
    title: experience
      ? `${experience.title} — ${occurrenceDateTime(occurrence.startsAt, occurrence.timezone)}`
      : "Event",
  };
}

export default async function EventPage({
  params,
}: {
  params: { occurrenceId: string };
}) {
  requireCapability("scheduling.occurrences", "marketplace.listings");

  const repos = getRepositories();
  const occurrence = await repos.experiences.getOccurrence(
    CURRENT_TENANT,
    toOccurrenceId(params.occurrenceId)
  );
  if (!occurrence) notFound();

  const experience = await repos.experiences.getById(
    CURRENT_TENANT,
    occurrence.experienceId
  );
  if (!experience) notFound();

  const host = await repos.experiences.getHost(CURRENT_TENANT, occurrence.hostId);
  const seatPrice = resolveSeatPrice(occurrence, experience);
  const remaining = seatsRemaining(occurrence);
  const soldOut = remaining <= 0 || occurrence.status !== "scheduled";
  const inPast = new Date(occurrence.startsAt).getTime() <= Date.now();

  const option: OccurrenceOption = {
    id: occurrence.id,
    startsAt: occurrence.startsAt,
    timezone: occurrence.timezone,
    bookingMode: occurrence.bookingMode,
    capacity: occurrence.capacity,
    seatsRemaining: remaining,
    priceMinor: seatPrice?.amountMinor ?? 0,
    currency: client.config.product.currency,
  };

  const policy = client.config.policies.compensation ?? DEFAULT_COMPENSATION_POLICY;
  const recording = client.config.policies.recording;

  return (
    <Container className="py-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-8">
          <header>
            <p className="text-sm font-medium text-primary">
              {bookingModeLabel(occurrence.bookingMode, client.terms.groupBooking())} ·{" "}
              {duration(occurrence.durationMinutes)} · Remote
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold leading-tight text-fg sm:text-4xl">
              {experience.title}
            </h1>
            <p className="mt-3 text-lg text-muted">
              {occurrenceDateTime(occurrence.startsAt, occurrence.timezone)}
            </p>
            <Link
              href={`/experiences/${experience.slug}`}
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              View all dates for this {client.terms.listing({ lower: true })} →
            </Link>
          </header>

          <div className="overflow-hidden rounded-theme border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={experience.cover.src}
              alt={experience.cover.alt}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>

          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-theme border border-border bg-surface p-4">
              <dt className="text-xs text-muted">Seats</dt>
              <dd className="mt-1 font-heading text-lg font-semibold text-fg">
                {remaining} of {occurrence.capacity} left
              </dd>
            </div>
            <div className="rounded-theme border border-border bg-surface p-4">
              <dt className="text-xs text-muted">Price</dt>
              <dd className="mt-1 font-heading text-lg font-semibold text-fg">
                {price(seatPrice)}
                {occurrence.bookingMode === "crowdshared" && (
                  <span className="text-sm font-normal text-muted"> / seat</span>
                )}
              </dd>
            </div>
            <div className="rounded-theme border border-border bg-surface p-4">
              <dt className="text-xs text-muted">Format</dt>
              <dd className="mt-1 font-heading text-lg font-semibold text-fg">
                {bookingModeLabel(occurrence.bookingMode, client.terms.groupBooking())}
              </dd>
            </div>
          </dl>

          <section>
            <h2 className="font-heading text-xl font-bold text-fg">
              About this {client.terms.occurrence({ lower: true })}
            </h2>
            <p className="mt-3 leading-relaxed text-muted">{experience.description}</p>
          </section>

          {host && (
            <section>
              <h2 className="font-heading text-xl font-bold text-fg">
                Your {client.terms.provider({ lower: true })}
              </h2>
              <div className="mt-4">
                <HostPreview host={host} providerTerm={client.terms.provider()} showBio />
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {soldOut || inPast ? (
            <div className="rounded-theme border border-border bg-surface p-6 text-center">
              <p className="font-heading font-semibold text-fg">
                {inPast ? "This session has finished" : "Sold out"}
              </p>
              <Link
                href={`/experiences/${experience.slug}`}
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                See other dates →
              </Link>
            </div>
          ) : (
            <BookingPanel
              experienceSlug={experience.slug}
              experienceTitle={experience.title}
              availableModes={[occurrence.bookingMode]}
              occurrences={[option]}
              modePricingMinor={{
                [occurrence.bookingMode]: seatPrice?.amountMinor,
              }}
              currency={client.config.product.currency}
              policy={policy}
              maxCrowdsharedSeats={Math.min(
                client.config.policies.marketplace?.maxCrowdsharedSeats ?? 10,
                remaining
              )}
              terms={{
                provider: client.terms.provider(),
                customer: client.terms.customer(),
                crowdshared: client.terms.groupBooking(),
              }}
            />
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
