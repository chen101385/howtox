/**
 * Booking and seats.
 *
 * A Booking is a guest's purchase against an Experience (and usually a specific
 * Occurrence). For crowdshared events each purchased seat is tracked individually
 * so capacity, refunds and watermark identities resolve per guest.
 */

import { createStateMachine } from "./state-machine";
import type {
  BookingId,
  ExperienceId,
  OccurrenceId,
  SeatId,
  TenantId,
  UserId,
} from "./ids";
import type { BookingMode, DeliveryMode } from "./experience";
import type { Money } from "./money";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "disputed"
  | "refunded";

/**
 * `completed` remains non-terminal: a dispute can legitimately be opened after a
 * session ends, which is when most disputes actually surface.
 */
export const bookingMachine = createStateMachine<BookingStatus>("booking", {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "disputed"],
  completed: ["disputed"],
  disputed: ["refunded", "completed"],
  cancelled: ["refunded"],
  refunded: [],
});

export type Seat = {
  id: SeatId;
  bookingId: BookingId;
  occurrenceId: OccurrenceId;
  /** Pseudonymous label shown to the host and used in the session watermark. */
  guestDisplayName: string;
  /** Short human-quotable code; the non-sensitive watermark component. */
  bookingCode: string;
  pricePaid: Money;
};

export type Booking = {
  id: BookingId;
  tenantId: TenantId;
  experienceId: ExperienceId;
  /** Absent only for availability-based one-to-one bookings not yet scheduled. */
  occurrenceId?: OccurrenceId;
  guestUserId: UserId;
  bookingMode: BookingMode;
  deliveryMode: DeliveryMode;
  status: BookingStatus;
  seatCount: number;
  seats: Seat[];
  /** What the guest is charged in total. */
  totalPrice: Money;
  bookingCode: string;
  createdAt: string;
  /** Set when the guest accepts session policies in the lobby. */
  policiesAcceptedAt?: string;
  cancelledAt?: string;
  cancelledBy?: "guest" | "host" | "platform";
};

export function transitionBooking(booking: Booking, to: BookingStatus): Booking {
  return { ...booking, status: bookingMachine.transition(booking.status, to) };
}

export function isActiveBooking(b: Booking): boolean {
  return b.status === "pending" || b.status === "confirmed";
}

/**
 * Whether the guest may enter the session lobby. Deliberately does NOT check
 * policy acceptance — that is the lobby's own gate — but does require payment to
 * have settled.
 */
export function canEnterLobby(b: Booking): boolean {
  return b.status === "confirmed";
}
