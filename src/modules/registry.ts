/**
 * Module registry.
 *
 * Replaces the previous approach of bolting new optional properties onto one large
 * config type. A module declares what it provides (capabilities), what it needs
 * (other modules), and what it contributes to the shell (navigation, page
 * sections, admin surfaces).
 *
 * Capabilities — not presets — are the source of truth for behavior. A preset only
 * chooses a starting set of modules.
 */

import type { Terms } from "@/config/terminology";

export type ModuleId =
  | "marketing"
  | "booking"
  | "marketplace"
  | "discovery"
  | "scheduling"
  | "sessions"
  | "commerce"
  | "messaging"
  | "reputation"
  | "trust-safety"
  | "content"
  | "community";

export type CapabilityId =
  | "marketing.sections"
  | "booking.appointments"
  | "marketplace.listings"
  | "marketplace.hosts"
  | "discovery.browse"
  | "discovery.intents"
  | "scheduling.occurrences"
  | "scheduling.capacity"
  | "sessions.live"
  | "sessions.lobby"
  | "commerce.checkout"
  | "commerce.tips"
  | "commerce.ledger"
  | "messaging.threads"
  | "reputation.reviews"
  | "trust.reporting"
  | "trust.watermarking"
  | "trust.moderation"
  | "content.library"
  | "content.live"
  | "community.forum";

export type NavContribution = {
  /** Stable key so a client can reorder or suppress a contributed link. */
  key: string;
  /** Built from terminology so no marketplace noun is hardcoded. */
  label: (t: Terms) => string;
  href: string;
  /** Only rendered when every listed capability is enabled. */
  requires: CapabilityId[];
};

export type AdminSurface = {
  key: string;
  label: string;
  href: string;
  requires: CapabilityId[];
};

export type ModuleDefinition = {
  id: ModuleId;
  description: string;
  /** Capabilities this module provides when enabled. */
  provides: CapabilityId[];
  /** Modules that must also be enabled. */
  requires: ModuleId[];
  nav?: NavContribution[];
  /** Section ids this module makes available to page composition. */
  sections?: string[];
  admin?: AdminSurface[];
  /** True when this module is scaffolding only in the current implementation. */
  foundationOnly?: boolean;
};

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  marketing: {
    id: "marketing",
    description: "Brochure sections: hero, services, about, testimonials, pricing, FAQ, CTA.",
    provides: ["marketing.sections"],
    requires: [],
    sections: ["hero", "services", "about", "testimonials", "pricing", "faq", "cta"],
  },

  booking: {
    id: "booking",
    description: "Appointment scheduling for single-provider businesses (embed or internal).",
    provides: ["booking.appointments"],
    requires: [],
    sections: ["booking"],
  },

  marketplace: {
    id: "marketplace",
    description: "Multi-host listings: experiences, host profiles, booking modes.",
    provides: ["marketplace.listings", "marketplace.hosts"],
    requires: ["discovery", "scheduling", "commerce"],
    nav: [
      {
        key: "discover",
        label: () => "Discover",
        href: "/discover",
        requires: ["discovery.browse"],
      },
      {
        key: "become-a-host",
        label: (t) => `Become a ${t.provider({ lower: true })}`,
        href: "/become-a-host",
        requires: ["marketplace.hosts"],
      },
    ],
    sections: [
      "marketplaceHero",
      "intentFilters",
      "liveTonight",
      "featuredExperiences",
      "storytelling",
      "crowdsharedEvents",
      "featuredHosts",
      "howItWorks",
      "trustAndSafety",
      "becomeAHost",
    ],
    admin: [
      {
        key: "host-experiences",
        label: "Experiences",
        href: "/host/experiences",
        requires: ["marketplace.listings"],
      },
      {
        key: "host-sessions",
        label: "Upcoming sessions",
        href: "/host/sessions",
        requires: ["scheduling.occurrences"],
      },
    ],
  },

  discovery: {
    id: "discovery",
    description: "Browse and intent-based filtering for undecided visitors.",
    provides: ["discovery.browse", "discovery.intents"],
    requires: [],
    sections: ["intentFilters", "liveTonight"],
  },

  scheduling: {
    id: "scheduling",
    description: "Occurrences, capacity and seat inventory.",
    provides: ["scheduling.occurrences", "scheduling.capacity"],
    requires: [],
  },

  sessions: {
    id: "sessions",
    description: "Live session lobby and room shell (provider-backed).",
    provides: ["sessions.live", "sessions.lobby"],
    requires: [],
  },

  commerce: {
    id: "commerce",
    description: "Checkout, tips and the compensation ledger.",
    provides: ["commerce.checkout", "commerce.tips", "commerce.ledger"],
    requires: [],
    admin: [
      {
        key: "host-earnings",
        label: "Earnings",
        href: "/host/earnings",
        requires: ["commerce.ledger"],
      },
    ],
  },

  messaging: {
    id: "messaging",
    description: "Conversations with anti-circumvention safeguards.",
    provides: ["messaging.threads"],
    requires: [],
  },

  reputation: {
    id: "reputation",
    description: "Structured post-session feedback and public reviews.",
    provides: ["reputation.reviews"],
    requires: [],
  },

  "trust-safety": {
    id: "trust-safety",
    description: "Reporting, moderation controls, watermarking, incident queue.",
    provides: ["trust.reporting", "trust.watermarking", "trust.moderation"],
    requires: [],
    sections: ["trustAndSafety"],
    admin: [
      {
        key: "ops-incidents",
        label: "Incident queue",
        href: "/ops/incidents",
        requires: ["trust.reporting"],
      },
    ],
  },

  content: {
    id: "content",
    description: "On-demand video library and live sessions.",
    provides: ["content.library", "content.live"],
    requires: [],
    foundationOnly: true,
  },

  community: {
    id: "community",
    description: "Forum with public, private and direct-message channels.",
    provides: ["community.forum"],
    requires: [],
    foundationOnly: true,
  },
};

