import { describe, expect, it } from "vitest";
import { ClientConfigError, validateClientConfig } from "./schema";
import { resolveClient } from "./resolve";
import { normalizeLegacyConfig } from "./normalize";
import { CLIENT_SLUGS, resolveBySlug } from "./active";
import {
  MODULES,
  ModuleDependencyError,
  resolveCapabilities,
  validateModuleDependencies,
  type ModuleId,
} from "@/modules/registry";
import { MARKETPLACE_TERMINOLOGY, DEFAULT_TERMINOLOGY } from "./terminology";
import { DEFAULT_COMPENSATION_POLICY } from "@/domain/ledger";
import type { ClientConfig } from "./client-config";
import experienceDemo from "@clients/experience-demo/client";
import howToX from "@clients/how-to-x/config";
import teenEdge from "@clients/teen-edge/config";

/** A valid marketplace config used as the base for negative cases. */
function marketplaceConfig(overrides: Partial<ClientConfig> = {}): ClientConfig {
  return {
    ...experienceDemo,
    ...overrides,
    slug: overrides.slug ?? "test-client",
  };
}

describe("every registered client validates", () => {
  for (const slug of CLIENT_SLUGS) {
    it(`resolves "${slug}"`, () => {
      expect(() => resolveBySlug(slug)).not.toThrow();
    });
  }
});

describe("mega-menu navigation", () => {
  it("preserves configured mega-menu items when resolving a client", () => {
    const labels = resolveClient(howToX).nav.megaMenu?.map((item) => item.label);

    expect(labels).toEqual([
      "Who it’s for",
      "Services",
      "How it works",
      "Resources",
      "About",
    ]);
  });

  it("rejects a mega-menu item without link groups", () => {
    const malformed = structuredClone(howToX);
    malformed.site.nav.megaMenu![0].groups = [];

    expect(() => validateClientConfig(malformed)).toThrow(/groups/);
  });
});

describe("module dependency validation", () => {
  it("accepts a complete dependency set", () => {
    expect(() =>
      validateModuleDependencies([
        "marketing",
        "marketplace",
        "discovery",
        "scheduling",
        "commerce",
      ])
    ).not.toThrow();
  });

  it("rejects a module whose dependencies are missing", () => {
    // marketplace requires discovery + scheduling + commerce
    expect(() => validateModuleDependencies(["marketplace"])).toThrow(
      ModuleDependencyError
    );
  });

  it("names the missing dependency in the error", () => {
    try {
      validateModuleDependencies(["marketplace", "discovery"]);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as Error).message).toMatch(/scheduling|commerce/);
    }
  });

  it("derives capabilities from enabled modules only", () => {
    const caps = resolveCapabilities(["marketing"]);
    expect(caps.has("marketing.sections")).toBe(true);
    expect(caps.has("sessions.live")).toBe(false);
  });

  it("keeps every module's declared dependencies real", () => {
    for (const definition of Object.values(MODULES)) {
      for (const dep of definition.requires) {
        expect(MODULES[dep as ModuleId], `${definition.id} → ${dep}`).toBeDefined();
      }
    }
  });
});

