import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  familyProfileSchema,
  type FamilyProfile,
} from "@/domain/sign-in-profile";

const COOKIE_NAME = "pending-family-profile";
const MAX_AGE_SECONDS = 60 * 60;

const pendingProfileSchema = z.object({
  email: z.string().email(),
  nonce: z.string().min(32).max(128),
  expiresAt: z.number().int().positive(),
  profile: familyProfileSchema,
});

type PendingProfile = z.output<typeof pendingProfileSchema>;

function encryptionKey(secret: string): Buffer {
  if (secret.length < 32) {
    throw new Error("AUTH_PROFILE_COOKIE_SECRET must be at least 32 characters.");
  }
  return createHash("sha256").update(secret).digest();
}

function cookieSecret(): string {
  const secret = process.env.AUTH_PROFILE_COOKIE_SECRET;
  if (!secret) {
    throw new Error(
      "Family profile collection requires AUTH_PROFILE_COOKIE_SECRET. " +
        "Set a random value of at least 32 characters."
    );
  }
  return secret;
}

/** Encrypts pending PII so it is neither readable nor editable in the browser. */
export function sealPendingProfile(
  pending: PendingProfile,
  secret: string
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(pending), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function openPendingProfile(
  value: string,
  secret: string,
  now = Date.now()
): PendingProfile | undefined {
  try {
    const packed = Buffer.from(value, "base64url");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
      return undefined;
    }

    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const parsed = pendingProfileSchema.safeParse(JSON.parse(plaintext));
    if (!parsed.success || parsed.data.expiresAt < now) return undefined;
    return parsed.data;
  } catch {
    return undefined;
  }
}

export function createPendingProfileNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function storePendingProfile(args: {
  email: string;
  nonce: string;
  profile: FamilyProfile;
}): void {
  const value = sealPendingProfile(
    {
      ...args,
      email: args.email.toLowerCase(),
      expiresAt: Date.now() + MAX_AGE_SECONDS * 1_000,
    },
    cookieSecret()
  );

  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function readPendingProfile(
  email: string,
  nonce: string | null
): FamilyProfile | undefined {
  if (!nonce) return undefined;
  const value = cookies().get(COOKIE_NAME)?.value;
  if (!value) return undefined;

  const pending = openPendingProfile(value, cookieSecret());
  if (
    !pending ||
    pending.nonce !== nonce ||
    pending.email !== email.toLowerCase()
  ) {
    return undefined;
  }
  return pending.profile;
}

export function clearPendingProfile(): void {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: 0,
  });
}
