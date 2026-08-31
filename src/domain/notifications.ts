/**
 * Notification content.
 *
 * Rendering lives in the domain, not in a provider, for the same reason money
 * formatting does: the wording is a product decision that must not differ
 * depending on which email vendor is wired up.
 *
 * Two template rules that matter for a whitelabel product:
 *
 * 1. **No hardcoded marketplace nouns.** Copy takes a `NotificationContext`
 *    carrying the client's terminology, so the same template reads "experience"
 *    for one client and "session" or "class" for another.
 *
 * 2. **No private identity in the body.** These messages go to one recipient,
 *    but they get forwarded, quoted in support tickets and indexed by mail
 *    providers. They carry a pseudonymous display name and a booking code — the
 *    same pair the session watermark uses — and never a legal surname, phone
 *    number or email address belonging to the *other* party.
 *
 * Plain text only. A real deployment will want an HTML part; that belongs in the
 * vendor adapter, built from this text, so the wording stays in one place.
 */

export const NOTIFICATION_KINDS = [
  "booking_confirmed",
  "host_booking_received",
  "review_request",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * Client vocabulary and branding, passed in rather than imported so this file
 * stays free of config and framework dependencies.
 */
export type NotificationContext = {
  brandName: string;
  /** `client.terms.listing()` — "Experience", "Class", "Session"… */
  listingTerm: string;
  /** `client.terms.occurrence()` — "Session", "Showtime"… */
  occurrenceTerm: string;
  /** `client.terms.provider()` — "Host", "Coach"… */
  providerTerm: string;
  /** `client.terms.customer()` — "Guest", "Member"… */
  customerTerm: string;
  /** Absolute origin for links, e.g. "https://lanternrooms.example". */
  baseUrl?: string;
};

export type NotificationPayload =
  | {
      kind: "booking_confirmed";
      listingTitle: string;
      providerName: string;
      bookingCode: string;
      seatCount: number;
      /** Pre-formatted for the recipient's locale by the caller. */
      startsAtLabel?: string;
      totalLabel: string;
    }
  | {
      kind: "host_booking_received";
      listingTitle: string;
      customerName: string;
      bookingCode: string;
      seatCount: number;
      startsAtLabel?: string;
      guaranteedLabel: string;
    }
  | {
      kind: "review_request";
      listingTitle: string;
      providerName: string;
      bookingCode: string;
    };

export type RenderedNotification = {
  subject: string;
  text: string;
};

const lower = (term: string) => term.toLowerCase();

function link(context: NotificationContext, path: string): string {
  // A bare path is still useful in a demo log, and better than inventing an
  // origin that would produce a dead link in a real message.
  return context.baseUrl ? `${context.baseUrl.replace(/\/$/, "")}${path}` : path;
}

/** Joins non-empty lines, collapsing the gaps a missing optional field leaves. */
const body = (lines: (string | undefined | false)[]) =>
  lines.filter((line): line is string => typeof line === "string").join("\n");

export function renderNotification(
  payload: NotificationPayload,
  /**
   * The recipient's own display name — chosen by them and already public.
   * A separate parameter rather than a payload field so it comes from the
   * contact record every time, and no caller can pass something else.
   */
  recipient: { displayName: string },
  context: NotificationContext
): RenderedNotification {
  const greeting = `Hi ${recipient.displayName},`;

  switch (payload.kind) {
    case "booking_confirmed":
      return {
        subject: `You're booked: ${payload.listingTitle}`,
        text: body([
          greeting,
          "",
          `Your ${lower(context.occurrenceTerm)} is confirmed.`,
          "",
          `  ${payload.listingTitle}`,
          `  ${context.providerTerm}: ${payload.providerName}`,
          payload.startsAtLabel && `  Starts: ${payload.startsAtLabel}`,
          payload.seatCount > 1 && `  Seats: ${payload.seatCount}`,
          `  Total: ${payload.totalLabel}`,
          `  Booking code: ${payload.bookingCode}`,
          "",
          `Join from ${link(context, `/lobby/${payload.bookingCode}`)} shortly before`,
          `the start time.`,
          "",
          `— ${context.brandName}`,
        ]),
      };

    case "host_booking_received":
      return {
        subject: `New booking: ${payload.listingTitle}`,
        text: body([
          greeting,
          "",
          `${payload.customerName} booked ${payload.listingTitle}.`,
          "",
          payload.startsAtLabel && `  Starts: ${payload.startsAtLabel}`,
          payload.seatCount > 1 && `  Seats: ${payload.seatCount}`,
          // Named as guaranteed because that is the actual promise: it is owed
          // for delivering the time, and is not contingent on a rating.
          `  Guaranteed to you: ${payload.guaranteedLabel}`,
          `  Booking code: ${payload.bookingCode}`,
          "",
          `Details at ${link(context, "/host/sessions")}.`,
          "",
          `— ${context.brandName}`,
        ]),
      };

    case "review_request":
      return {
        subject: `How was ${payload.listingTitle}?`,
        text: body([
          greeting,
          "",
          `Thanks for spending the time with ${payload.providerName}.`,
          "",
          `If you have a moment, leave feedback:`,
          `  ${link(context, `/feedback/${payload.bookingCode}`)}`,
          "",
          // Stated plainly because it is true and it changes how people answer:
          // an honest low rating does not take money off someone.
          `Your rating never reduces what a ${lower(context.providerTerm)} is`,
          `guaranteed for delivering the ${lower(context.occurrenceTerm)}.`,
          "",
          `— ${context.brandName}`,
        ]),
      };
  }
}
