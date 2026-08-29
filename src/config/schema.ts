/**
 * Runtime validation for client configuration.
 *
 * Structural checks come from Zod; the interesting rules are the CROSS-FIELD
 * invariants below, which catch config that is individually well-typed but
 * incoherent as a product (e.g. crowdshared booking with no per-seat pricing
 * support). Failures throw at load with a message naming the client and the fix.
 */

import { z } from "zod";
import {
  ALL_MODULE_IDS,
  resolveCapabilities,
  validateModuleDependencies,
  type ModuleId,
} from "@/modules/registry";
import { PRESET_IDS } from "./presets";
import type { ClientConfig } from "./client-config";

/* ------------------------------ Primitives ------------------------------ */

const imageRef = z.object({
  src: z.string().min(1),
  alt: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const link = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  emphasized: z.boolean().optional(),
  external: z.boolean().optional(),
});

const termPair = z.object({
  singular: z.string().min(1),
  plural: z.string().min(1),
});

const terminology = z.object({
  provider: termPair,
  customer: termPair,
  listing: termPair,
  occurrence: termPair,
  groupBooking: termPair,
});

const themeConfig = z.object({
  colors: z.object({
    primary: z.string(),
    primaryFg: z.string(),
    secondary: z.string(),
    secondaryFg: z.string(),
    accent: z.string(),
    accentFg: z.string(),
    bg: z.string(),
    surface: z.string(),
    fg: z.string(),
    muted: z.string(),
    border: z.string(),
  }),
  fonts: z.object({ sans: z.string(), heading: z.string() }),
  radius: z.string(),
  mode: z.enum(["light", "dark"]).optional(),
});

const bookingMode = z.enum(["one_to_one", "private_group", "crowdshared"]);
const deliveryMode = z.enum(["remote", "in_person"]);

const compensationPolicy = z.object({
  guaranteedShareBps: z.number().int().min(0).max(10_000),
  maxPerformanceBonusBps: z.number().int().min(0).max(10_000),
  platformFeeBps: z.number().int().min(0).max(10_000),
  processingAllocationBps: z.number().int().min(0).max(10_000),
  tipsEnabled: z.boolean(),
  lateCancellationCompensationBps: z.number().int().min(0).max(10_000),
  cancellationWindowHours: z.number().min(0),
});

const policies = z.object({
  compensation: compensationPolicy.optional(),
  identity: z
    .object({
      allowedDisplayStyles: z
        .array(
          z.enum(["first_name", "first_name_last_initial", "nickname", "stage_name"])
        )
        .min(1),
      pseudonymousByDefault: z.boolean(),
      identityVerificationOffered: z.boolean(),
    })
    .optional(),
  recording: z
    .object({
      platformRecordingEnabled: z.boolean(),
      requirePolicyAcceptance: z.boolean(),
      watermarkEnabled: z.boolean(),
      watermarkMoveIntervalSeconds: z.number().int().positive(),
      samplesExempt: z.boolean(),
    })
    .optional(),
  moderation: z
    .object({
      reportingEnabled: z.boolean(),
      hostModerationControls: z.boolean(),
      antiCircumventionEnabled: z.boolean(),
      retainOperationalMetadata: z.boolean(),
    })
    .optional(),
  marketplace: z
    .object({
      deliveryModes: z.array(deliveryMode).min(1),
      bookingModes: z.array(bookingMode).min(1),
      maxCrowdsharedSeats: z.number().int().positive().optional(),
      inPerson: z
        .object({
          enabled: z.literal(false),
          approximateLocationOnly: z.literal(true),
          exactLocationDisclosureMinutesBefore: z.number().int().nonnegative(),
        })
        .optional(),
    })
    .optional(),
});

const pageSection = z.object({
  id: z.string().min(1),
  options: z.record(z.string(), z.unknown()).optional(),
});

export const clientConfigSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase kebab-case (letters, digits, single hyphens)"
    ),
  site: z.object({
    brand: z.object({
      name: z.string().min(1),
      tagline: z.string().optional(),
      logo: imageRef,
      logoInverse: imageRef.optional(),
      favicon: z.string().optional(),
      domain: z.string().optional(),
    }),
    theme: themeConfig,
    contact: z.unknown().optional(),
    nav: z.object({ links: z.array(link), cta: link.optional() }),
    seo: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      ogImage: imageRef.optional(),
    }),
    sections: z.unknown().optional(),
  }),
  product: z.object({
    preset: z.enum(PRESET_IDS as [string, ...string[]]),
    terminology,
    currency: z.string().length(3),
    timezone: z.string().optional(),
  }),
  pages: z.object({
    home: z.object({
      preset: z.enum(["marketing", "marketplace"]).optional(),
      sections: z.array(pageSection).min(1),
    }),
  }),
  modules: z.array(z.enum(ALL_MODULE_IDS as [string, ...string[]])).min(1),
  policies,
  integrations: z.record(z.string(), z.unknown()),
});

/* -------------------------- Cross-field rules --------------------------- */

