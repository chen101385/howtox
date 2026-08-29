/**
 * Resolves a validated ClientConfig into the object the application actually
 * consumes: terminology accessors, the capability set, and the navigation
 * assembled from client links plus module contributions.
 *
 * Components should depend on `ResolvedClient`, never on raw config plumbing, so
 * capability checks have exactly one shape (`client.has("sessions.live")`).
 */

import {
  resolveAdminSurfaces,
  resolveCapabilities,
  resolveModuleNav,
  type AdminSurface,
  type CapabilityId,
  type ModuleId,
} from "@/modules/registry";
import { createTerms, type Terms } from "./terminology";
import { validateClientConfig } from "./schema";
import { toClientConfig } from "./normalize";
import type { ClientConfig, Link } from "./client-config";
import type { SiteConfig } from "./types";

export type ResolvedClient = {
  config: ClientConfig;
  slug: string;
  terms: Terms;
  modules: ModuleId[];
  capabilities: ReadonlySet<CapabilityId>;
  /** Client nav links plus capability-gated module contributions. */
  nav: { links: Link[]; cta?: Link };
  adminSurfaces: AdminSurface[];
  has: (...caps: CapabilityId[]) => boolean;
  hasModule: (id: ModuleId) => boolean;
};

export function resolveClient(input: SiteConfig | ClientConfig): ResolvedClient {
  const config = validateClientConfig(toClientConfig(input));
  const modules = config.modules as ModuleId[];
  const capabilities = resolveCapabilities(modules);
  const terms = createTerms(config.product.terminology);

  // Module links are appended after the client's own links, and a client can
  // suppress one by declaring a link with the same href.
  const clientHrefs = new Set(config.site.nav.links.map((l) => l.href));
  const moduleLinks: Link[] = resolveModuleNav(modules, capabilities)
    .filter((n) => !clientHrefs.has(n.href))
    .map((n) => ({ label: n.label(terms), href: n.href }));

  return {
    config,
    slug: config.slug,
    terms,
    modules,
    capabilities,
    nav: {
      links: [...config.site.nav.links, ...moduleLinks],
      cta: config.site.nav.cta,
    },
    adminSurfaces: resolveAdminSurfaces(modules, capabilities),
    has: (...caps) => caps.every((c) => capabilities.has(c)),
    hasModule: (id) => modules.includes(id),
  };
}
