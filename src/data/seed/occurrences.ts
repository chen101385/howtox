/**
 * Seeded occurrences.
 *
 * Generated RELATIVE to the current time so "live tonight" always has something
 * in it during a demo. Because of that these are not build-time constants —
 * marketplace routes opt out of static generation (`force-dynamic`) so the
 * schedule is never frozen into a stale prerender.
 */

import { occurrenceId } from "@/domain/ids";
import { money } from "@/domain/money";
import type { ExperienceOccurrence } from "@/domain/experience";
import { DEMO_TENANT } from "./hosts";
import { SEED_EXPERIENCES } from "./experiences";

type Plan = {
  experienceKey: string;
  /** Hours from "now" at which this occurrence starts. */
  inHours: number;
  bookingMode: ExperienceOccurrence["bookingMode"];
  capacity: number;
  seatsBooked: number;
  priceMinor?: number;
};

/**
 * A deliberately varied schedule: a few tonight, a spread across the coming week,
 * some nearly sold out, and a mix of crowdshared and private modes.
 */
const PLANS: Plan[] = [
  { experienceKey: "exp_ghost_stories", inHours: 3, bookingMode: "crowdshared", capacity: 40, seatsBooked: 31, priceMinor: 1800 },
  { experienceKey: "exp_ghost_stories", inHours: 27, bookingMode: "crowdshared", capacity: 40, seatsBooked: 12, priceMinor: 1800 },
  { experienceKey: "exp_ghost_stories", inHours: 74, bookingMode: "private_group", capacity: 12, seatsBooked: 0 },

  { experienceKey: "exp_audience_stories", inHours: 5, bookingMode: "crowdshared", capacity: 30, seatsBooked: 27, priceMinor: 2200 },
  { experienceKey: "exp_audience_stories", inHours: 52, bookingMode: "crowdshared", capacity: 30, seatsBooked: 8, priceMinor: 2200 },

  { experienceKey: "exp_crowdwork", inHours: 4, bookingMode: "crowdshared", capacity: 25, seatsBooked: 19, priceMinor: 1500 },
  { experienceKey: "exp_crowdwork", inHours: 30, bookingMode: "crowdshared", capacity: 25, seatsBooked: 5, priceMinor: 1500 },

  { experienceKey: "exp_magic_show", inHours: 6, bookingMode: "crowdshared", capacity: 20, seatsBooked: 14, priceMinor: 2000 },
  { experienceKey: "exp_magic_show", inHours: 48, bookingMode: "one_to_one", capacity: 1, seatsBooked: 0 },

  { experienceKey: "exp_learn_magic", inHours: 26, bookingMode: "one_to_one", capacity: 1, seatsBooked: 0 },
  { experienceKey: "exp_learn_magic", inHours: 96, bookingMode: "private_group", capacity: 8, seatsBooked: 0 },

  { experienceKey: "exp_song_requests", inHours: 2, bookingMode: "crowdshared", capacity: 50, seatsBooked: 38, priceMinor: 1600 },
  { experienceKey: "exp_song_requests", inHours: 51, bookingMode: "one_to_one", capacity: 1, seatsBooked: 0 },

  { experienceKey: "exp_dj_basics", inHours: 29, bookingMode: "one_to_one", capacity: 1, seatsBooked: 0 },
  { experienceKey: "exp_dj_basics", inHours: 120, bookingMode: "private_group", capacity: 6, seatsBooked: 0 },

  { experienceKey: "exp_cooking", inHours: 25, bookingMode: "crowdshared", capacity: 16, seatsBooked: 11, priceMinor: 2400 },
  { experienceKey: "exp_cooking", inHours: 76, bookingMode: "one_to_one", capacity: 1, seatsBooked: 0 },

  { experienceKey: "exp_improv", inHours: 7, bookingMode: "crowdshared", capacity: 18, seatsBooked: 9, priceMinor: 1900 },
  { experienceKey: "exp_improv", inHours: 54, bookingMode: "private_group", capacity: 8, seatsBooked: 0 },

  { experienceKey: "exp_trivia", inHours: 5.5, bookingMode: "crowdshared", capacity: 60, seatsBooked: 44, priceMinor: 1200 },
  { experienceKey: "exp_trivia", inHours: 28, bookingMode: "crowdshared", capacity: 60, seatsBooked: 17, priceMinor: 1200 },
];

export function generateOccurrences(now: Date = new Date()): ExperienceOccurrence[] {
  return PLANS.map((plan, index) => {
    const experience = SEED_EXPERIENCES.find((e) => e.id === plan.experienceKey);
    if (!experience) {
      throw new Error(`Seed occurrence references unknown experience "${plan.experienceKey}"`);
    }

    const startsAt = new Date(now.getTime() + plan.inHours * 3_600_000);
    const soldOut = plan.seatsBooked >= plan.capacity;

    return {
      id: occurrenceId(`occ_${index.toString().padStart(3, "0")}`),
      tenantId: DEMO_TENANT,
      experienceId: experience.id,
      hostId: experience.hostId,
      startsAt: startsAt.toISOString(),
      durationMinutes: experience.durationMinutes,
      timezone: "America/Los_Angeles",
      bookingMode: plan.bookingMode,
      deliveryMode: "remote",
      capacity: plan.capacity,
      seatsBooked: plan.seatsBooked,
      pricePerSeat: plan.priceMinor ? money(plan.priceMinor) : undefined,
      status: soldOut ? "sold_out" : "scheduled",
    };
  });
}
