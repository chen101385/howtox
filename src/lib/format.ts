/**
 * Presentation helpers.
 *
 * Formatting lives here, never in the domain. Domain values stay canonical
 * (minor units, ISO instants) so they can be compared and summed; these
 * functions exist only to render them.
 */

import { formatMoneyCompact, type Money } from "@/domain/money";
import { CATEGORY_LABELS, type ExperienceCategory, type BookingMode } from "@/domain/experience";

export function price(m: Money | undefined, locale = "en-US"): string {
  return m ? formatMoneyCompact(m, locale) : "—";
}

export function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** e.g. "Fri 8:00 PM". Rendered in the occurrence's own timezone. */
export function occurrenceTime(iso: string, timezone?: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}

/** e.g. "Fri 29 Aug, 8:00 PM". */
export function occurrenceDateTime(
  iso: string,
  timezone?: string,
  locale = "en-US"
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}

/** Relative label used by "live tonight" rails, e.g. "in 3 hours". */
export function relativeFromNow(iso: string, now: Date = new Date(), locale = "en-US"): string {
  const deltaMs = new Date(iso).getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round(deltaMs / 60_000);

  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

export function categoryLabel(category: ExperienceCategory): string {
  return CATEGORY_LABELS[category];
}

/**
 * Booking-mode labels. The crowdshared label comes from client terminology, so a
 * client that calls it something else is respected.
 */
export function bookingModeLabel(mode: BookingMode, crowdsharedTerm = "Crowdshared"): string {
  switch (mode) {
    case "one_to_one":
      return "One-to-one";
    case "private_group":
      return "Private group";
    case "crowdshared":
      return crowdsharedTerm;
  }
}

export function bookingModeDescription(
  mode: BookingMode,
  crowdsharedTerm = "Crowdshared"
): string {
  switch (mode) {
    case "one_to_one":
      return "Just you and the host.";
    case "private_group":
      return "You bring your own group. Nobody else joins.";
    case "crowdshared":
      return `${crowdsharedTerm}: you buy individual seats alongside other guests.`;
  }
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}
