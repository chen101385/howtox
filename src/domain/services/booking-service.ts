/**
 * Booking service — the one place a purchase is assembled.
 *
 * Coordinates domain rules, repositories and the commerce provider so routes and
 * components never do this themselves. Keeping it here means the compensation
 * ledger is written on the same path as the booking, and cannot be forgotten by a
 * new caller.
 */

import {
  bookingId as toBookingId,
  generateBookingCode,
  seatId as toSeatId,
  type OccurrenceId,
  type TenantId,
  type UserId,
} from "@/domain/ids";
import { money, multiply, type Money } from "@/domain/money";
import {
  resolveSeatPrice,
  seatsRemaining,
  type BookingMode,
  type Experience,
  type ExperienceOccurrence,
} from "@/domain/experience";
import type { Booking, Seat } from "@/domain/booking";
import {
  DEFAULT_COMPENSATION_POLICY,
  entriesForPurchase,
  type CompensationPolicy,
} from "@/domain/ledger";
import { getRepositories } from "@/data";
import { getProviders } from "@/providers";

export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingError";
  }
}

export type CreateBookingInput = {
  tenantId: TenantId;
  experience: Experience;
  occurrence?: ExperienceOccurrence;
  bookingMode: BookingMode;
  seatCount: number;
  guestUserId: UserId;
  guestDisplayName: string;
  hostUserId: UserId;
  policy?: CompensationPolicy;
  currency?: string;
};

/** Unit price for a mode, preferring the occurrence's own price when present. */
export function unitPriceFor(
  experience: Experience,
  bookingMode: BookingMode,
  occurrence?: ExperienceOccurrence
): Money | undefined {
  if (occurrence) return resolveSeatPrice(occurrence, experience);
  switch (bookingMode) {
    case "one_to_one":
      return experience.pricing.oneToOne;
    case "private_group":
      return experience.pricing.privateGroup;
    case "crowdshared":
      return experience.pricing.perSeat;
  }
}

/**
 * Creates a booking, charges through the commerce provider, and writes the
 * opening ledger entries.
 *
 * Seat count is only multiplied for crowdshared bookings: one-to-one and private
 * group are sold as a single unit, so charging per attendee would double-bill.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const {
    tenantId,
    experience,
    occurrence,
    bookingMode,
    guestUserId,
    guestDisplayName,
    hostUserId,
  } = input;
  const currency = input.currency ?? "USD";
  const policy = input.policy ?? DEFAULT_COMPENSATION_POLICY;

  if (!experience.bookingModes.includes(bookingMode)) {
    throw new BookingError(
      `This ${experience.title} listing does not offer ${bookingMode} bookings.`
    );
  }

  // Remote-only for this product; a booking must never imply an in-person meeting.
  const deliveryMode = occurrence?.deliveryMode ?? "remote";
  if (deliveryMode !== "remote") {
    throw new BookingError("Only remote delivery is supported.");
  }

  const seatCount = bookingMode === "crowdshared" ? Math.max(1, input.seatCount) : 1;

  if (occurrence) {
    if (occurrence.status !== "scheduled") {
      throw new BookingError("That session is no longer available.");
    }
    if (seatsRemaining(occurrence) < seatCount) {
      throw new BookingError(
        `Only ${seatsRemaining(occurrence)} seat(s) remain for that session.`
      );
    }
  }

  const unitPrice = unitPriceFor(experience, bookingMode, occurrence);
  if (!unitPrice) {
    throw new BookingError("No price is configured for that booking option.");
  }

  const totalPrice = multiply(unitPrice, seatCount);
  const bookingCode = generateBookingCode();
  const id = toBookingId(`bkg_${bookingCode.replace("-", "").toLowerCase()}`);

  const seats: Seat[] = Array.from({ length: seatCount }, (_, i) => ({
    id: toSeatId(`${id}_seat_${i + 1}`),
    bookingId: id,
    occurrenceId: (occurrence?.id ?? "") as OccurrenceId,
    // Pseudonymous label — this is what appears in the session watermark.
    guestDisplayName:
      seatCount > 1 ? `${guestDisplayName} +${i}` : guestDisplayName,
    bookingCode,
    pricePaid: unitPrice,
  }));

  const booking: Booking = {
    id,
    tenantId,
    experienceId: experience.id,
    occurrenceId: occurrence?.id,
    guestUserId,
    bookingMode,
    deliveryMode,
    status: "pending",
    seatCount,
    seats,
    totalPrice,
    bookingCode,
    createdAt: new Date().toISOString(),
  };

  const providers = getProviders();
  const charge = await providers.commerce.charge({
    tenantId,
    bookingId: id,
    amount: totalPrice,
    description: `${experience.title} (${bookingMode})`,
  });

  if (!charge.ok) {
    throw new BookingError(charge.message ?? "Payment could not be authorized.");
  }

  const confirmed: Booking = { ...booking, status: "confirmed" };

  const repos = getRepositories();
  await repos.bookings.create(confirmed);
  await repos.ledger.append(
    entriesForPurchase({
      tenantId,
      bookingId: id,
      hostUserId,
      guestPrice: totalPrice,
      policy,
    })
  );

  if (occurrence) {
    await repos.experiences.reserveSeats(tenantId, occurrence.id, seatCount);
  }

  return confirmed;
}

/**
 * Marks a delivered session complete and releases the host's guaranteed
 * compensation.
 *
 * The release is unconditional on any rating — no argument here carries one, so
 * a future change cannot accidentally make base pay depend on a review.
 */
export async function completeBooking(bookingCode: string, tenantId: TenantId) {
  const repos = getRepositories();
  const booking = await repos.bookings.getByCode(tenantId, bookingCode);
  if (!booking) return null;

  const updated =
    booking.status === "confirmed"
      ? await repos.bookings.update({ ...booking, status: "completed" })
      : booking;

  const released = await repos.ledger.updateStatus(
    tenantId,
    booking.id,
    "host_guaranteed_compensation",
    "pending",
    "released"
  );

  return { booking: updated, released };
}

/** Convenience for UI that needs a zero-value Money in the client's currency. */
export const zeroIn = (currency: string) => money(0, currency);