describe("cross-field product rules", () => {
  it("rejects remote marketplace delivery without a sessions module", () => {
    const config = marketplaceConfig({
      modules: [
        "marketing",
        "marketplace",
        "discovery",
        "scheduling",
        "commerce",
        "reputation",
        "trust-safety",
        "messaging",
      ],
    });
    expect(() => validateClientConfig(config)).toThrow(/sessions/);
  });

  it("rejects crowdshared booking without capacity support", () => {
    const config = marketplaceConfig({
      policies: {
        ...experienceDemo.policies,
        marketplace: {
          deliveryModes: ["remote"],
          bookingModes: ["crowdshared"],
          // maxCrowdsharedSeats deliberately omitted
        },
      },
    });
    expect(() => validateClientConfig(config)).toThrow(/maxCrowdsharedSeats/);
  });

  it("rejects tips without the commerce module", () => {
    const config: ClientConfig = {
      ...teenEdgeAsClientConfig(),
      policies: { compensation: DEFAULT_COMPENSATION_POLICY },
    };
    expect(() => validateClientConfig(config)).toThrow(/commerce/);
  });

  it("rejects the interactive-experiences preset with generic terminology", () => {
    const config = marketplaceConfig({
      product: {
        ...experienceDemo.product,
        terminology: DEFAULT_TERMINOLOGY,
      },
    });
    expect(() => validateClientConfig(config)).toThrow(/terminology/);
  });

  it("rejects in-person delivery, which is modeled but not implemented", () => {
    const config = marketplaceConfig({
      policies: {
        ...experienceDemo.policies,
        marketplace: {
          deliveryModes: ["remote", "in_person"],
          bookingModes: ["one_to_one"],
          maxCrowdsharedSeats: 10,
        },
      },
    });
    expect(() => validateClientConfig(config)).toThrow(/In-person/);
  });

  it("rejects compensation allocations exceeding the guest price", () => {
    const config = marketplaceConfig({
      policies: {
        ...experienceDemo.policies,
        compensation: {
          ...DEFAULT_COMPENSATION_POLICY,
          guaranteedShareBps: 9000,
          platformFeeBps: 3000,
        },
      },
    });
    expect(() => validateClientConfig(config)).toThrow(/exceeds 100%/);
  });

  it("rejects watermarking without the trust-safety module", () => {
    const config = marketplaceConfig({
      modules: [
        "marketing",
        "marketplace",
        "discovery",
        "scheduling",
        "sessions",
        "commerce",
        "reputation",
      ],
    });
    expect(() => validateClientConfig(config)).toThrow(/trust-safety/);
  });

  it("rejects a malformed slug", () => {
    expect(() => validateClientConfig(marketplaceConfig({ slug: "Not A Slug" }))).toThrow(
      ClientConfigError
    );
  });

  it("accepts the shipped demo client unchanged", () => {
    expect(() => validateClientConfig(experienceDemo)).not.toThrow();
  });
});

describe("legacy SiteConfig compatibility", () => {
  it("normalizes a legacy client without modification", () => {
    const normalized = normalizeLegacyConfig(teenEdge);
    expect(normalized.slug).toBe("teen-edge");
    expect(normalized.site.brand.name).toBe(teenEdge.brand.name);
    expect(normalized.product.preset).toBe("appointments"); // booking enabled
  });

  it("derives a page composition from the sections the client defined", () => {
    const ids = normalizeLegacyConfig(teenEdge).pages.home.sections.map((s) => s.id);
    expect(ids[0]).toBe("hero");
    expect(ids).toContain("services");
    expect(ids).toContain("pricing");
    expect(ids).toContain("faq");
    // teen-edge has no `content`/`community` sections, so none should appear.
    expect(ids).not.toContain("marketplaceHero");
  });

  it("gives legacy clients no marketplace capabilities", () => {
    const resolved = resolveClient(teenEdge);
    expect(resolved.has("marketplace.listings")).toBe(false);
    expect(resolved.has("sessions.live")).toBe(false);
    expect(resolved.has("marketing.sections")).toBe(true);
  });

  it("contributes no marketplace navigation to a legacy client", () => {
    const resolved = resolveClient(teenEdge);
    const hrefs = resolved.nav.links.map((l) => l.href);
    expect(hrefs).not.toContain("/discover");
    expect(hrefs).not.toContain("/become-a-host");
  });
});

