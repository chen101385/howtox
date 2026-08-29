/**
 * Legacy adapter: `SiteConfig` (v0.1) → `ClientConfig` (v0.2).
 *
 * The original four clients were authored against a flat `SiteConfig`. Rewriting
 * them would be churn for no benefit, so they are adapted at load time instead.
 * Their rendered output is unchanged: the derived page composition lists exactly
 * the marketing sections each config already defines, in the original order.
 *
 * New clients should author `ClientConfig` directly.
 */

import type { ModuleId } from "@/modules/registry";
import { DEFAULT_TERMINOLOGY, APPOINTMENTS_TERMINOLOGY } from "./terminology";
import type { ClientConfig, PageSection, ProductPreset } from "./client-config";
import type { SiteConfig } from "./types";

/** Distinguishes the two shapes without needing a version field. */
export function isLegacySiteConfig(
  config: SiteConfig | ClientConfig
): config is SiteConfig {
  return "brand" in config && !("site" in config);
}

/**
 * Derives the home composition from whichever marketing sections the legacy
 * config actually defined, preserving the previous render order.
 */
function derivePageSections(legacy: SiteConfig): PageSection[] {
  const s = legacy.sections;
  const sections: PageSection[] = [{ id: "hero" }];

  if (s.services) sections.push({ id: "services" });
  if (s.about) sections.push({ id: "about" });
  if (s.testimonials) sections.push({ id: "testimonials" });
  if (s.pricing) sections.push({ id: "pricing" });
  if (s.faq) sections.push({ id: "faq" });
  if (legacy.modules?.booking?.enabled) sections.push({ id: "booking" });
  if (s.cta) sections.push({ id: "cta" });

  return sections;
}

function deriveModules(legacy: SiteConfig): ModuleId[] {
  const modules: ModuleId[] = ["marketing"];
  if (legacy.modules?.booking?.enabled) modules.push("booking");
  if (legacy.modules?.content?.enabled) modules.push("content");
  if (legacy.modules?.community?.enabled) modules.push("community");
  return modules;
}

export function normalizeLegacyConfig(legacy: SiteConfig): ClientConfig {
  const bookingEnabled = Boolean(legacy.modules?.booking?.enabled);
  const preset: ProductPreset = bookingEnabled ? "appointments" : "marketing";

  return {
    slug: legacy.slug,
    site: {
      brand: legacy.brand,
      theme: legacy.theme,
      contact: legacy.contact,
      nav: legacy.nav,
      seo: legacy.seo,
      sections: legacy.sections,
    },
    product: {
      preset,
      terminology: bookingEnabled ? APPOINTMENTS_TERMINOLOGY : DEFAULT_TERMINOLOGY,
      currency: "USD",
      timezone: legacy.modules?.booking?.timezone,
    },
    pages: {
      home: { preset: "marketing", sections: derivePageSections(legacy) },
    },
    modules: deriveModules(legacy),
    // Legacy clients carry no marketplace, compensation or trust policies —
    // they are brochure sites and must not acquire marketplace behavior.
    policies: {},
    integrations: {
      formEndpoint: legacy.integrations?.formEndpoint,
      analytics: legacy.integrations?.analytics,
      bookingEmbedUrl: legacy.modules?.booking?.embed?.url,
    },
  };
}

/** Accepts either shape and always returns the canonical one. */
export function toClientConfig(config: SiteConfig | ClientConfig): ClientConfig {
  return isLegacySiteConfig(config) ? normalizeLegacyConfig(config) : config;
}
