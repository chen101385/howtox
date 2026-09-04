import { z } from "zod";
import { familyProfileSchema } from "./sign-in-profile";

export const AUTH_FLOW_MODES = ["log-in", "sign-up"] as const;
export type AuthFlowMode = (typeof AUTH_FLOW_MODES)[number];

const email = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
const next = z.string().max(512).optional();

const logInSchema = z
  .object({
    mode: z.literal("log-in"),
    email,
    next,
  })
  .strict();

const emailOnlySignUpSchema = z
  .object({
    mode: z.literal("sign-up"),
    email,
    next,
  })
  .strict();

const familySignUpSchema = z
  .object({
    mode: z.literal("sign-up"),
    email,
    next,
    profile: familyProfileSchema,
  })
  .strict();

export type AuthRequest =
  | z.output<typeof logInSchema>
  | z.output<typeof emailOnlySignUpSchema>
  | z.output<typeof familySignUpSchema>;

/**
 * Profile collection is a client setting, but it only changes sign-up.
 * Returning-user log-in remains email-only for every client.
 */
export function parseAuthRequest(
  input: unknown,
  collectFamilyProfile: boolean
): AuthRequest {
  const mode = z
    .object({ mode: z.enum(AUTH_FLOW_MODES) })
    .passthrough()
    .parse(input).mode;

  if (mode === "log-in") return logInSchema.parse(input);
  return collectFamilyProfile
    ? familySignUpSchema.parse(input)
    : emailOnlySignUpSchema.parse(input);
}
