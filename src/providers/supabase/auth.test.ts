import { describe, expect, it } from "vitest";
import { viewerFromUserRow } from "./auth";

/**
 * Role resolution is an authorization boundary. These tests pin the two
 * properties that matter: an unrecognized string never becomes a grant, and a
 * signed-in user is never left with no role at all.
 */
describe("viewerFromUserRow", () => {
  const base = { id: "usr_1", displayName: "Ada", handle: "ada" };

  it("passes through recognized roles", () => {
    const viewer = viewerFromUserRow({ ...base, roles: ["guest", "moderator"] });
    expect(viewer.roles).toEqual(["guest", "moderator"]);
  });

  it("drops values that are not roles", () => {
    // A junk value must never be treated as a grant, whatever put it there.
    const viewer = viewerFromUserRow({
      ...base,
      roles: ["guest", "superadmin", "admin ", "ADMIN", ""],
    });
    expect(viewer.roles).toEqual(["guest"]);
  });

  it("always includes guest, so a signed-in user is never role-less", () => {
    expect(viewerFromUserRow({ ...base, roles: ["host"] }).roles).toEqual([
      "guest",
      "host",
    ]);
    expect(viewerFromUserRow({ ...base, roles: [] }).roles).toEqual(["guest"]);
    expect(viewerFromUserRow({ ...base, roles: null }).roles).toEqual(["guest"]);
    expect(viewerFromUserRow(base).roles).toEqual(["guest"]);
  });

  it("does not duplicate guest when it is already granted", () => {
    const viewer = viewerFromUserRow({ ...base, roles: ["guest", "host"] });
    expect(viewer.roles.filter((r) => r === "guest")).toHaveLength(1);
  });

  it("carries only public identity", () => {
    const viewer = viewerFromUserRow({ ...base, roles: ["guest"] });
    expect(Object.keys(viewer).sort()).toEqual([
      "displayName",
      "handle",
      "roles",
      "userId",
    ]);
  });
});
