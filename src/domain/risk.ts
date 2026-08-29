/**
 * Anti-circumvention text analysis.
 *
 * Purpose: discourage moving repeat transactions off-platform, where neither side
 * has refund protection, dispute support, or compensation guarantees.
 *
 * Design constraints:
 * - Text only. This never inspects, transcribes, or analyses live-session audio.
 * - Findings are SIGNALS, not proof. Ambiguous matches warn; only unambiguous
 *   contact/payment exchange blocks; repetition escalates to human review.
 * - False positives are the expensive failure mode. A guest saying "I'll Venmo my
 *   friend for dinner after" should not be silently blocked, and normal numbers
 *   (prices, times, dates, durations) must never read as phone numbers.
 */

export type RiskFindingKind =
  | "email"
  | "obfuscated_email"
  | "phone"
  | "payment_app"
  | "payment_solicitation"
  | "external_meeting_link"
  | "social_handle";

export type RiskSeverity = "ambiguous" | "clear";

export type RiskFinding = {
  kind: RiskFindingKind;
  severity: RiskSeverity;
  /** Redacted excerpt — never the full raw match, so logs stay privacy-safe. */
  excerpt: string;
};

export type RiskAction = "allow" | "warn" | "block" | "review";

export type RiskAssessment = {
  findings: RiskFinding[];
  severity: "none" | "ambiguous" | "clear";
  action: RiskAction;
  /** Guest/host-facing explanation. Empty when action is "allow". */
  message: string;
};

/* ------------------------------- Helpers -------------------------------- */

/** Redacts the middle of a match so signals can be stored without full contact data. */
function redact(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= 4) return "*".repeat(trimmed.length);
  return `${trimmed.slice(0, 2)}${"*".repeat(Math.min(trimmed.length - 4, 8))}${trimmed.slice(-2)}`;
}

