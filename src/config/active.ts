import type { ClientConfig } from "./client-config";
import { resolveClient, type ResolvedClient } from "./resolve";
import type { SiteConfig } from "./types";

import teenEdge from "@clients/teen-edge/config";
import mentorAcademy from "@clients/mentor-academy/config";
import collective from "@clients/collective/config";
import template from "@clients/_template/config";
import experienceDemo from "@clients/experience-demo/client";
import howToX from "@clients/how-to-x/config";

/**
 * Registry of available clients. Legacy `SiteConfig` and current `ClientConfig`
 * entries may coexist; `resolveClient` normalizes and validates either shape.
 *
 * The `new-client` script appends to this map for you.
 */
const registry: Record<string, SiteConfig | ClientConfig> = {
  template: template,
  "teen-edge": teenEdge,
  "mentor-academy": mentorAcademy,
  collective: collective,
  "experience-demo": experienceDemo,
  "how-to-x": howToX,
};

export const CLIENT_SLUGS = Object.keys(registry);

const DEFAULT_CLIENT = "teen-edge";

/**
 * Which client this build serves. In the one-deploy-per-client model, set
 * NEXT_PUBLIC_CLIENT in the deployment environment and never touch code.
 */
const activeSlug = process.env.NEXT_PUBLIC_CLIENT ?? DEFAULT_CLIENT;

const selected = registry[activeSlug];

if (!selected) {
  console.warn(
    `[whitelabel] Unknown NEXT_PUBLIC_CLIENT "${activeSlug}". Falling back to "${DEFAULT_CLIENT}". ` +
      `Known clients: ${CLIENT_SLUGS.join(", ")}`
  );
}

/**
 * The resolved active client. Validation runs here, so an invalid config fails at
 * module load — during `next build` rather than on a user's request.
 */
export const client: ResolvedClient = resolveClient(selected ?? registry[DEFAULT_CLIENT]);

/** Convenience re-export used widely across sections and components. */
export const activeClient: ClientConfig = client.config;

/** Resolve any registered client by slug (used by tests and tooling). */
export function resolveBySlug(slug: string): ResolvedClient {
  const entry = registry[slug];
  if (!entry) {
    throw new Error(`Unknown client "${slug}". Known: ${CLIENT_SLUGS.join(", ")}`);
  }
  return resolveClient(entry);
}
