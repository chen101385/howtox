/**
 * Seeded demo personas for the credential-free demo.
 *
 * These stand in for authenticated users. They are NOT accounts: there is no
 * password, no session, and no authorization behind them. Any real deployment
 * replaces this with an identity provider.
 */

import type { Viewer } from "@/providers/types";
import { userId } from "@/domain/ids";

export const DEMO_VIEWERS: Viewer[] = [
  {
    userId: userId("usr_guest_ada"),
    displayName: "Ada",
    handle: "ada",
    roles: ["guest"],
  },
  {
    userId: userId("usr_host_lamplighter"),
    displayName: "The Lamplighter",
    handle: "the-lamplighter",
    roles: ["host", "guest"],
  },
  {
    userId: userId("usr_ops_rowan"),
    displayName: "Rowan",
    handle: "rowan",
    roles: ["moderator", "admin"],
  },
];

export const DEMO_GUEST = DEMO_VIEWERS[0];
export const DEMO_HOST_VIEWER = DEMO_VIEWERS[1];
export const DEMO_OPS_VIEWER = DEMO_VIEWERS[2];
