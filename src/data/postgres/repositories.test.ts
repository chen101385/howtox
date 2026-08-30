import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "./test-db";
import { createPostgresRepositories } from "./repositories";
import { seedDatabase } from "./seed";
import type { Repositories } from "../repositories";
import { CURRENT_TENANT } from "..";
import {
  bookingId,
  experienceId,
  hostId,
  incidentId,
  occurrenceId,
  reviewId,
  seatId,
  tenantId,
  userId,
} from "@/domain/ids";
import { money } from "@/domain/money";
import { seatsRemaining } from "@/domain/experience";
import { createEntry, summarizeHostEarnings } from "@/domain/ledger";
import { PRIVATE_ONLY_FIELDS, assertNoPrivateFields } from "@/domain/identity";
import type { Booking } from "@/domain/booking";
import { SEED_USERS_PRIVATE } from "../seed/hosts";

/**
 * Integration tests for the Postgres adapter, against real Postgres (PGlite)
 * running the real migrations.
 *
 * These assert the same contract `src/data/repositories.test.ts` asserts for the
 * in-memory adapter, so both implementations are held to one behavioural spec.
 */

let test: TestDatabase;
let repos: Repositories;

const OTHER_TENANT = tenantId("some-other-tenant");

beforeAll(async () => {
  test = await createTestDatabase();
  repos = createPostgresRepositories(test.db);
  await seedDatabase(test.db);
}, 60_000);

afterAll(async () => {
  await test?.close();
});

describe("migrations and seeding", () => {
  it("applies migrations and loads the seed", async () => {
    const all = await repos.experiences.list({ tenantId: CURRENT_TENANT });
    expect(all).toHaveLength(10);
  });

  it("is idempotent when re-seeded", async () => {
    await seedDatabase(test.db);
    const all = await repos.experiences.list({ tenantId: CURRENT_TENANT });
    expect(all).toHaveLength(10);
  });
});

