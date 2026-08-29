/**
 * Live session lifecycle and operational metadata.
 *
 * The status union distinguishes *who* interrupted a session and *why* it ended,
 * because those distinctions drive compensation and dispute defaults. A boolean
 * `ended` flag could not tell a host no-show from a guest walkout from a network
 * failure — three cases with three different financial outcomes.
 */

import { createStateMachine } from "./state-machine";
import type { BookingId, OccurrenceId, RoomId, TenantId, UserId } from "./ids";

export type SessionStatus =
  | "scheduled"
  | "lobby_open"
  | "live"
  | "completed"
  | "cancelled_by_host"
  | "cancelled_by_guest"
  | "interrupted_by_host"
  | "interrupted_by_guest"
  | "technical_failure"
  | "under_review"
  | "resolved";

export const sessionMachine = createStateMachine<SessionStatus>("session", {
  scheduled: ["lobby_open", "cancelled_by_host", "cancelled_by_guest"],
  lobby_open: ["live", "cancelled_by_host", "cancelled_by_guest", "technical_failure"],
  live: [
    "completed",
    "interrupted_by_host",
    "interrupted_by_guest",
    "technical_failure",
  ],
  completed: ["under_review"],
  interrupted_by_host: ["under_review", "resolved"],
  interrupted_by_guest: ["under_review", "resolved"],
  technical_failure: ["under_review", "resolved"],
  cancelled_by_host: ["under_review", "resolved"],
  cancelled_by_guest: ["under_review", "resolved"],
  under_review: ["resolved"],
  resolved: [],
});

/** Participant roles as understood by the domain (mirrored by SessionProvider). */
export type ParticipantRole =
  | "host"
  | "co_host"
  | "audience"
  | "stage_guest"
  | "moderator";

export type ParticipantPermissions = {
  canPublishAudio: boolean;
  canPublishVideo: boolean;
  canChat: boolean;
  canModerate: boolean;
};

/**
 * Default permissions by role. Crowdshared audiences start without publishing
 * privileges — an audience member cannot broadcast to strangers until the host
 * promotes them to the stage.
 */
export function defaultPermissions(role: ParticipantRole): ParticipantPermissions {
  switch (role) {
    case "host":
    case "co_host":
      return { canPublishAudio: true, canPublishVideo: true, canChat: true, canModerate: true };
    case "moderator":
      return { canPublishAudio: false, canPublishVideo: false, canChat: true, canModerate: true };
    case "stage_guest":
      return { canPublishAudio: true, canPublishVideo: true, canChat: true, canModerate: false };
    case "audience":
      return { canPublishAudio: false, canPublishVideo: false, canChat: true, canModerate: false };
  }
}

export type SessionParticipant = {
  userId: UserId;
  displayName: string;
  role: ParticipantRole;
  permissions: ParticipantPermissions;
  bookingCode?: string;
  joinedAt?: string;
  leftAt?: string;
  removed?: boolean;
  rejoinBlocked?: boolean;
};

/**
 * Non-content operational metadata retained to support dispute review.
 *
 * This is deliberately an event log of ACTIONS (joins, mutes, removals, policy
 * acceptance), not session content. Audio and video are never recorded or
 * transcribed by the platform.
 */
export type SessionEventType =
  | "participant_joined"
  | "participant_left"
  | "participant_muted"
  | "participant_removed"
  | "rejoin_blocked"
  | "chat_disabled"
  | "promoted_to_stage"
  | "returned_to_audience"
  | "policy_accepted"
  | "report_submitted"
  | "contact_sharing_warning"
  | "status_changed";

export type SessionEvent = {
  type: SessionEventType;
  at: string;
  actorUserId?: UserId;
  subjectUserId?: UserId;
  /** Short non-content note, e.g. "muted by host" or a status label. */
  note?: string;
};

export type Session = {
  id: string;
  tenantId: TenantId;
  bookingId?: BookingId;
  occurrenceId?: OccurrenceId;
  roomId?: RoomId;
  status: SessionStatus;
  scheduledStartAt: string;
  lobbyOpensAt: string;
  startedAt?: string;
  endedAt?: string;
  participants: SessionParticipant[];
  /** Append-only operational log. Never session content. */
  events: SessionEvent[];
};

export function transitionSession(
  session: Session,
  to: SessionStatus,
  note?: string
): Session {
  const status = sessionMachine.transition(session.status, to);
  return {
    ...session,
    status,
    events: [
      ...session.events,
      { type: "status_changed", at: new Date().toISOString(), note: note ?? to },
    ],
  };
}

/** Session ended in a way that indicates normal, compensable delivery. */
export function completedNormally(status: SessionStatus): boolean {
  return status === "completed";
}

/** Statuses that should route into the incident/dispute queue rather than pay out. */
export function requiresReview(status: SessionStatus): boolean {
  return (
    status === "interrupted_by_host" ||
    status === "interrupted_by_guest" ||
    status === "technical_failure" ||
    status === "under_review"
  );
}
