/**
 * Experience — a reusable offering ("Interactive ghost stories").
 * ExperienceOccurrence — a specific scheduled instance ("Fri 8:00 PM, 20 seats").
 *
 * Keeping these separate is what makes crowdshared events, recurring sessions and
 * per-seat inventory expressible. Collapsing them would force one row per listing
 * per night.
 */

import type { ExperienceId, HostId, OccurrenceId, TenantId } from "./ids";
import type { Money } from "./money";

/* ------------------------------- Modes ---------------------------------- */

/**
 * How guests book:
 * - `one_to_one`     a single guest with the host
 * - `private_group`  one buyer brings their own group; not sold to strangers
 * - `crowdshared`    multiple unrelated guests independently buy seats
 */
export type BookingMode = "one_to_one" | "private_group" | "crowdshared";

export const BOOKING_MODES: readonly BookingMode[] = [
  "one_to_one",
  "private_group",
  "crowdshared",
] as const;

/** Remote-only for the first product. `in_person` is modeled, not built. */
export type DeliveryMode = "remote" | "in_person";

export const DELIVERY_MODES: readonly DeliveryMode[] = ["remote", "in_person"] as const;

/* ----------------------------- Categories ------------------------------- */

/**
 * Entertainment and recreational-education categories. Storytelling is
 * first-class, not a subcategory of "other".
 */
export type ExperienceCategory =
  | "storytelling"
  | "comedy"
  | "music"
  | "magic"
  | "cooking"
  | "dance"
  | "art"
  | "improv"
  | "games"
  | "dj"
  | "craft";

export const EXPERIENCE_CATEGORIES: readonly ExperienceCategory[] = [
  "storytelling",
  "comedy",
  "music",
  "magic",
  "cooking",
  "dance",
  "art",
  "improv",
  "games",
  "dj",
  "craft",
] as const;

export const CATEGORY_LABELS: Record<ExperienceCategory, string> = {
  storytelling: "Storytelling",
  comedy: "Comedy",
  music: "Music",
  magic: "Magic",
  cooking: "Cooking",
  dance: "Dance",
  art: "Art & Drawing",
  improv: "Improv",
  games: "Trivia & Games",
  dj: "DJ & Production",
  craft: "Creative Hobbies",
};

/**
 * Discovery intents — how a curious, undecided guest browses. These are
 * deliberately mood/occasion shaped rather than taxonomy shaped.
 */
export type DiscoveryIntent =
  | "live_tonight"
  | "learn_something_new"
  | "great_with_friends"
  | "join_a_small_crowd"
  | "one_to_one"
  | "interactive_performance"
  | "under_price";

export const DISCOVERY_INTENTS: readonly DiscoveryIntent[] = [
  "live_tonight",
  "learn_something_new",
  "great_with_friends",
  "join_a_small_crowd",
  "one_to_one",
  "interactive_performance",
  "under_price",
] as const;

export const INTENT_LABELS: Record<DiscoveryIntent, string> = {
  live_tonight: "Live tonight",
  learn_something_new: "Learn something new",
  great_with_friends: "Great with friends",
  join_a_small_crowd: "Join a small crowd",
  one_to_one: "One-to-one",
  interactive_performance: "Interactive performances",
  under_price: "Under a set price",
};

/* ------------------------------ Samples --------------------------------- */

/**
 * Promotional media a host publishes for discovery. Distinct from a live session:
 * samples are MEANT to be viewed publicly and are not covered by the
 * no-recording policy that applies to private live sessions.
 */
export type ExperienceSample = {
  id: string;
  kind: "video" | "audio" | "image";
  title: string;
  /** Local/self-hosted asset path or provider ref resolved by MediaProvider. */
  src: string;
  posterSrc?: string;
  durationSeconds?: number;
  alt: string;
};

/* ------------------------------ Pricing --------------------------------- */

