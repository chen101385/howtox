/**
 * Demo provider adapters.
 *
 * These exist so the entire application runs with zero credentials. They are
 * deliberately honest about being fake:
 *   - every reference is prefixed `demo_`
 *   - `info.mode` is "demo" and carries a notice the UI surfaces
 *   - no method claims a side effect it did not perform
 *
 * Nothing here moves money, creates a real video room, or verifies an identity.
 */

import { roomId as toRoomId, type RoomId } from "@/domain/ids";
import { defaultPermissions } from "@/domain/session";
import type {
  AuthProvider,
  ChargeIntent,
  ChargeResult,
  CommerceProvider,
  CreateRoomArgs,
  MediaProvider,
  MessagingProvider,
  NotificationProvider,
  NotificationRequest,
  NotificationResult,
  ParticipantAccess,
  Providers,
  ProviderInfo,
  RefundIntent,
  RoomHandle,
  SessionProvider,
  Viewer,
} from "../types";
import { DEMO_VIEWERS } from "@/data/seed/viewers";

const demoInfo = (name: string, notice: string): ProviderInfo => ({
  name,
  mode: "demo",
  notice,
});

let counter = 0;
const demoRef = (prefix: string) => `demo_${prefix}_${(++counter).toString(36)}`;

/** Reset between tests so references are deterministic. */
export function __resetDemoRefs(): void {
  counter = 0;
}

/* -------------------------------- Auth ---------------------------------- */

export class DemoAuthProvider implements AuthProvider {
  readonly info = demoInfo(
    "Demo Auth",
    "Seeded personas only — no real authentication, sessions, or authorization."
  );

  constructor(private readonly viewerId: string = DEMO_VIEWERS[0].userId) {}

  async getViewer(): Promise<Viewer | null> {
    return DEMO_VIEWERS.find((v) => v.userId === this.viewerId) ?? DEMO_VIEWERS[0];
  }

  async listDemoViewers(): Promise<Viewer[]> {
    return [...DEMO_VIEWERS];
  }
}

/* ------------------------------ Commerce -------------------------------- */

export class DemoCommerceProvider implements CommerceProvider {
  readonly info = demoInfo(
    "Demo Commerce",
    "No real payment is processed. No card is charged and no payout is made."
  );

  async charge(intent: ChargeIntent): Promise<ChargeResult> {
    return {
      ok: true,
      reference: demoRef("charge"),
      mode: "demo",
      message: `Simulated charge of ${intent.amount.amountMinor} minor units (${intent.amount.currency}). No funds moved.`,
    };
  }

  async refund(intent: RefundIntent): Promise<ChargeResult> {
    return {
      ok: true,
      reference: demoRef("refund"),
      mode: "demo",
      message: `Simulated refund: ${intent.reason}. No funds moved.`,
    };
  }

  async scheduleHostCompensation(): Promise<ChargeResult> {
    return {
      ok: true,
      reference: demoRef("payout"),
      mode: "demo",
      message: "Recorded in the demo ledger only. No payout was scheduled.",
    };
  }
}

/* ------------------------------ Sessions -------------------------------- */

/**
 * Creates room handles that point at the in-app session shell. There is no real
 * media transport: the shell renders participant UI, moderation controls and the
 * watermark, but never negotiates audio or video.
 */
export class DemoSessionProvider implements SessionProvider {
  readonly info = demoInfo(
    "Demo Sessions",
    "No real audio or video. The session shell demonstrates UI, moderation and watermarking only."
  );

  private readonly blocked = new Map<string, Set<string>>();

  async createRoom(args: CreateRoomArgs): Promise<RoomHandle> {
    const id = toRoomId(demoRef("room"));
    return {
      roomId: id,
      mode: "demo",
      joinTarget: `/session/${encodeURIComponent(id)}`,
    };
  }

  async createParticipantAccess(args: {
    roomId: RoomId;
    displayName: string;
    role: Parameters<SessionProvider["createParticipantAccess"]>[0]["role"];
  }): Promise<ParticipantAccess> {
    return {
      token: demoRef("token"),
      role: args.role,
      permissions: defaultPermissions(args.role),
      mode: "demo",
    };
  }

  async updateParticipantPermissions(): Promise<void> {
    /* no-op: the demo shell holds permission state in the session record */
  }

  async muteParticipant(): Promise<void> {
    /* no-op: recorded as a SessionEvent by the caller */
  }

  async removeParticipant(): Promise<void> {
    /* no-op: recorded as a SessionEvent by the caller */
  }

  async blockRejoin(args: { roomId: RoomId; userId: string }): Promise<void> {
    const set = this.blocked.get(args.roomId) ?? new Set<string>();
    set.add(args.userId);
    this.blocked.set(args.roomId, set);
  }

  isRejoinBlocked(roomId: RoomId, userId: string): boolean {
    return this.blocked.get(roomId)?.has(userId) ?? false;
  }

  async closeRoom(): Promise<void> {
    /* no-op */
  }
}

/* -------------------------------- Media --------------------------------- */

/** Resolves sample refs to local files under /public. No CDN, no remote host. */
export class DemoMediaProvider implements MediaProvider {
  readonly info = demoInfo(
    "Demo Media",
    "Samples are locally generated placeholder assets."
  );

  async resolvePlaybackUrl(ref: string): Promise<string> {
    return ref.startsWith("/") ? ref : `/clients/experience-demo/assets/${ref}`;
  }

  async resolvePosterUrl(ref: string): Promise<string | undefined> {
    return ref.startsWith("/") ? ref : undefined;
  }
}

/* ------------------------------ Messaging ------------------------------- */

export class DemoMessagingProvider implements MessagingProvider {
  readonly info = demoInfo(
    "Demo Messaging",
    "Messages are held in memory for the current process only."
  );

  async deliver(): Promise<{ ok: boolean; mode: "demo" }> {
    return { ok: true, mode: "demo" };
  }
}

/* --------------------------- Notifications ------------------------------ */

export class DemoNotificationProvider implements NotificationProvider {
  readonly info = demoInfo(
    "Demo Notifications",
    "Rendered and logged to the server console. No email is sent."
  );

  /** Kept in memory so tests can assert what would have been sent. */
  private readonly outbox: NotificationRequest[] = [];

  async send(request: NotificationRequest): Promise<NotificationResult> {
    this.outbox.push(request);

    // Logs the DISPLAY name, never the address — an email address is one of the
    // restricted fields, and server logs are the classic place they leak.
    console.info(
      `[notifications] ${request.kind} → ${request.to.displayName} ` +
        `(not delivered): ${request.subject}`
    );

    return {
      ok: true,
      reference: demoRef("notification"),
      mode: "demo",
      message: "Rendered but not delivered — no notification provider configured.",
    };
  }

  /** Demo-only affordance. Returns copies so callers cannot mutate the record. */
  sent(): NotificationRequest[] {
    return this.outbox.map((request) => ({ ...request }));
  }

  clear(): void {
    this.outbox.length = 0;
  }
}

/* ------------------------------ Container ------------------------------- */

export function createDemoProviders(): Providers {
  return {
    auth: new DemoAuthProvider(),
    commerce: new DemoCommerceProvider(),
    session: new DemoSessionProvider(),
    media: new DemoMediaProvider(),
    messaging: new DemoMessagingProvider(),
    notifications: new DemoNotificationProvider(),
  };
}