describe("experience queries", () => {
  it("finds by slug", async () => {
    const found = await repos.experiences.getBySlug(
      CURRENT_TENANT,
      "ghost-stories-by-lamplight"
    );
    expect(found?.category).toBe("storytelling");
    expect(found?.title).toBe("Ghost Stories by Lamplight");
  });

  it("round-trips money as integer minor units", async () => {
    const found = await repos.experiences.getBySlug(
      CURRENT_TENANT,
      "ghost-stories-by-lamplight"
    );
    expect(found?.pricing.perSeat?.amountMinor).toBe(1800);
    expect(found?.pricing.perSeat?.currency).toBe("USD");
    expect(Number.isInteger(found?.pricing.perSeat?.amountMinor)).toBe(true);
  });

  it("round-trips JSONB samples and cover art", async () => {
    const found = await repos.experiences.getBySlug(
      CURRENT_TENANT,
      "ghost-stories-by-lamplight"
    );
    expect(found?.samples.length).toBeGreaterThan(0);
    expect(found?.samples[0].kind).toBe("image");
    expect(found?.cover.src).toMatch(/^\/clients\/experience-demo\/assets\//);
  });

  it("round-trips text arrays", async () => {
    const found = await repos.experiences.getBySlug(
      CURRENT_TENANT,
      "ghost-stories-by-lamplight"
    );
    expect(found?.languages).toEqual(["English", "Portuguese"]);
    expect(found?.bookingModes).toContain("crowdshared");
    expect(found?.deliveryModes).toEqual(["remote"]);
  });

  it("filters by primary or secondary category", async () => {
    const stories = await repos.experiences.list({
      tenantId: CURRENT_TENANT,
      category: "storytelling",
    });
    expect(stories.length).toBeGreaterThanOrEqual(2);

    // "Ghost Stories" lists improv as a SECONDARY category.
    const improv = await repos.experiences.list({
      tenantId: CURRENT_TENANT,
      category: "improv",
    });
    expect(improv.map((e) => e.slug)).toContain("ghost-stories-by-lamplight");
  });

  it("filters by max price against the cheapest option", async () => {
    const cheap = await repos.experiences.list({
      tenantId: CURRENT_TENANT,
      maxPrice: money(1500),
    });
    expect(cheap.length).toBeGreaterThan(0);
    expect(cheap.map((e) => e.slug)).toContain("lateral-trivia-night");
  });

  it("searches title, tagline and description", async () => {
    const results = await repos.experiences.list({
      tenantId: CURRENT_TENANT,
      search: "beatmatch",
    });
    expect(results.map((e) => e.slug)).toContain("your-first-hour-on-the-decks");
  });

  it("filters by the live_tonight intent using the schedule", async () => {
    const tonight = await repos.experiences.list({
      tenantId: CURRENT_TENANT,
      intent: "live_tonight",
    });
    expect(tonight.length).toBeGreaterThan(0);
  });

  it("respects a limit", async () => {
    const limited = await repos.experiences.list({
      tenantId: CURRENT_TENANT,
      limit: 3,
    });
    expect(limited).toHaveLength(3);
  });

  it("returns null for an unknown id", async () => {
    expect(
      await repos.experiences.getById(CURRENT_TENANT, experienceId("nope"))
    ).toBeNull();
  });
});

describe("tenant scoping", () => {
  it("returns nothing for another tenant", async () => {
    expect(await repos.experiences.list({ tenantId: OTHER_TENANT })).toHaveLength(0);
    expect(await repos.experiences.listHosts(OTHER_TENANT)).toHaveLength(0);
    expect(await repos.incidents.list(OTHER_TENANT)).toHaveLength(0);
  });

  it("does not resolve a valid slug under the wrong tenant", async () => {
    expect(
      await repos.experiences.getBySlug(OTHER_TENANT, "ghost-stories-by-lamplight")
    ).toBeNull();
  });

  it("does not resolve a valid host handle under the wrong tenant", async () => {
    expect(
      await repos.experiences.getHostByHandle(OTHER_TENANT, "the-lamplighter")
    ).toBeNull();
  });
});

describe("host reads never expose private identity", () => {
  it("returns only the public projection", async () => {
    const host = await repos.experiences.getHostByHandle(
      CURRENT_TENANT,
      "the-lamplighter"
    );
    expect(host?.public.displayName).toBe("The Lamplighter");
    expect(() => assertNoPrivateFields(host!.public, "host.public")).not.toThrow();
  });

  it("leaks no private column of any seeded user", async () => {
    const hosts = await repos.experiences.listHosts(CURRENT_TENANT);
    const serialized = JSON.stringify(hosts);

    for (const user of SEED_USERS_PRIVATE) {
      expect(serialized, `surname ${user.legalLastName} leaked`).not.toContain(
        user.legalLastName
      );
      expect(serialized, "email leaked").not.toContain(user.email);
      if (user.phone) expect(serialized).not.toContain(user.phone);
      if (user.payoutAccountRef)
        expect(serialized).not.toContain(user.payoutAccountRef);
    }

    for (const field of PRIVATE_ONLY_FIELDS) {
      expect(serialized).not.toContain(`"${field}"`);
    }
  });
});

describe("occurrences", () => {
  it("orders upcoming chronologically and excludes past ones", async () => {
    const upcoming = await repos.experiences.listUpcoming(CURRENT_TENANT);
    const times = upcoming.map((o) => new Date(o.startsAt).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    for (const time of times) expect(time).toBeGreaterThan(Date.now());
  });

  it("filters to the next 12 hours", async () => {
    const soon = await repos.experiences.listUpcoming(CURRENT_TENANT, {
      withinHours: 12,
    });
    expect(soon.length).toBeGreaterThan(0);
    for (const o of soon) {
      const delta = new Date(o.startsAt).getTime() - Date.now();
      expect(delta).toBeLessThanOrEqual(12 * 3_600_000);
    }
  });

  it("filters to crowdshared", async () => {
    const crowd = await repos.experiences.listUpcoming(CURRENT_TENANT, {
      crowdsharedOnly: true,
    });
    expect(crowd.length).toBeGreaterThan(0);
    expect(crowd.every((o) => o.bookingMode === "crowdshared")).toBe(true);
  });
});

describe("reserveSeats — the concurrency boundary", () => {
  async function freshOccurrence() {
    const upcoming = await repos.experiences.listUpcoming(CURRENT_TENANT, {
      crowdsharedOnly: true,
    });
    return upcoming.find((o) => seatsRemaining(o) > 4)!;
  }

  it("consumes inventory", async () => {
    const before = await freshOccurrence();
    await repos.experiences.reserveSeats(CURRENT_TENANT, before.id, 2);
    const after = await repos.experiences.getOccurrence(CURRENT_TENANT, before.id);
    expect(after!.seatsBooked).toBe(before.seatsBooked + 2);
  });

  it("rejects a reservation that would exceed capacity", async () => {
    const occurrence = await freshOccurrence();
    await expect(
      repos.experiences.reserveSeats(
        CURRENT_TENANT,
        occurrence.id,
        occurrence.capacity + 1
      )
    ).rejects.toThrow(/sold out|Could not reserve/i);
  });

  it("marks an occurrence sold out when the last seat goes", async () => {
    const occurrence = await freshOccurrence();
    const remaining = seatsRemaining(occurrence);
    await repos.experiences.reserveSeats(CURRENT_TENANT, occurrence.id, remaining);

    const after = await repos.experiences.getOccurrence(CURRENT_TENANT, occurrence.id);
    expect(after!.status).toBe("sold_out");
    expect(seatsRemaining(after!)).toBe(0);
  });

  it("never oversells under concurrent reservations", async () => {
    // The core race: many simultaneous attempts on limited inventory. The
    // conditional UPDATE must let exactly `capacity` seats through.
    const occurrence = await freshOccurrence();
    const remaining = seatsRemaining(occurrence);

    const attempts = await Promise.allSettled(
      Array.from({ length: remaining + 5 }, () =>
        repos.experiences.reserveSeats(CURRENT_TENANT, occurrence.id, 1)
      )
    );

    const succeeded = attempts.filter((a) => a.status === "fulfilled").length;
    expect(succeeded).toBe(remaining);

    const after = await repos.experiences.getOccurrence(CURRENT_TENANT, occurrence.id);
    expect(after!.seatsBooked).toBe(after!.capacity);
    expect(seatsRemaining(after!)).toBe(0);
  });

  it("refuses to reserve for another tenant", async () => {
    const occurrence = (
      await repos.experiences.listUpcoming(CURRENT_TENANT, { limit: 1 })
    )[0];
    await expect(
      repos.experiences.reserveSeats(OTHER_TENANT, occurrence.id, 1)
    ).rejects.toThrow();
  });
});

describe("bookings", () => {
  const HOST_USER = userId("usr_host_lamplighter");

  function makeBooking(code: string, seats: number): Booking {
    const id = bookingId(`bkg_${code.toLowerCase()}`);
    return {
      id,
      tenantId: CURRENT_TENANT,
      experienceId: experienceId("exp_ghost_stories"),
      occurrenceId: occurrenceId("occ_002"),
      guestUserId: userId("usr_guest_ada"),
      bookingMode: "crowdshared",
      deliveryMode: "remote",
      status: "confirmed",
      seatCount: seats,
      seats: Array.from({ length: seats }, (_, i) => ({
        id: seatId(`${id}_seat_${i + 1}`),
        bookingId: id,
        occurrenceId: occurrenceId("occ_002"),
        guestDisplayName: seats > 1 ? `Ada +${i}` : "Ada",
        bookingCode: code,
        pricePaid: money(1800),
      })),
      totalPrice: money(1800 * seats),
      bookingCode: code,
      createdAt: new Date().toISOString(),
    };
  }

  it("persists a booking with its seats", async () => {
    await repos.bookings.create(makeBooking("AAAA-11", 3));
    const found = await repos.bookings.getByCode(CURRENT_TENANT, "AAAA-11");

    expect(found?.seatCount).toBe(3);
    expect(found?.seats).toHaveLength(3);
    expect(found?.totalPrice.amountMinor).toBe(5400);
    expect(found?.seats.map((s) => s.guestDisplayName)).toEqual([
      "Ada +0",
      "Ada +1",
      "Ada +2",
    ]);
  });

  it("updates status and policy acceptance", async () => {
    const booking = await repos.bookings.getByCode(CURRENT_TENANT, "AAAA-11");
    const acceptedAt = new Date().toISOString();
    await repos.bookings.update({
      ...booking!,
      status: "completed",
      policiesAcceptedAt: acceptedAt,
    });

    const after = await repos.bookings.getByCode(CURRENT_TENANT, "AAAA-11");
    expect(after?.status).toBe("completed");
    expect(after?.policiesAcceptedAt).toBe(acceptedAt);
  });

  it("lists a guest's bookings", async () => {
    const list = await repos.bookings.listForGuest(
      CURRENT_TENANT,
      userId("usr_guest_ada")
    );
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((b) => b.seats.length === b.seatCount)).toBe(true);
  });

  it("scopes lookups by tenant", async () => {
    expect(await repos.bookings.getByCode(OTHER_TENANT, "AAAA-11")).toBeNull();
  });
});

describe("ledger", () => {
  const HOST_USER = userId("usr_host_lamplighter");
  const BOOKING = bookingId("bkg_aaaa-11");

  it("appends entries and reads them back per booking", async () => {
    await repos.ledger.append([
      createEntry({
        tenantId: CURRENT_TENANT,
        bookingId: BOOKING,
        type: "guest_charge",
        amount: money(5400),
        status: "released",
        memo: "Guest payment authorized",
      }),
      createEntry({
        tenantId: CURRENT_TENANT,
        bookingId: BOOKING,
        type: "host_guaranteed_compensation",
        amount: money(3780),
        status: "pending",
        payeeUserId: HOST_USER,
        memo: "Guaranteed compensation, released on compliant delivery",
      }),
    ]);

    const entries = await repos.ledger.listForBooking(CURRENT_TENANT, BOOKING);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.amount.amountMinor)).toContain(3780);
  });

  it("releases a pending guarantee via updateStatus", async () => {
    const released = await repos.ledger.updateStatus(
      CURRENT_TENANT,
      BOOKING,
      "host_guaranteed_compensation",
      "pending",
      "released"
    );
    expect(released).toHaveLength(1);
    expect(released[0].status).toBe("released");

    const entries = await repos.ledger.listForBooking(CURRENT_TENANT, BOOKING);
    const guarantee = entries.find(
      (e) => e.type === "host_guaranteed_compensation"
    );
    expect(guarantee?.status).toBe("released");
    // Amount is untouched — only status moves.
    expect(guarantee?.amount.amountMinor).toBe(3780);
  });

  it("is a no-op when nothing matches the from-status", async () => {
    const again = await repos.ledger.updateStatus(
      CURRENT_TENANT,
      BOOKING,
      "host_guaranteed_compensation",
      "pending",
      "released"
    );
    expect(again).toHaveLength(0);
  });

  it("summarizes host earnings from the seeded ledger", async () => {
    const entries = await repos.ledger.listForHost(CURRENT_TENANT, HOST_USER);
    const summary = summarizeHostEarnings(entries);

    expect(summary.released.amountMinor).toBeGreaterThan(0);
    expect(summary.held.amountMinor).toBeGreaterThan(0); // seeded dispute hold
    expect(summary.tips.amountMinor).toBe(500);
  });

  it("keeps a released guarantee for the 3-star seeded booking", async () => {
    // The invariant: an ordinary poor rating does not touch guaranteed pay.
    const entries = await repos.ledger.listForBooking(
      CURRENT_TENANT,
      bookingId("bkg_seed_004")
    );
    const guarantee = entries.find(
      (e) => e.type === "host_guaranteed_compensation"
    );
    expect(guarantee?.status).toBe("released");
  });
});

