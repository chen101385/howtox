import Link from "next/link";
import type { Experience, ExperienceOccurrence } from "@/domain/experience";
import { seatsRemaining } from "@/domain/experience";
import { money } from "@/domain/money";
import { occurrenceDateTime, price, relativeFromNow } from "@/lib/format";

/**
 * Occurrence rails.
 *
 * These surface *scheduled instances* rather than listings, because "what can I
 * do tonight" is a question about times, not about catalogue entries. Each card
 * therefore leads with when it starts and how many seats are left.
 *
 * Horizontal scrolling is contained (`overflow-x-auto`) so the page body never
 * scrolls sideways on mobile.
 */

export type RailItem = {
  occurrence: ExperienceOccurrence;
  experience: Experience;
  hostName: string;
};

export function LiveTonightRail({
  items,
  emptyMessage = "Nothing scheduled in the next few hours. Check back this evening.",
}: {
  items: RailItem[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
      {items.map(({ occurrence, experience, hostName }) => (
        <li key={occurrence.id} className="w-72 shrink-0 snap-start">
          <OccurrenceCard
            occurrence={occurrence}
            experience={experience}
            hostName={hostName}
            highlight={relativeFromNow(occurrence.startsAt)}
          />
        </li>
      ))}
    </ul>
  );
}

export function CrowdsharedRail({
  items,
  crowdsharedTerm = "Crowdshared",
  emptyMessage,
}: {
  items: RailItem[];
  crowdsharedTerm?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        {emptyMessage ?? `No ${crowdsharedTerm.toLowerCase()} events scheduled right now.`}
      </p>
    );
  }

  return (
    <ul className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
      {items.map(({ occurrence, experience, hostName }) => (
        <li key={occurrence.id} className="w-72 shrink-0 snap-start">
          <OccurrenceCard
            occurrence={occurrence}
            experience={experience}
            hostName={hostName}
            highlight={`${seatsRemaining(occurrence)} of ${occurrence.capacity} seats left`}
          />
        </li>
      ))}
    </ul>
  );
}

function OccurrenceCard({
  occurrence,
  experience,
  hostName,
  highlight,
}: {
  occurrence: ExperienceOccurrence;
  experience: Experience;
  hostName: string;
  highlight: string;
}) {
  const seatPrice = occurrence.pricePerSeat ?? experience.pricing.perSeat;

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-theme border border-border bg-surface transition-colors hover:border-primary/60 focus-within:border-primary">
      <div className="aspect-[16/10] overflow-hidden bg-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={experience.cover.src}
          alt={experience.cover.alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {highlight}
        </p>

        <h3 className="mt-1.5 font-heading text-sm font-semibold leading-snug text-fg">
          <Link
            href={`/events/${occurrence.id}`}
            className="after:absolute after:inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {experience.title}
          </Link>
        </h3>

        <p className="mt-1 text-xs text-muted">with {hostName}</p>

        <div className="mt-auto flex items-baseline justify-between pt-3 text-xs">
          <span className="text-muted">
            {occurrenceDateTime(occurrence.startsAt, occurrence.timezone)}
          </span>
          <span className="font-semibold text-fg">
            {price(seatPrice ?? money(0, "USD"))}
          </span>
        </div>
      </div>
    </article>
  );
}