export class ClientConfigError extends Error {
  constructor(slug: string, problems: string[]) {
    super(
      `Invalid client configuration for "${slug}":\n` +
        problems.map((p) => `  - ${p}`).join("\n")
    );
    this.name = "ClientConfigError";
  }
}

/**
 * Product-coherence rules. Each returns a problem string when violated.
 * These are the checks that structural typing cannot express.
 */
function crossFieldProblems(config: ClientConfig): string[] {
  const problems: string[] = [];
  const modules = config.modules as ModuleId[];
  const enabled = new Set(modules);
  const caps = resolveCapabilities(modules);
  const marketplace = config.policies.marketplace;

  const isMarketplace = enabled.has("marketplace");

  // Remote marketplace delivery requires a live-session capability: a remote
  // experience with nowhere to happen is not deliverable.
  if (isMarketplace && marketplace?.deliveryModes.includes("remote")) {
    if (!caps.has("sessions.live")) {
      problems.push(
        `Remote marketplace delivery requires the "sessions" module (capability "sessions.live"). ` +
          `Add "sessions" to modules, or remove "remote" from policies.marketplace.deliveryModes.`
      );
    }
  }

  // Crowdshared booking needs occurrence capacity and per-seat pricing support.
  if (marketplace?.bookingModes.includes("crowdshared")) {
    if (!caps.has("scheduling.capacity")) {
      problems.push(
        `Crowdshared booking requires occurrence capacity (capability "scheduling.capacity"). ` +
          `Add the "scheduling" module.`
      );
    }
    if (!caps.has("commerce.checkout")) {
      problems.push(
        `Crowdshared booking requires per-seat pricing support (capability "commerce.checkout"). ` +
          `Add the "commerce" module.`
      );
    }
    if (marketplace.maxCrowdsharedSeats === undefined) {
      problems.push(
        `Crowdshared booking requires policies.marketplace.maxCrowdsharedSeats to bound occurrence capacity.`
      );
    }
  }

  // Tips require commerce.
  if (config.policies.compensation?.tipsEnabled && !caps.has("commerce.tips")) {
    problems.push(
      `Tips are enabled in policies.compensation but the "commerce" module is not enabled ` +
        `(capability "commerce.tips" missing).`
    );
  }

  // The interactive-experiences preset must define marketplace terminology.
  if (config.product.preset === "interactive-experiences") {
    const t = config.product.terminology;
    const defaults = { provider: "Provider", customer: "Customer", listing: "Offering" };
    if (
      t.provider.singular === defaults.provider ||
      t.customer.singular === defaults.customer ||
      t.listing.singular === defaults.listing
    ) {
      problems.push(
        `The "interactive-experiences" preset must define marketplace terminology ` +
          `(e.g. Host / Guest / Experience). Found generic defaults in product.terminology.`
      );
    }
    if (!marketplace) {
      problems.push(
        `The "interactive-experiences" preset requires policies.marketplace to be defined.`
      );
    }
  }

  // In-person delivery is not built. Fail loudly rather than rendering a broken flow.
  if (marketplace?.deliveryModes.includes("in_person")) {
    problems.push(
      `In-person delivery is modeled but not implemented. Keep policies.marketplace.deliveryModes ` +
        `as ["remote"] until location handling, safety review and logistics exist.`
    );
  }

  // Compensation shares must not exceed the guest price.
  const comp = config.policies.compensation;
  if (comp) {
    const total =
      comp.guaranteedShareBps +
      comp.maxPerformanceBonusBps +
      comp.platformFeeBps +
      comp.processingAllocationBps;
    if (total > 10_000) {
      problems.push(
        `Compensation allocations total ${(total / 100).toFixed(2)}% of the guest price, which exceeds 100%. ` +
          `Reduce guaranteedShareBps / maxPerformanceBonusBps / platformFeeBps / processingAllocationBps.`
      );
    }
  }

  // Watermarking and reporting are meaningless without the trust-safety module.
  if (config.policies.recording?.watermarkEnabled && !caps.has("trust.watermarking")) {
    problems.push(
      `policies.recording.watermarkEnabled is true but the "trust-safety" module is not enabled.`
    );
  }
  if (config.policies.moderation?.reportingEnabled && !caps.has("trust.reporting")) {
    problems.push(
      `policies.moderation.reportingEnabled is true but the "trust-safety" module is not enabled.`
    );
  }

  return problems;
}

/**
 * Full validation: structure, module dependencies, then product coherence.
 * Throws `ClientConfigError` with every problem found, so one run surfaces all of
 * them rather than one per attempt.
 */
export function validateClientConfig(config: ClientConfig): ClientConfig {
  const parsed = clientConfigSchema.safeParse(config);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
    );
    throw new ClientConfigError(config.slug ?? "(unknown)", problems);
  }

  try {
    validateModuleDependencies(config.modules);
  } catch (err) {
    throw new ClientConfigError(config.slug, [(err as Error).message]);
  }

  const problems = crossFieldProblems(config);
  if (problems.length > 0) throw new ClientConfigError(config.slug, problems);

  return config;
}
