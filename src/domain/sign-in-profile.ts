import { z } from "zod";

/**
 * How to X serves families with young people. Twenty-five accommodates older
 * dependants while rejecting obvious data-entry mistakes such as birth years.
 */
export const MAX_CHILD_AGE = 25;

const requiredName = z.string().trim().min(1).max(100);

export const familyProfileSchema = z
  .object({
    firstName: requiredName,
    lastName: requiredName,
    childFirstNames: z.array(requiredName).min(1).max(20),
    childAges: z.array(z.number().int().positive().max(MAX_CHILD_AGE)).min(1).max(20),
    zipCode: z
      .string()
      .trim()
      .regex(/^\d{5}(?:-\d{4})?$/, "Enter a US ZIP code or ZIP+4."),
  })
  .superRefine((profile, context) => {
    if (profile.childFirstNames.length !== profile.childAges.length) {
      context.addIssue({
        code: "custom",
        path: ["childAges"],
        message: "Each child must have one corresponding age.",
      });
    }
  })
  .transform((profile) => {
    const children = profile.childFirstNames
      .map((firstName, index) => {
        const age = profile.childAges[index];
        if (age === undefined) {
          throw new Error("Validated child names and ages became misaligned.");
        }
        return { firstName, age };
      })
      .sort(
        (left, right) =>
          left.firstName.localeCompare(right.firstName, "en", {
            sensitivity: "base",
          }) || left.firstName.localeCompare(right.firstName, "en")
      );

    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      childFirstNames: children.map((child) => child.firstName),
      childAges: children.map((child) => child.age),
      zipCode: profile.zipCode,
    };
  });

export type FamilyProfile = z.output<typeof familyProfileSchema>;