describe("resolved marketplace client", () => {
  const resolved = resolveClient(experienceDemo);

  it("contributes marketplace navigation", () => {
    const hrefs = resolved.nav.links.map((l) => l.href);
    expect(hrefs).toContain("/discover");
    expect(hrefs).toContain("/become-a-host");
  });

  it("uses marketplace terminology", () => {
    expect(resolved.terms.provider()).toBe("Host");
    expect(resolved.terms.customer({ plural: true })).toBe("Guests");
    expect(resolved.terms.listing({ lower: true })).toBe("experience");
    expect(resolved.terms.groupBooking()).toBe(MARKETPLACE_TERMINOLOGY.groupBooking.singular);
  });

  it("is remote-only", () => {
    expect(resolved.config.policies.marketplace?.deliveryModes).toEqual(["remote"]);
    expect(resolved.config.policies.marketplace?.inPerson?.enabled).toBe(false);
  });

  it("offers all three booking modes", () => {
    expect(resolved.config.policies.marketplace?.bookingModes).toEqual([
      "one_to_one",
      "private_group",
      "crowdshared",
    ]);
  });

  it("has no platform recording feature", () => {
    expect(resolved.config.policies.recording?.platformRecordingEnabled).toBe(false);
    expect(resolved.config.policies.recording?.watermarkEnabled).toBe(true);
  });

  it("exposes admin surfaces only for enabled capabilities", () => {
    const keys = resolved.adminSurfaces.map((s) => s.key);
    expect(keys).toContain("ops-incidents");
    expect(keys).toContain("host-earnings");
  });
});

/** teen-edge as a ClientConfig, for tests that need the canonical shape. */
function teenEdgeAsClientConfig(): ClientConfig {
  return normalizeLegacyConfig(teenEdge);
}

describe("legal document rules", () => {
  const withLegal = (documents: ClientConfig["legal"]) =>
    marketplaceConfig({ legal: documents });

  it("accepts the demo client's documents", () => {
    expect(() => validateClientConfig(marketplaceConfig())).not.toThrow();
  });

  it("requires terms and privacy once a client can take money", () => {
    // A brochure site genuinely does not need terms. A checkout does.
    const config = withLegal({
      documents: experienceDemo.legal!.documents.filter(
        (d) => d.id !== "terms" && d.id !== "privacy"
      ),
    });

    expect(() => validateClientConfig(config)).toThrow(ClientConfigError);
    try {
      validateClientConfig(config);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('"terms"');
      expect(message).toContain('"privacy"');
    }
  });

  it("requires cancellation and conduct for a marketplace", () => {
    const config = withLegal({
      documents: experienceDemo.legal!.documents.filter(
        (d) => d.id !== "cancellation" && d.id !== "conduct"
      ),
    });

    expect(() => validateClientConfig(config)).toThrow(/cancellation/);
  });

  it("rejects a document with no sections", () => {
    // An empty policy page is worse than an absent one: it reads as published.
    const config = withLegal({
      documents: experienceDemo.legal!.documents.map((d) =>
        d.id === "conduct" ? { ...d, sections: [] } : d
      ),
    });

    expect(() => validateClientConfig(config)).toThrow(/no sections/);
  });

  it("rejects an unparseable updatedAt", () => {
    // The date is shown to readers as the answer to "when did this change".
    const config = withLegal({
      documents: experienceDemo.legal!.documents.map((d) =>
        d.id === "terms" ? { ...d, updatedAt: "last tuesday" } : d
      ),
    });

    expect(() => validateClientConfig(config)).toThrow(/not a parseable date/);
  });

  it("marks the demo documents as unreviewed template text", () => {
    // If this ever fails because someone cleared the flag, the accompanying
    // change had better include actual legal review.
    for (const document of experienceDemo.legal!.documents) {
      expect(document.templateOnly, document.id).toBe(true);
    }
  });

  it("states the compensation guarantee accurately in the terms", () => {
    // The terms must not contradict the code. Guaranteed compensation does not
    // depend on a rating, and the document that people rely on should say so.
    const terms = experienceDemo.legal!.documents.find((d) => d.id === "terms")!;
    const text = terms.sections.flatMap((s) => s.body).join(" ").toLowerCase();

    expect(text).toContain("does not depend on the rating");
    expect(text).toContain("can never reduce the guarantee");
  });

  it("does not claim recording is prevented or detected", () => {
    // The product invariant, asserted against the customer-facing document.
    const terms = experienceDemo.legal!.documents.find((d) => d.id === "terms")!;
    const text = terms.sections.flatMap((s) => s.body).join(" ").toLowerCase();

    expect(text).toContain("we do not claim to prevent recording");
    expect(text).not.toMatch(/recording is (impossible|blocked|prevented)/);
  });
});
