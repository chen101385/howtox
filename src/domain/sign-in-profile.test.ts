import { describe, expect, it } from "vitest";
import { familyProfileSchema, MAX_CHILD_AGE } from "./sign-in-profile";

const validProfile = {
  firstName: "Morgan",
  lastName: "Lee",
  childFirstNames: ["zoe", "Ari", "Ben"],
  childAges: [12, 8, 10],
  zipCode: "98101",
};

describe("familyProfileSchema", () => {
  it("sorts children alphabetically while keeping each age paired", () => {
    expect(familyProfileSchema.parse(validProfile)).toEqual({
      firstName: "Morgan",
      lastName: "Lee",
      childFirstNames: ["Ari", "Ben", "zoe"],
      childAges: [8, 10, 12],
      zipCode: "98101",
    });
  });

  it("requires one age for every child name", () => {
    expect(
      familyProfileSchema.safeParse({
        ...validProfile,
        childAges: [12, 8],
      }).success
    ).toBe(false);
  });

  it("accepts ZIP+4 and rejects implausible child ages", () => {
    expect(
      familyProfileSchema.safeParse({
        ...validProfile,
        zipCode: "98101-1234",
      }).success
    ).toBe(true);
    expect(
      familyProfileSchema.safeParse({
        ...validProfile,
        childAges: [MAX_CHILD_AGE + 1, 8, 10],
      }).success
    ).toBe(false);
  });
});