describe("reputation", () => {
  it("lists reviews for an experience and a host", async () => {
    const byExperience = await repos.reputation.listForExperience(
      CURRENT_TENANT,
      experienceId("exp_ghost_stories")
    );
    expect(byExperience.length).toBeGreaterThanOrEqual(2);

    const byHost = await repos.reputation.listForHost(
      CURRENT_TENANT,
      hostId("hst_lamplighter")
    );
    expect(byHost.length).toBeGreaterThanOrEqual(2);
  });

  it("round-trips structured feedback and an optional tip", async () => {
    const reviews = await repos.reputation.listForExperience(
      CURRENT_TENANT,
      experienceId("exp_ghost_stories")
    );
    const withTip = reviews.find((r) => r.tip);
    expect(withTip?.tip?.amountMinor).toBe(500);
    expect(withTip?.structured.meaningfullyInteractive).toBe(true);
  });

  it("stores a new review", async () => {
    await repos.reputation.create({
      id: reviewId("rev_pg_test"),
      tenantId: CURRENT_TENANT,
      bookingId: bookingId("bkg_aaaa-11"),
      experienceId: experienceId("exp_ghost_stories"),
      hostId: hostId("hst_lamplighter"),
      authorUserId: userId("usr_guest_ada"),
      rating: 4,
      publicComment: "Good fun.",
      structured: {
        deliveredAsAdvertised: true,
        meaningfullyInteractive: true,
        wouldBookAgain: true,
        memorable: false,
        inappropriateBehavior: false,
      },
      privateNotes: "internal only",
      createdAt: new Date().toISOString(),
    });

    const reviews = await repos.reputation.listForHost(
      CURRENT_TENANT,
      hostId("hst_lamplighter")
    );
    expect(reviews.some((r) => r.id === "rev_pg_test")).toBe(true);
  });
});

