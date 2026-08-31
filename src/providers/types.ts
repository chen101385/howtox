/**
 * Provider interfaces.
 *
 * Everything third-party sits behind one of these. Domain services and UI depend
 * on the interface only — no file outside `src/providers/<vendor>/` may import
 * Stripe, LiveKit, Daily, Zoom, Supabase, or any other vendor SDK.
 *
 * Every method here is implemented by a demo adapter, so the whole application
 * runs with no credentials. Demo adapters are explicitly labeled in the UI; a
 * mock charge must never look like a real one.
 */

import type { Money } from "@/domain/money";
import type { Role } from "@/domain/identity";
import type { NotificationKind } from "@/domain/notifications";
import type { ParticipantRole, ParticipantPermissions } from "@/domain/session";
import type { BookingId, RoomId, TenantId, UserId } from "@/domain/ids";

/** Every provider declares whether it is a credential-free demo implementation. */
export type ProviderMode = "demo" | "live";

export type ProviderInfo = {
  name: string;
  mode: ProviderMode;
  /** Shown in dev banners so mock behavior is never mistaken for real. */
  notice?: string;
};

/* ------------------------------- Auth ----------------------------------- */

/**
 * The authenticated caller, in public/pseudonymous terms only. A Viewer is
 * passed widely through the app and must never become a carrier for legal name,
 * email, phone or payout identity — that data stays in `UserPrivate`.
 */
export type Viewer = {
  userId: UserId;
  displayName: string;
  handle: string;
  roles: Role[];
};

export interface AuthProvider {
  readonly info: ProviderInfo;
  /** Current viewer, or null when signed out. */
  getViewer(): Promise<Viewer | null>;
  /** Demo-only affordance for switching seeded personas. */
  listDemoViewers?(): Promise<Viewer[]>;
  /**
   * Where to send someone who needs to sign in, or null when the adapter has no
   * sign-in surface (the demo adapter never signs anyone out).
   */
  signInPath?(): string | null;
}

/* ----------------------------- Commerce --------------------------------- */

export type ChargeIntent = {
  tenantId: TenantId;
  bookingId: BookingId;
  amount: Money;
  description: string;
};

export type ChargeResult = {
  ok: boolean;
  /** Provider reference. Demo refs are prefixed `demo_` so they are obvious. */
  reference: string;
  mode: ProviderMode;
  message?: string;
};

export type RefundIntent = {
  tenantId: TenantId;
  bookingId: BookingId;
  amount: Money;
  reason: string;
};

/**
 * Note on terminology: this interface intentionally has no "escrow" concept.
 * Holding a balance in a platform account is not legal escrow, and calling it
 * escrow would misrepresent the protection users actually have.
 */
export interface CommerceProvider {
  readonly info: ProviderInfo;
  charge(intent: ChargeIntent): Promise<ChargeResult>;
  refund(intent: RefundIntent): Promise<ChargeResult>;
  /** Records an intended payout to a host. Settlement is out of scope here. */
  scheduleHostCompensation(args: {
    tenantId: TenantId;
    bookingId: BookingId;
    hostUserId: UserId;
    amount: Money;
    kind: "guaranteed" | "bonus" | "tip" | "cancellation";
  }): Promise<ChargeResult>;
}

/* ------------------------------ Sessions -------------------------------- */

export type CreateRoomArgs = {
  tenantId: TenantId;
  occurrenceId?: string;
  bookingId?: BookingId;
  /** Upper bound on concurrent participants. */
  capacity: number;
};

export type RoomHandle = {
  roomId: RoomId;
  mode: ProviderMode;
  /** Join URL or token endpoint. Demo returns an in-app shell route. */
  joinTarget: string;
};

export type ParticipantAccess = {
  /** Opaque access token. Demo tokens are non-functional placeholders. */
  token: string;
  role: ParticipantRole;
  permissions: ParticipantPermissions;
  mode: ProviderMode;
};

export interface SessionProvider {
  readonly info: ProviderInfo;
  createRoom(args: CreateRoomArgs): Promise<RoomHandle>;
  createParticipantAccess(args: {
    roomId: RoomId;
    userId: UserId;
    displayName: string;
    role: ParticipantRole;
  }): Promise<ParticipantAccess>;
  updateParticipantPermissions(args: {
    roomId: RoomId;
    userId: UserId;
    permissions: Partial<ParticipantPermissions>;
  }): Promise<void>;
  muteParticipant(args: { roomId: RoomId; userId: UserId }): Promise<void>;
  removeParticipant(args: { roomId: RoomId; userId: UserId }): Promise<void>;
  /** Prevents a removed participant from rejoining the same room. */
  blockRejoin(args: { roomId: RoomId; userId: UserId }): Promise<void>;
  closeRoom(args: { roomId: RoomId }): Promise<void>;
}

/* ------------------------------- Media ---------------------------------- */

export interface MediaProvider {
  readonly info: ProviderInfo;
  /** Resolves a stored sample reference to a playable URL. */
  resolvePlaybackUrl(ref: string): Promise<string>;
  /** Poster/thumbnail for a sample. */
  resolvePosterUrl(ref: string): Promise<string | undefined>;
}

/* ----------------------------- Messaging -------------------------------- */

export interface MessagingProvider {
  readonly info: ProviderInfo;
  /** Delivers an already-moderated message. Moderation happens in the domain. */
  deliver(args: {
    conversationId: string;
    senderUserId: UserId;
    body: string;
  }): Promise<{ ok: boolean; mode: ProviderMode }>;
}

/* --------------------------- Notifications ------------------------------ */

/**
 * Transactional email (and later SMS or push).
 *
 * Distinct from `MessagingProvider`, which carries user-to-user conversation
 * inside the product. This one reaches a person who is not currently looking at
 * the site — booking confirmations, review requests.
 *
 * PRIVACY: `to.email` is one of the fields `PRIVATE_ONLY_FIELDS` forbids from
 * public views, and this interface is the ONE sanctioned place it leaves the
 * server. Two consequences:
 *
 *   - A recipient address is read through `UserRepository.getContact()`, whose
 *     narrow shape exists so it cannot become a general-purpose PII faucet.
 *   - Never log the address. The demo adapter logs the recipient's *display*
 *     name for exactly this reason.
 *
 * Content is rendered in `src/domain/notifications.ts` before it gets here, so a
 * vendor adapter never decides wording.
 */
export type NotificationRecipient = {
  /** RESTRICTED. Do not log, and do not put in a response body. */
  email: string;
  /** Pseudonymous — safe to log and to put in the message body. */
  displayName: string;
};

export type NotificationRequest = {
  tenantId: TenantId;
  kind: NotificationKind;
  to: NotificationRecipient;
  subject: string;
  text: string;
  /** Booking code or similar, for correlating with support conversations. */
  reference?: string;
};

export type NotificationResult = {
  ok: boolean;
  /** Vendor message id, or a `demo_` reference. */
  reference: string;
  mode: ProviderMode;
  message?: string;
};

export interface NotificationProvider {
  readonly info: ProviderInfo;
  send(request: NotificationRequest): Promise<NotificationResult>;
}

/* ------------------------------ Container ------------------------------- */

export type Providers = {
  auth: AuthProvider;
  commerce: CommerceProvider;
  session: SessionProvider;
  media: MediaProvider;
  messaging: MessagingProvider;
  notifications: NotificationProvider;
};