export type ExperiencePricing = {
  /** Price for a one-to-one booking, when that mode is offered. */
  oneToOne?: Money;
  /** Flat price a single buyer pays for a private group. */
  privateGroup?: Money;
  /** Per-seat price for crowdshared occurrences. */
  perSeat?: Money;
};

/* ----------------------------- Experience ------------------------------- */

export type Experience = {
  id: ExperienceId;
  tenantId: TenantId;
  hostId: HostId;
  slug: string;
  title: string;
  /** One-line hook used on cards. */
  tagline: string;
  description: string;
  category: ExperienceCategory;
  secondaryCategories?: ExperienceCategory[];
  bookingModes: BookingMode[];
  deliveryModes: DeliveryMode[];
  durationMinutes: number;
  pricing: ExperiencePricing;
  samples: ExperienceSample[];
  /** Cover art; generated SVG posters in the demo. */
  cover: { src: string; alt: string };
  /** What a guest will actually do — interactivity is the product. */
  whatToExpect: string[];
  /** Minimum age guidance, when the host sets one. */
  minimumAge?: number;
  languages: string[];
  intents: DiscoveryIntent[];
  status: "draft" | "published" | "paused";
  createdAt: string;
};

/* ----------------------------- Occurrence ------------------------------- */

export type OccurrenceStatus =
  | "scheduled"
  | "sold_out"
  | "cancelled"
  | "completed";

/**
 * A specific scheduled instance of an Experience. Capacity and seat inventory
 * live here, never on the Experience.
 */
export type ExperienceOccurrence = {
  id: OccurrenceId;
  tenantId: TenantId;
  experienceId: ExperienceId;
  hostId: HostId;
  /** ISO-8601 UTC instant. */
  startsAt: string;
  durationMinutes: number;
  timezone: string;
  bookingMode: BookingMode;
  deliveryMode: DeliveryMode;
  /** Total seats. Required for crowdshared; 1 for one_to_one. */
  capacity: number;
  seatsBooked: number;
  /** Per-seat price for this occurrence; falls back to experience pricing. */
  pricePerSeat?: Money;
  status: OccurrenceStatus;
};

export function seatsRemaining(o: ExperienceOccurrence): number {
  return Math.max(0, o.capacity - o.seatsBooked);
}

export function isBookable(o: ExperienceOccurrence, now: Date = new Date()): boolean {
  return (
    o.status === "scheduled" &&
    seatsRemaining(o) > 0 &&
    new Date(o.startsAt).getTime() > now.getTime()
  );
}

/** "Live tonight" = starts later today in the occurrence's own timezone. */
export function startsWithinHours(
  o: ExperienceOccurrence,
  hours: number,
  now: Date = new Date()
): boolean {
  const delta = new Date(o.startsAt).getTime() - now.getTime();
  return delta >= 0 && delta <= hours * 3_600_000;
}

/* ----------------------------- Availability ----------------------------- */

/**
 * Host availability for on-demand (non-occurrence) booking modes such as
 * one-to-one, where a guest picks a slot rather than joining a scheduled event.
 */
export type AvailabilityWindow = {
  /** 0 = Sunday. */
  weekday: number;
  /** Minutes from local midnight. */
  startMinute: number;
  endMinute: number;
};

export type Availability = {
  hostId: HostId;
  timezone: string;
  windows: AvailabilityWindow[];
  /** ISO dates the host has blocked out. */
  blackoutDates: string[];
  /** Minimum lead time before a slot can be booked. */
  noticeHours: number;
};

export function resolveSeatPrice(
  occurrence: ExperienceOccurrence,
  experience: Experience
): Money | undefined {
  if (occurrence.pricePerSeat) return occurrence.pricePerSeat;
  switch (occurrence.bookingMode) {
    case "crowdshared":
      return experience.pricing.perSeat;
    case "private_group":
      return experience.pricing.privateGroup;
    case "one_to_one":
      return experience.pricing.oneToOne;
  }
}
