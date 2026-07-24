import type { SiteConfig } from "@/config/types";

import teenEdge from "@clients/teen-edge/config";
import mentorAcademy from "@clients/mentor-academy/config";
import collective from "@clients/collective/config";
import template from "@clients/_template/config";

/**
 * Registry of all available clients. Add a line here when you scaffold a new one
 * (the `new-client` script does this for you).
 */
const registry: Record<string, SiteConfig> = {
  _template: template,
  "teen-edge": teenEdge,
  "mentor-academy": mentorAcademy,
  collective: collective,
};

/**
 * Which client this build serves. In the "one deploy per client" model you set
 * NEXT_PUBLIC_CLIENT in the deployment's environment (e.g. Vercel) and never
 * touch code. Falls back to teen-edge for local dev.
 */
const activeSlug = process.env.NEXT_PUBLIC_CLIENT ?? "teen-edge";

export const activeClient: SiteConfig = registry[activeSlug] ?? teenEdge;

if (!registry[activeSlug]) {
  // Surfaced at build/dev time so a typo in the env var is obvious.
  console.warn(
    `[whitelabel] Unknown NEXT_PUBLIC_CLIENT "${activeSlug}". Falling back to "teen-edge". ` +
      `Known clients: ${Object.keys(registry).join(", ")}`
  );
}
