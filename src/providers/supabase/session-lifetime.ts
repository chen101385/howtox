export const SESSION_DURATION_SECONDS = 3 * 60 * 60;
export const SESSION_LIFETIME_COOKIE = "app-session-deadline";

const encoder = new TextEncoder();

export function sessionCookieSecret(): string {
  const secret = process.env.AUTH_PROFILE_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_PROFILE_COOKIE_SECRET must be at least 32 characters to protect auth cookies."
    );
  }
  return secret;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`session-lifetime:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | undefined {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return undefined;
  }
}

export async function createSessionDeadline(
  secret: string,
  now = Date.now()
): Promise<{ value: string; expiresAt: number }> {
  const expiresAt = now + SESSION_DURATION_SECONDS * 1_000;
  const deadline = String(expiresAt);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(deadline)
  );
  return {
    value: `${deadline}.${base64Url(new Uint8Array(signature))}`,
    expiresAt,
  };
}

export async function verifySessionDeadline(
  value: string | undefined,
  secret: string,
  now = Date.now()
): Promise<boolean> {
  if (!value) return false;
  const [deadline, encodedSignature, extra] = value.split(".");
  if (!deadline || !encodedSignature || extra) return false;

  const expiresAt = Number(deadline);
  const signature = fromBase64Url(encodedSignature);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || !signature) {
    return false;
  }

  return crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signature,
    encoder.encode(deadline)
  );
}

