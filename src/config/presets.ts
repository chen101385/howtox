/**
 * Product presets.
 *
 * A preset is a CONVENIENCE that supplies sensible defaults for modules, policies
 * and page composition. It is not the source of truth — once a config is resolved,
 * the enabled modules and their capabilities determine behavior. A client may
 * start from a preset and then add or remove modules freely.
 */

import type { ModuleId } from "@/modules/registry";
import {
  APPOINTMENTS_TERMINOLOGY,
  DEFAULT_TERMINOLOGY,
  MARKETPLACE_TERMINOLOGY,
  type Terminology,
} from "./terminology";
import { DEFAULT_COMPENSATION_POLICY } from "@/domain/ledger";
import type {
  PageComposition,
  PoliciesConfig,
  ProductPreset,
} from "./client-config";

export type PresetDefinition = {
  id: ProductPreset;
  description: string;
  modules: ModuleId[];
  terminology: Terminology;
  policies: PoliciesConfig;
  homePage: PageComposition;
};

const MARKETING_HOME: PageComposition = {
  preset: "marketing",
  sections: [
    { id: "hero" },
    { id: "services" },
    { id: "about" },
    { id: "testimonials" },
    { id: "pricing" },
    { id: "faq" },
    { id: "cta" },
  ],
};

const MARKETPLACE_HOME: PageComposition = {
  preset: "marketplace",
  sections: [
    { id: "marketplaceHero" },
    { id: "intentFilters" },
    { id: "liveTonight" },
    { id: "featuredExperiences" },
    { id: "storytelling" },
    { id: "crowdsharedEvents" },
    { id: "featuredHosts" },
    { id: "howItWorks" },
    { id: "trustAndSafety" },
    { id: "becomeAHost" },
  ],
};

export const PRESETS: Record<ProductPreset, PresetDefinition> = {
  marketing: {
    id: "marketing",
    description: "Brochure site: sections, contact, optional appointment embed.",
    modules: ["marketing"],
    terminology: DEFAULT_TERMINOLOGY,
    policies: {},
    homePage: MARKETING_HOME,
  },

  appointments: {
    id: "appointments",
    description: "Single-provider appointment business: marketing plus booking.",
    modules: ["marketing", "booking"],
    terminology: APPOINTMENTS_TERMINOLOGY,
    policies: {},
    homePage: {
      preset: "marketing",
      sections: [...MARKETING_HOME.sections, { id: "booking" }],
    },
  },

  "interactive-experiences": {
    id: "interactive-experiences",
    description:
      "Remote marketplace for live, interactive entertainment and recreational education.",
    modules: [
      "marketing",
      "marketplace",
      "discovery",
      "scheduling",
      "sessions",
      "commerce",
      "messaging",
      "reputation",
      "trust-safety",
    ],
    terminology: MARKETPLACE_TERMINOLOGY,
    policies: {
      compensation: DEFAULT_COMPENSATION_POLICY,
      identity: {
        allowedDisplayStyles: [
          "first_name",
          "first_name_last_initial",
          "nickname",
          "stage_name",
        ],
        pseudonymousByDefault: true,
        identityVerificationOffered: true,
      },
      recording: {
        platformRecordingEnabled: false,
        requirePolicyAcceptance: true,
        watermarkEnabled: true,
        watermarkMoveIntervalSeconds: 20,
        samplesExempt: true,
      },
      moderation: {
        reportingEnabled: true,
        hostModerationControls: true,
        antiCircumventionEnabled: true,
        retainOperationalMetadata: true,
      },
      marketplace: {
        deliveryModes: ["remote"],
        bookingModes: ["one_to_one", "private_group", "crowdshared"],
        maxCrowdsharedSeats: 100,
        inPerson: {
          enabled: false,
          approximateLocationOnly: true,
          exactLocationDisclosureMinutesBefore: 120,
        },
      },
    },
    homePage: MARKETPLACE_HOME,
  },
};

export const PRESET_IDS = Object.keys(PRESETS) as ProductPreset[];

export function getPreset(id: ProductPreset): PresetDefinition {
  const preset = PRESETS[id];
  if (!preset) {
    throw new Error(
      `Unknown product preset "${id}". Known presets: ${PRESET_IDS.join(", ")}`
    );
  }
  return preset;
}
