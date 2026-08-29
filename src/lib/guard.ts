import { notFound } from "next/navigation";
import { client } from "@/config/active";
import type { CapabilityId } from "@/modules/registry";

/**
 * Route capability guard.
 *
 * App Router routes are static files, so marketplace routes exist in every build.
 * This is what makes them behave correctly for a client that has no marketplace:
 * the route resolves, finds the capability missing, and 404s.
 *
 * This is a *routing* guard, not an authorization boundary. Anything genuinely
 * sensitive must additionally be enforced server-side against the viewer's
 * identity — a capability check says what the product offers, not who may see it.
 */
export function requireCapability(...capabilities: CapabilityId[]): void {
  if (!client.has(...capabilities)) notFound();
}

/** Non-throwing variant for conditional rendering inside a shared page. */
export function hasCapability(...capabilities: CapabilityId[]): boolean {
  return client.has(...capabilities);
}