describe("incidents and risk signals", () => {
  it("lists the seeded queue newest first", async () => {
    const incidents = await repos.incidents.list(CURRENT_TENANT);
    expect(incidents.length).toBeGreaterThan(0);
    const times = incidents.map((i) => new Date(i.createdAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("filters by status", async () => {
    const submitted = await repos.incidents.list(CURRENT_TENANT, {
      status: "submitted",
    });
    expect(submitted.every((i) => i.status === "submitted")).toBe(true);
  });

  it("round-trips review notes as JSONB", async () => {
    const incident = await repos.incidents.getById(
      CURRENT_TENANT,
      incidentId("inc_001")
    );
    expect(incident?.reviewNotes.length).toBeGreaterThan(0);
    expect(incident?.reviewNotes[0].note).toContain("mute");
  });

  it("updates an incident's status", async () => {
    const incident = await repos.incidents.getById(
      CURRENT_TENANT,
      incidentId("inc_001")
    );
    await repos.incidents.update({ ...incident!, status: "investigating" });

    const after = await repos.incidents.getById(CURRENT_TENANT, incidentId("inc_001"));
    expect(after?.status).toBe("investigating");
  });

  it("keeps risk-signal context redacted", async () => {
    const signals = await repos.incidents.listRiskSignals(CURRENT_TENANT);
    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      expect(signal.context).not.toMatch(/@[\w-]+\.\w{2,}/);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
    }
  });
});
