/**
 * Identity — a deliberate split between what the platform knows and what other
 * users can see.
 *
 * `UserPrivate` holds restricted data (legal name, contact details, payout and
 * verification identity). `PublicProfile` is what any other user may see. The two
 * are separate types, and `toPublicProfile()` is the ONLY sanctioned path between
 * them, so a private field cannot reach a view by accident.
 *
 * Rule: never construct a PublicProfile by spreading a UserPrivate.
 */

import type { HostId, TenantId, UserId } from "./ids";

/* --------------------------- Display identity --------------------------- */

/**
 * How a user is shown to others. Pseudonymity is the default: a guest browsing a
 * marketplace should never be required to publish their legal name.
 */
export type DisplayNameStyle =
  | "first_name"
  | "first_name_last_initial"
  | "nickname"
  | "stage_name";

export type DisplayIdentity = {
  /** The rendered public name, e.g. "Marisol", "Dev K.", "The Lamplighter". */
  displayName: string;
  style: DisplayNameStyle;
  /** URL-safe public handle, e.g. "the-lamplighter". */
  handle: string;
  avatar?: { src: string; alt: string };
};

/* ------------------------------ Verification ---------------------------- */

/**
 * Verification is MODELED but not implemented in this pass. `verified` here means
 * "a verification vendor previously returned a pass"; no code path in this
 * codebase can legitimately produce that result, because no vendor is integrated.
 *
 * Seed hosts carry a mix of `verified`, `pending` and `unverified` purely so the
 * UI states are visible. A verified badge in this build attests to nothing.
 */
export type VerificationStatus = "unverified" | "pending" | "verified" | "failed";

export type VerificationState = {
  identity: VerificationStatus;
  /** Set only by a real KYC integration. Absent in demo mode. */
  verifiedAt?: string;
  provider?: string;
};

/* --------------------------------- Roles -------------------------------- */

/**
 * What a user is permitted to do. Stored on the user record — the system of
 * record — and never read from an identity provider's token metadata, which is
 * client-writable in some configurations and would let a guest promote itself.
 *
 * `guest` is the floor: every account has it. `moderator` and `admin` gate the
 * `/ops/*` surfaces and must be granted deliberately, out of band; nothing in
 * the sign-up path can produce them.
 *
 * A runtime array so the Postgres enum can be diff-tested against it.
 */
export const ROLES = ["guest", "host", "moderator", "admin"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/* ------------------------------ Private user ---------------------------- */

/**
 * Restricted. Must never be serialized to a client component, an API response
 * consumed by another user, or a log line.
 */
export type UserPrivate = {
  id: UserId;
  tenantId: TenantId;
  /** Given name; may appear publicly depending on DisplayNameStyle. */
  legalFirstName: string;
  /** RESTRICTED — never public. */
  legalLastName: string;
  /** RESTRICTED — never public. */
  email: string;
  /** RESTRICTED — never public. */
  phone?: string;
  /** RESTRICTED — never public. Payout routing identity held by the PSP. */
  payoutAccountRef?: string;
  /** RESTRICTED — never public. */
  addressLine?: string;
  /** RESTRICTED — never public. */
  governmentIdRef?: string;
  verification: VerificationState;
  display: DisplayIdentity;
  /** Authorization grants. Not restricted, but not published either. */
  roles: Role[];
  createdAt: string;
};

/** Field names that must never appear on a public view model. */
export const PRIVATE_ONLY_FIELDS = [
  "legalLastName",
  "email",
  "phone",
  "payoutAccountRef",
  "addressLine",
  "governmentIdRef",
] as const;

/* ------------------------------ Public views ---------------------------- */

export type PublicProfile = {
  userId: UserId;
  displayName: string;
  handle: string;
  avatar?: { src: string; alt: string };
  /** Whether identity verification passed — a boolean, never the underlying data. */
  identityVerified: boolean;
  memberSince: string;
};

export type HostTrustSummary = {
  identityVerified: boolean;
  sessionsHosted: number;
  /** Rounded to one decimal; absent until enough reviews exist to be meaningful. */
  averageRating?: number;
  reviewCount: number;
  /** Percentage 0–100 of sessions the host started on time. */
  onTimeRate?: number;
  respondsWithin?: string;
};

export type HostProfile = {
  id: HostId;
  userId: UserId;
  tenantId: TenantId;
  public: PublicProfile;
  headline: string;
  bio: string;
  /** Broad region only. Exact location is never published, even for in-person. */
  approximateRegion?: string;
  languages: string[];
  trust: HostTrustSummary;
  categories: string[];
};

/* ------------------------------ Serializer ------------------------------ */

/**
 * The single sanctioned private → public conversion. Explicitly enumerates every
 * public field rather than spreading, so adding a private field to `UserPrivate`
 * can never silently widen what is published.
 */
export function toPublicProfile(user: UserPrivate): PublicProfile {
  return {
    userId: user.id,
    displayName: user.display.displayName,
    handle: user.display.handle,
    avatar: user.display.avatar,
    identityVerified: user.verification.identity === "verified",
    memberSince: user.createdAt,
  };
}

/**
 * Derives a display name from a private user for a given style. Kept beside the
 * serializer so the "last initial" rule has exactly one implementation.
 */
export function deriveDisplayName(
  user: Pick<UserPrivate, "legalFirstName" | "legalLastName">,
  style: DisplayNameStyle,
  explicit?: string
): string {
  switch (style) {
    case "first_name":
      return user.legalFirstName;
    case "first_name_last_initial": {
      const initial = user.legalLastName.trim().charAt(0);
      return initial ? `${user.legalFirstName} ${initial}.` : user.legalFirstName;
    }
    case "nickname":
    case "stage_name":
      if (!explicit) {
        throw new Error(`Display style "${style}" requires an explicit name`);
      }
      return explicit;
  }
}

/**
 * Defence-in-depth assertion used by tests and by the serialization boundary:
 * throws if a supposedly public object carries a restricted field.
 */
export function assertNoPrivateFields(value: object, context = "public payload"): void {
  const leaked = PRIVATE_ONLY_FIELDS.filter((f) => f in value);
  if (leaked.length > 0) {
    throw new Error(
      `Private field(s) [${leaked.join(", ")}] leaked into ${context}. ` +
        `Build public views via toPublicProfile() instead of spreading UserPrivate.`
    );
  }
}
