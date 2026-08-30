/**
 * Post-sign-in redirect validation.
 *
 * A `?next=` parameter travels through a sign-in link that we send from our own
 * domain, which is exactly what makes it worth attacking: a link that looks like
 * ours and lands on someone else's login page is a credible phishing vector. So
 * only same-origin relative paths survive, and everything else falls back to a
 * safe default rather than being rejected with an error the user has to solve.
 *
 * Defined once because it is needed in three places (the sign-in page, the
 * sign-in route, the callback), and three copies of a security check is three
 * chances for one of them to drift.
 */

/**
 * Returns `raw` when it is a safe same-origin path, otherwise `fallback`.
 *
 * Rejected, and why:
 *   "https://evil.example"  absolute — a different origin
 *   "//evil.example"        protocol-relative; browsers read it as an origin
 *   "\\evil.example"        some parsers normalize backslashes to slashes
 *   "/\evil.example"        same, one character further in
 *   "javascript:…"          not a path at all
 *   ""                      nothing to go to
 */
export function safeRedirectPath(
  raw: string | null | undefined,
  fallback = "/"
): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  // Anything whose second character is a slash-like leaves our origin.
  if (raw.length > 1 && (raw[1] === "/" || raw[1] === "\\")) return fallback;
  if (raw.includes("\\")) return fallback;
  if (raw.includes("\n") || raw.includes("\r")) return fallback;
  return raw;
}
