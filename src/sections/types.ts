import type { ReactNode } from "react";
import type { ResolvedClient } from "@/config/resolve";

/**
 * Section renderers are async FUNCTIONS returning nodes, not components.
 *
 * That keeps data fetching inside the section (each one owns its own query) while
 * sidestepping the async-component JSX typing friction in React 18's types: the
 * page awaits the nodes and renders the results.
 *
 * Returning `null` is how a section opts out — e.g. a rail with nothing scheduled
 * disappears instead of rendering an empty shell.
 */
export type SectionContext = {
  client: ResolvedClient;
  options?: Record<string, unknown>;
};

export type SectionRenderer = (ctx: SectionContext) => Promise<ReactNode> | ReactNode;
