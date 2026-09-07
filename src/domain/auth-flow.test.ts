import { describe, expect, it } from "vitest";
import { parseAuthRequest } from "./auth-flow";

const profile = {
  firstName: "Chris",
  lastName: "Chen",
  childFirstNames: ["Zoe", "Ari"],
  childAges: [12, 8],
  zipCode: "94105",
};

describe("parseAuthRequest", () => {
  it("keeps log-in email-only even when the client collects family profiles", () => {
    expect(
      parseAuthRequest(
        { mode: "log-in", email: " Parent@Example.com " },
        true
      )
    ).toEqual({
      mode: "log-in",
      email: "parent@example.com",
    });

    expect(() =>
      parseAuthRequest(
        { mode: "log-in", email: "parent@example.com", profile },
        true
      )
    ).toThrow();
  });

  it("requires and normalizes the family profile on sign-up", () => {
    expect(() =>
      parseAuthRequest({ mode: "sign-up", email: "parent@example.com" }, true)
    ).toThrow();

    expect(
      parseAuthRequest(
        { mode: "sign-up", email: "parent@example.com", profile },
        true
      )
    ).toMatchObject({
      mode: "sign-up",
      profile: {
        childFirstNames: ["Ari", "Zoe"],
        childAges: [8, 12],
      },
    });
  });
});
