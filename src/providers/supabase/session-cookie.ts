import { cookies } from "next/headers";
import {
  createSessionDeadline,
  SESSION_DURATION_SECONDS,
  SESSION_LIFETIME_COOKIE,
  sessionCookieSecret,
} from "./session-lifetime";

/** Starts the fixed, non-sliding three-hour application session window. */
export async function startSessionLifetime(now = Date.now()): Promise<void> {
  const deadline = await createSessionDeadline(sessionCookieSecret(), now);
  cookies().set(SESSION_LIFETIME_COOKIE, deadline.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
    expires: new Date(deadline.expiresAt),
  });
}

export function clearSessionLifetime(): void {
  cookies().set(SESSION_LIFETIME_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