function countDigits(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

/* ------------------------------- Patterns ------------------------------- */

const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi;

/**
 * Obfuscated email: "name at gmail dot com", "name (at) gmail (dot) com".
 * Requires BOTH an at-word and a dot-word so the bare preposition "at" in
 * ordinary prose ("meet at eight") cannot match.
 */
const OBFUSCATED_EMAIL_RE =
  /\b[\w.+-]{2,}\s*(?:\(|\[)?\s*(?:at|@)\s*(?:\)|\])?\s*[\w-]{2,}\s*(?:\(|\[)?\s*(?:dot|\.)\s*(?:\)|\])?\s*(?:com|net|org|io|co|edu|gmail|yahoo)\b/gi;

/**
 * Phone candidate. Deliberately permissive, then filtered by digit count and
 * false-positive guards below.
 */
const PHONE_CANDIDATE_RE =
  /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{2,4}(?:[\s.-]\d{2,4}){1,4}\b/g;

/** Patterns that look phone-ish but are not: ISO dates, times, ranges. */
const DATE_LIKE_RE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
const TIME_LIKE_RE = /^\d{1,2}[:.]\d{2}(?:[:.]\d{2})?$/;

/** Words that make a shorter digit run read as a phone number. */
const PHONE_CONTEXT_RE =
  /\b(?:call|text|phone|cell|mobile|whatsapp|reach me|ring me|my number|number is)\b/i;

const PAYMENT_APP_RE =
  /\b(?:venmo|cash\s?app|cashapp|paypal|zelle|revolut|wise\s+transfer)\b/gi;

/** A literal cashtag is a handle, not a passing mention — always unambiguous. */
const CASHTAG_RE = /\$[a-z][a-z0-9_-]{2,}\b/gi;

/**
 * A payment app named *at another participant* ("venmo me", "paypal you") is a
 * solicitation. A passing mention ("I'll venmo my flatmate later") is not, and
 * blocking it would be a false positive — so only the directed form is `clear`.
 */
const PAYMENT_DIRECTED_RE =
  /\b(?:venmo|cash\s?app|cashapp|paypal|zelle|revolut)\b[^.!?\n]{0,20}?\b(?:me|you|us)\b/i;

/** Explicit solicitation to transact off-platform. */
const PAYMENT_SOLICITATION_RE =
  /\b(?:pay\s+me\s+(?:directly|outside|off|in\s+cash)|pay\s+(?:outside|off)\s+(?:the\s+)?(?:app|platform|site)|book\s+(?:me\s+)?direct(?:ly)?|off\s+(?:the\s+)?(?:app|platform)|cut\s+out\s+the\s+(?:app|platform|middle\s?man)|avoid\s+the\s+(?:fee|fees|platform\s+fee)|next\s+time\s+just\s+(?:message|email|text)\s+me\s+direct(?:ly)?|deal\s+directly)\b/gi;

const EXTERNAL_MEETING_RE =
  /\b(?:zoom\.us|meet\.google\.com|teams\.(?:microsoft|live)\.com|whereby\.com|discord\.gg|calendly\.com|skype\.com)\/?\S*/gi;

/** Social handles — usually benign portfolio sharing, so only ever ambiguous. */
const SOCIAL_HANDLE_RE =
  /(?:\b(?:instagram|ig|twitter|x|tiktok|snap(?:chat)?|telegram|facebook|fb)\b\s*[:.]?\s*@?[a-z0-9._]{3,30}\b|(?:instagram|tiktok|facebook)\.com\/[a-z0-9._]{2,30})/gi;

/* ------------------------------- Detectors ------------------------------ */

function detectPhones(text: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const hasContext = PHONE_CONTEXT_RE.test(text);

  for (const match of text.matchAll(PHONE_CANDIDATE_RE)) {
    const raw = match[0].trim();
    if (DATE_LIKE_RE.test(raw) || TIME_LIKE_RE.test(raw)) continue;
    // Currency immediately before the run means it is a price, not a number.
    const precedingChar = match.index ? text[match.index - 1] : "";
    if (precedingChar === "$" || precedingChar === "£" || precedingChar === "€") continue;

    const digits = countDigits(raw);
    if (digits >= 10 && digits <= 15) {
      findings.push({ kind: "phone", severity: "clear", excerpt: redact(raw) });
    } else if (digits >= 7 && hasContext) {
      findings.push({ kind: "phone", severity: "ambiguous", excerpt: redact(raw) });
    }
  }
  return findings;
}

function collect(
  text: string,
  re: RegExp,
  kind: RiskFindingKind,
  severity: RiskSeverity
): RiskFinding[] {
  return Array.from(text.matchAll(re), (m) => ({
    kind,
    severity,
    excerpt: redact(m[0]),
  }));
}

/* ------------------------------ Assessment ------------------------------ */

/**
 * Analyses a message or listing field. Pure and synchronous — callers decide what
 * to do with the action.
 */
export function assessText(text: string): RiskAssessment {
  if (!text.trim()) {
    return { findings: [], severity: "none", action: "allow", message: "" };
  }

  // A payment app is `clear` only when aimed at a participant, or when the
  // message independently solicits an off-platform payment.
  const solicits = PAYMENT_SOLICITATION_RE.test(text);
  PAYMENT_SOLICITATION_RE.lastIndex = 0;
  const paymentSeverity: RiskSeverity =
    PAYMENT_DIRECTED_RE.test(text) || solicits ? "clear" : "ambiguous";

  const findings: RiskFinding[] = [
    ...collect(text, EMAIL_RE, "email", "clear"),
    ...collect(text, PAYMENT_APP_RE, "payment_app", paymentSeverity),
    ...collect(text, CASHTAG_RE, "payment_app", "clear"),
    ...collect(text, PAYMENT_SOLICITATION_RE, "payment_solicitation", "clear"),
    ...collect(text, EXTERNAL_MEETING_RE, "external_meeting_link", "clear"),
    ...detectPhones(text),
    ...collect(text, SOCIAL_HANDLE_RE, "social_handle", "ambiguous"),
  ];

  // An explicit email match subsumes its obfuscated form; only add the
  // obfuscated finding when no plain email was already detected.
  if (!findings.some((f) => f.kind === "email")) {
    findings.push(
      ...collect(text, OBFUSCATED_EMAIL_RE, "obfuscated_email", "clear")
    );
  }

  if (findings.length === 0) {
    return { findings: [], severity: "none", action: "allow", message: "" };
  }

  const hasClear = findings.some((f) => f.severity === "clear");
  return {
    findings,
    severity: hasClear ? "clear" : "ambiguous",
    action: hasClear ? "block" : "warn",
    message: hasClear
      ? "This message looks like it shares contact or payment details. Keeping bookings and payments on the platform is what preserves refund protection, guaranteed compensation, and dispute support for both sides."
      : "This looks like it might share contact details. You can keep chatting here — on-platform messages are covered by our support and safety tools.",
  };
}

/**
 * Progressive handling across a conversation history.
 *
 * - first clear violation      → block the message
 * - repeated clear violations  → block and flag for manual review
 * - repeated ambiguous signals → escalate from warn to review
 */
export function assessWithHistory(
  text: string,
  priorClearViolations: number,
  priorAmbiguousSignals = 0
): RiskAssessment & { createsRiskSignal: boolean; flagForManualReview: boolean } {
  const base = assessText(text);

  // A clean message is always delivered. Prior history is account state, not a
  // reason to block someone's next sentence — punishing clean messages would
  // make the warning meaningless and the product hostile.
  if (base.severity === "none") {
    return { ...base, createsRiskSignal: false, flagForManualReview: false };
  }

  const isClear = base.severity === "clear";
  const totalClear = priorClearViolations + (isClear ? 1 : 0);
  const totalAmbiguous = priorAmbiguousSignals + (isClear ? 0 : 1);

  // Escalation is driven by *this* message plus history, so review is only ever
  // triggered by an actual finding.
  const flagForManualReview = isClear && totalClear >= 2;
  const createsRiskSignal = flagForManualReview || (!isClear && totalAmbiguous >= 3);

  let action: RiskAction = base.action;
  if (flagForManualReview) action = "review";
  else if (!isClear && totalAmbiguous >= 3) action = "review";

  return {
    ...base,
    action,
    createsRiskSignal,
    flagForManualReview,
    message: flagForManualReview
      ? `${base.message} This account has repeated flags and has been referred for review.`
      : base.message,
  };
}

/**
 * Listing-field scan. Hosts sometimes embed contact details in a description to
 * route guests off-platform; the same detectors apply, but the caller surfaces a
 * publish-time error rather than blocking a message.
 */
export function assessListingText(fields: Record<string, string>): {
  ok: boolean;
  problems: { field: string; assessment: RiskAssessment }[];
} {
  const problems = Object.entries(fields)
    .map(([field, value]) => ({ field, assessment: assessText(value) }))
    .filter((p) => p.assessment.severity === "clear");
  return { ok: problems.length === 0, problems };
}
