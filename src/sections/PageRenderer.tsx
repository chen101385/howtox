import { Fragment } from "react";
import type { PageComposition } from "@/config/client-config";
import type { ResolvedClient } from "@/config/resolve";
import { getSectionRenderer } from "./registry";

/**
 * Renders a page from its configured composition.
 *
 * Replaces the previously hardcoded homepage assembly: the page no longer knows
 * which sections exist, only that the client listed some. Unknown ids warn in
 * development and are skipped rather than crashing a live site over a typo.
 */
export async function PageRenderer({
  composition,
  client,
}: {
  composition: PageComposition;
  client: ResolvedClient;
}) {
  const nodes = await Promise.all(
    composition.sections.map(async (section) => {
      const renderer = getSectionRenderer(section.id);

      if (!renderer) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[whitelabel] Unknown section "${section.id}" in client "${client.slug}". ` +
              `Register it in src/sections/registry.tsx or remove it from the page composition.`
          );
        }
        return null;
      }

      return renderer({ client, options: section.options });
    })
  );

  return (
    <>
      {nodes.map((node, index) =>
        node ? (
          <Fragment key={`${composition.sections[index].id}-${index}`}>{node}</Fragment>
        ) : null
      )}
    </>
  );
}
