import { describe, expect, it } from "vitest";
import { createMemoryRepositories } from "./memory";
import { CURRENT_TENANT } from ".";
import { tenantId, hostId, experienceId } from "@/domain/ids";
import { money } from "@/domain/money";
import { seatsRemaining, startsWithinHours } from "@/domain/experience";

/**
 * Seed and repository behavior.
 *
 * Also guards the tenant-scoping contract: every query filters by tenant, so a
 * future multi-brand backend inherits isolation rather than retrofitting it.
 */

const repos = createMemoryRepositories();
const OTHER_TENANT = tenantId("some-other-tenant");

describe("experience seed", () => {
  it("publishes ten experiences", async () => {
    const all = await repos.experiences.list({ tenantId: CURRENT_TENANT });
    expect(all).toHaveLength(10);
  });

  it("includes storytelling as a first-class category", async () => {
    const stories = await repos.experiences.list({
      tenantId: CURRENT_TENANT,
      category: "storytelling",
    });
    expect(stories.length).toBeGreaterThanOrEqual(2);
    expect(stories.map((e) => e.title)).toContain("Ghost Stories by Lamplight");
  });

  it("covers the required category range", async () => {
    const all = await repos.experiences.list({ tenantId: CURRENT_TENANT });
    const categories = new Set(all.map((e) => e.category));
    for (const expected of ["storytelling", "comedy", "magic", "music", "dj", "cooking", "improv", "games"]) {
      expect(categories.has(expected as never), expected).toBe(true);
    }
  });

  it("offers all three booking modes across the catalogue", async () => {
    const all = await repos.experiences.list({ tenantId: CURRENT_TENANT });
    const modes = new Set(all.flatMap((e) => e.bookingModes));
    expect(modes).toEqual(new Set(["one_to_one", "private_group", "crowdshared"]));
  });

  it("is remote-only", async () => {
    const all = await repos.experiences.list({ tenantId: CURRENT_TENANT });
    for (const experience of all) {
      expect(experience.deliveryModes, experience.slug).toEqual(["remote"]);
    }
  });

  it("gives every experience at least one sample and local cover art", async () => {
    const all = await repos.experiences.list({ tenantId: CURRENT_TENANT });
    for (const experience of all) {
      expect(experience.samples.length, experience.slug).toBeGreaterThan(0);
      expect(experience.cover.src).toMatch(/^\/clients\/experience-demo\/assets\//);
      expect(experience.cover.alt.length).toBeGreaterThan(0);
    }
  });

  it("prices every offered booking mode", async () => {
    const all = await repos.experiences.list({ tenantId: CURRENT_TENANT });
    for (const experience of all) {
      for (const mode of experience.bookingModes) {
        const key =
          mode === "one_to_one"
            ? "oneToOne"
            : mode === "private_group"
              ? "privateGroup"
              : "perSeat";
        expect(experience.pricing[key], `${experience.slug}/${mode}`).toBeDefined();
      }
    }
  });
});

describe("tenant scoping", () => {
  it("returns nothing for a different tenant", async () => {
    expect(await repos.experiences.list({ tenantId: OTHER_TENANT })).toHaveLength(0);
    expect(await repos.experiences.listHosts(OTHER_TENANT)).toHaveLength(0);
    expect(await repos.incidents.list(OTHER_TENANT)).toHaveLength(0);
  });

  it("does not resolve a valid slug under the wrong tenant", async () => {
    const found = await repos.experiences.getBySlug(
      OTHER_TENANT,
      "ghost-stories-by-lamplight"
    );
    expect(found).toBeNull();
  });
});

describe("queries", () => {
  it("finds an experience by slug", async () => {
    const found = await repos.experiences.getBySlug(
      CURRENT_TENANT,
      "ghost-stories-by-lamplight"
    );
    expect(found?.category).toBe("storytelling");
  });

  it("filters by max price using the cheapest available option", async () => {
    const cheap = await repos.experiences.list({
      tenantId: CURRENT_TENANT,
      maxPrice: money(1500),
    });
    expect(cheap.length).toBeGreaterThan(0);
    expect(cheap.every((e) => {
      const lowest = Math.min(
        ...[
          e.pricing.perSeat?.amountMinor,
          e.pricing.oneToOne?.amountMinor,
          e.pricing.privateGroup?.amountMinor,
        ].filter((v): v is number => typeof v === "number")
      );
      return lowest <= 1500;
    })).toBe(true);
  });

  it("searches title and description", async () => {
    const results = await repos.experiences.list({
      tenantId: CURRENT_TENANT,
      search: "beatmatch",
    });
    expect(results.map((e) => e.slug)).toContain("your-first-hour-on-the-decks");
  });

  it("respects a limit", async () => {
    const limited = await repos.experiences.list({ tenantId: CURRENT_TENANT, limit: 3 });
    expect(limited).toHaveLength(3);
  });

  it("lists experiences by host", async () => {
    const byHost = await repos.experiences.listByHost(
      CURRENT_TENANT,
      hostId("hst_cordelia")
    );
    expect(byHost).toHaveLength(2); // magic show + learn three tricks
  });

  it("returns null for an unknown id", async () => {
    expect(
      await repos.experiences.getById(CURRENT_TENANT, experienceId("nope"))
    ).toBeNull();
  });
});

describe("occurrences", () => {
  it("schedules something within the next 12 hours for the live rail", async () => {
    const soon = await repos.experiences.listUpcoming(CURRENT_TENANT, {
      withinHours: 12,
    });
    expect(soon.length).toBeGreaterThan(0);
    for (const occurrence of soon) {
      expect(startsWithinHours(occurrence, 12)).toBe(true);
    }
  });

  it("returns upcoming occurrences in chronological order", async () => {
    const upcoming = await repos.experiences.listUpcoming(CURRENT_TENANT);
    const times = upcoming.map((o) => new Date(o.startsAt).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("filters to crowdshared occurrences", async () => {
    const crowd = await repos.experiences.listUpcoming(CURRENT_TENANT, {
      crowdsharedOnly: true,
    });
    expect(crowd.length).toBeGreaterThan(0);
    expect(crowd.every((o) => o.bookingMode === "crowdshared")).toBe(true);
  });

  it("never reports negative remaining seats", async () => {
    const all = await repos.experiences.listUpcoming(CURRENT_TENANT);
    for (const occurrence of all) {
      expect(seatsRemaining(occurrence)).toBeGreaterThanOrEqual(0);
    }
  });

  it("excludes occurrences that already started", async () => {
    const upcoming = await repos.experiences.listUpcoming(CURRENT_TENANT);
    for (const occurrence of upcoming) {
      expect(new Date(occurrence.startsAt).getTime()).toBeGreaterThan(Date.now());
    }
  });
});

describe("hosts", () => {
  it("resolves a host by public handle", async () => {
    const host = await repos.experiences.getHostByHandle(
      CURRENT_TENANT,
      "the-lamplighter"
    );
    expect(host?.public.displayName).toBe("The Lamplighter");
  });

  it("has an experience for every seeded host reference", async () => {
    const all = await repos.experiences.list({ tenantId: CURRENT_TENANT });
    for (const experience of all) {
      const host = await repos.experiences.getHost(CURRENT_TENANT, experience.hostId);
      expect(host, `missing host for ${experience.slug}`).not.toBeNull();
    }
  });
});

describe("trust & safety seed", () => {
  it("seeds an incident queue", async () => {
    const incidents = await repos.incidents.list(CURRENT_TENANT);
    expect(incidents.length).toBeGreaterThan(0);
  });

  it("filters incidents by status", async () => {
    const submitted = await repos.incidents.list(CURRENT_TENANT, {
      status: "submitted",
    });
    expect(submitted.every((i) => i.status === "submitted")).toBe(true);
  });

  it("keeps risk-signal context redacted", async () => {
    const signals = await repos.incidents.listRiskSignals(CURRENT_TENANT);
    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      expect(signal.context).not.toMatch(/@[\w-]+\.\w{2,}/); // no raw email
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
    }
  });
});

describe("ledger seed", () => {
  it("shows a released guarantee for a middling review", async () => {
    const entries = await repos.ledger.listForBooking(
      CURRENT_TENANT,
      // bkg_seed_004 received a 3★ review
      "bkg_seed_004" as never
    );
    const guarantee = entries.find(
      (e) => e.type === "host_guaranteed_compensation"
    );
    expect(guarantee?.status).toBe("released");
  });
});
