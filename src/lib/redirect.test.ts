import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

/**
 * An open redirect on a sign-in flow is a phishing amplifier: the link is
 * genuinely ours, genuinely signs the user in, and then hands them to someone
 * else's page. The rejection cases matter more than the acceptance ones.
 */
describe("safeRedirectPath", () => {
  it("keeps ordinary same-origin paths", () => {
    expect(safeRedirectPath("/discover")).toBe("/discover");
    expect(safeRedirectPath("/experiences/ghost-stories?seats=2")).toBe(
      "/experiences/ghost-stories?seats=2"
    );
    expect(safeRedirectPath("/host/earnings#released")).toBe(
      "/host/earnings#released"
    );
    expect(safeRedirectPath("/")).toBe("/");
  });

  it("rejects anything that leaves the origin", () => {
    const hostile = [
      "https://evil.example",
      "http://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "discover", // relative, resolves against whatever page it lands on
    ];

    for (const value of hostile) {
      expect(safeRedirectPath(value), value).toBe("/");
    }
  });

  it("rejects header-splitting attempts", () => {
    expect(safeRedirectPath("/ok\nLocation: https://evil.example")).toBe("/");
    expect(safeRedirectPath("/ok\r\nSet-Cookie: a=b")).toBe("/");
  });

  it("falls back for empty and absent values", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });

  it("honors an explicit fallback", () => {
    expect(safeRedirectPath("https://evil.example", "/sign-in")).toBe("/sign-in");
  });
});
