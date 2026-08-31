import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_KINDS,
  renderNotification,
  type NotificationContext,
  type NotificationPayload,
} from "./notifications";

/**
 * Notification copy is the only product surface a person reads outside the site,
 * so two properties are worth pinning: it carries no private identity, and it
 * carries no hardcoded marketplace noun.
 */

const RECIPIENT = { displayName: "Ada" };

const LANTERN: NotificationContext = {
  brandName: "Lantern Rooms",
  listingTerm: "Experience",
  occurrenceTerm: "Session",
  providerTerm: "Host",
  customerTerm: "Guest",
  baseUrl: "https://lantern.example",
};

/** A differently-worded client, to prove no noun is baked in. */
const ACADEMY: NotificationContext = {
  brandName: "Northgate Academy",
  listingTerm: "Course",
  occurrenceTerm: "Class",
  providerTerm: "Coach",
  customerTerm: "Member",
};

const PAYLOADS: NotificationPayload[] = [
  {
    kind: "booking_confirmed",
    listingTitle: "Ghost Stories by Lamplight",
    providerName: "The Lamplighter",
    bookingCode: "K7QP-2M",
    seatCount: 2,
    startsAtLabel: "Fri 29 Aug, 8:00 PM GMT+1",
    totalLabel: "$60.00",
  },
  {
    kind: "host_booking_received",
    listingTitle: "Ghost Stories by Lamplight",
    customerName: "Ada",
    bookingCode: "K7QP-2M",
    seatCount: 2,
    startsAtLabel: "Fri 29 Aug, 8:00 PM GMT+1",
    guaranteedLabel: "$42.00",
  },
  {
    kind: "review_request",
    listingTitle: "Ghost Stories by Lamplight",
    providerName: "The Lamplighter",
    bookingCode: "K7QP-2M",
  },
];

describe("renderNotification", () => {
  it("covers every declared kind", () => {
    expect(PAYLOADS.map((p) => p.kind).sort()).toEqual([...NOTIFICATION_KINDS].sort());
  });

  it("always produces a subject and a body", () => {
    for (const payload of PAYLOADS) {
      const rendered = renderNotification(payload, RECIPIENT, LANTERN);
      expect(rendered.subject.length, payload.kind).toBeGreaterThan(0);
      expect(rendered.text.length, payload.kind).toBeGreaterThan(0);
      expect(rendered.text, payload.kind).toContain("Ada");
      expect(rendered.text, payload.kind).toContain("Lantern Rooms");
    }
  });

  it("hardcodes no marketplace noun in prose", () => {
    // Route paths are excluded, and deliberately: URLs like /host/sessions are
    // fixed by the app's routing and are not user-facing vocabulary. Listing
    // titles are excluded too — "Ghost Stories" is data, not copy.
    const prose = (payload: NotificationPayload, context: NotificationContext) =>
      renderNotification(payload, RECIPIENT, context)
        .text.toLowerCase()
        .replace(/\S*\/\S*/g, "") // paths and URLs
        .replace(/ghost stories by lamplight/g, "");

    for (const payload of PAYLOADS) {
      const text = prose(payload, ACADEMY);
      expect(text, payload.kind).not.toMatch(/\bhost\b/);
      expect(text, payload.kind).not.toMatch(/\bguest\b/);
      expect(text, payload.kind).not.toMatch(/\bexperience\b/);
    }
  });

  it("substitutes the client's own vocabulary", () => {
    // The inverse of the test above: prove the terms are actually used, not
    // merely absent.
    const academy = renderNotification(PAYLOADS[0], RECIPIENT, ACADEMY).text;
    expect(academy).toContain("Coach:");
    expect(academy.toLowerCase()).toContain("class is confirmed");

    const lantern = renderNotification(PAYLOADS[0], RECIPIENT, LANTERN).text;
    expect(lantern).toContain("Host:");
    expect(lantern.toLowerCase()).toContain("session is confirmed");
  });

  it("names the timezone whenever a start time is shown", () => {
    // A time without a zone in an email is how someone shows up an hour late.
    const confirmed = renderNotification(PAYLOADS[0], RECIPIENT, LANTERN);
    expect(confirmed.text).toContain("GMT+1");
  });

  it("omits the seat line for a single seat", () => {
    const single = renderNotification(
      { ...PAYLOADS[0], seatCount: 1 } as NotificationPayload,
      RECIPIENT,
      LANTERN
    );
    expect(single.text).not.toContain("Seats:");
    // …and does not leave a hole where the line was.
    expect(single.text).not.toContain("\n\n\n");
  });

  it("falls back to relative links when no origin is configured", () => {
    const rendered = renderNotification(PAYLOADS[2], RECIPIENT, ACADEMY);
    expect(rendered.text).toContain("/feedback/K7QP-2M");
    // Better a relative path than an invented origin producing a dead link.
    expect(rendered.text).not.toContain("undefined");
  });

  it("tells the guest their rating does not reduce anyone's pay", () => {
    // Load-bearing copy, not decoration: people rate differently when they
    // think an honest low score takes money off a person.
    const rendered = renderNotification(PAYLOADS[2], RECIPIENT, LANTERN);
    expect(rendered.text.toLowerCase()).toContain("never reduces");
  });
});

describe("privacy", () => {
  /**
   * The threat: a confirmation gets forwarded, or pasted into a support ticket.
   * Whatever is in the body is now wherever that went.
   */
  const PRIVATE_STRINGS = [
    "Fenwick", // legal surname
    "ada.private@example.invalid", // email
    "+1 555 0100", // phone
    "pm_demo_0001", // payout reference
    "12 Somewhere Lane", // address
  ];

  it("leaks no private identity into any message", () => {
    for (const payload of PAYLOADS) {
      for (const context of [LANTERN, ACADEMY]) {
        const rendered = renderNotification(payload, RECIPIENT, context);
        const serialized = `${rendered.subject}\n${rendered.text}`;
        for (const secret of PRIVATE_STRINGS) {
          expect(serialized, `${payload.kind} leaked ${secret}`).not.toContain(secret);
        }
      }
    }
  });

  it("identifies people by display name and booking code only", () => {
    // The same pair the session watermark uses — pseudonymous, and enough for
    // support to find the record.
    const host = renderNotification(PAYLOADS[1], { displayName: "The Lamplighter" }, LANTERN);
    expect(host.text).toContain("Ada");
    expect(host.text).toContain("K7QP-2M");
    expect(host.text).not.toContain("@");
  });
});