export const ALL_MODULE_IDS = Object.keys(MODULES) as ModuleId[];

/* ---------------------------- Resolution -------------------------------- */

export class ModuleDependencyError extends Error {
  constructor(readonly missing: { module: ModuleId; requires: ModuleId }[]) {
    super(
      `Module dependency error:\n` +
        missing
          .map(
            (m) =>
              `  - "${m.module}" requires "${m.requires}", which is not enabled. ` +
              `Add "${m.requires}" to the client's modules array.`
          )
          .join("\n")
    );
    this.name = "ModuleDependencyError";
  }
}

/**
 * Validates that every enabled module has its dependencies enabled.
 * Deliberately does NOT auto-add them: a client config should state plainly what
 * it runs, rather than acquiring modules invisibly.
 */
export function validateModuleDependencies(enabled: readonly ModuleId[]): void {
  const set = new Set(enabled);
  const missing = enabled.flatMap((id) =>
    MODULES[id].requires
      .filter((dep) => !set.has(dep))
      .map((dep) => ({ module: id, requires: dep }))
  );
  if (missing.length > 0) throw new ModuleDependencyError(missing);
}

/** The capability set implied by the enabled modules. */
export function resolveCapabilities(enabled: readonly ModuleId[]): Set<CapabilityId> {
  const caps = new Set<CapabilityId>();
  for (const id of enabled) {
    for (const cap of MODULES[id].provides) caps.add(cap);
  }
  return caps;
}

export function hasCapabilities(
  caps: ReadonlySet<CapabilityId>,
  required: readonly CapabilityId[]
): boolean {
  return required.every((c) => caps.has(c));
}

/** Nav links contributed by enabled modules whose capability gates are satisfied. */
export function resolveModuleNav(
  enabled: readonly ModuleId[],
  caps: ReadonlySet<CapabilityId>
): NavContribution[] {
  return enabled
    .flatMap((id) => MODULES[id].nav ?? [])
    .filter((n) => hasCapabilities(caps, n.requires));
}

export function resolveAdminSurfaces(
  enabled: readonly ModuleId[],
  caps: ReadonlySet<CapabilityId>
): AdminSurface[] {
  return enabled
    .flatMap((id) => MODULES[id].admin ?? [])
    .filter((s) => hasCapabilities(caps, s.requires));
}
