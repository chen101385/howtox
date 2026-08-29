import Link from "next/link";
import type { Experience, ExperienceOccurrence } from "@/domain/experience";
import { categoryLabel, duration, price, relativeFromNow } from "@/lib/format";

/**
 * Discovery card for a single listing.
 *
 * Copy comes entirely from the record and from terminology props — no brand or
 * marketplace noun is hardcoded. The whole card is one link target, with the
 * heading carrying the accessible name.
 */
export function ExperienceCard({
  experience,
  hostName,
  nextOccurrence,
  listingTerm = "Experience",
}: {
  experience: Experience;
  hostName: string;
  nextOccurrence?: ExperienceOccurrence;
  listingTerm?: string;
}) {
  const lowest =
    experience.pricing.perSeat ??
    experience.pricing.oneToOne ??
    experience.pricing.privateGroup;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-theme border border-border bg-surface transition-colors hover:border-primary/60 focus-within:border-primary">
      <div className="relative aspect-[16/10] overflow-hidden bg-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={experience.cover.src}
          alt={experience.cover.alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <span className="absolute left-3 top-3 rounded-full bg-bg/85 px-2.5 py-1 text-xs font-medium text-fg backdrop-blur">
          {categoryLabel(experience.category)}
        </span>
        {nextOccurrence && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg">
            {relativeFromNow(nextOccurrence.startsAt)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-lg font-semibold leading-snug text-fg">
          <Link
            href={`/experiences/${experience.slug}`}
            className="after:absolute after:inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {experience.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm text-muted">{experience.tagline}</p>

        <p className="mt-3 text-sm text-muted">
          with <span className="text-fg">{hostName}</span>
        </p>

        <div className="mt-auto flex items-baseline justify-between pt-4 text-sm">
          <span className="font-semibold text-fg">
            {price(lowest)}
            {experience.pricing.perSeat && (
              <span className="font-normal text-muted"> / seat</span>
            )}
          </span>
          <span className="text-muted">{duration(experience.durationMinutes)}</span>
        </div>
      </div>

      <span className="sr-only">{listingTerm}</span>
    </article>
  );
}
