"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ParticipantRole } from "@/domain/session";
import { WatermarkOverlay } from "./WatermarkOverlay";
import { ReportMenu, EmergencyLeaveButton } from "./ReportMenu";

/**
 * Live-session shell.
 *
 * This renders the session *surface* — participant list, moderation controls,
 * watermark, safety affordances — but carries no media transport. The demo
 * SessionProvider creates no real room, so nothing here should be read as a
 * working video call. The stage area says so explicitly rather than showing a
 * fake video feed.
 */

export type RoomParticipant = {
  userId: string;
  displayName: string;
  role: ParticipantRole;
  canPublish: boolean;
  muted?: boolean;
  removed?: boolean;
};

export function HostModerationControls({
  participants,
  onMute,
  onRemove,
  onBlockRejoin,
  onPromote,
  onDemote,
  onToggleChat,
  chatEnabled,
  customerTerm = "Guest",
}: {
  participants: RoomParticipant[];
  onMute: (userId: string) => void;
  onRemove: (userId: string) => void;
  onBlockRejoin: (userId: string) => void;
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
  onToggleChat: () => void;
  chatEnabled: boolean;
  customerTerm?: string;
}) {
  const audience = participants.filter((p) => p.role !== "host" && !p.removed);

  return (
    <section
      aria-labelledby="moderation-heading"
      className="rounded-theme border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id="moderation-heading" className="font-heading text-sm font-semibold text-fg">
          Moderation
        </h3>
        <button
          type="button"
          onClick={onToggleChat}
          className="rounded-theme border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {chatEnabled ? "Disable chat" : "Enable chat"}
        </button>
      </div>

      {audience.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No other participants yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {audience.map((p) => (
            <li
              key={p.userId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-theme border border-border p-3"
            >
              <span className="text-sm text-fg">
                {p.displayName}
                <span className="ml-2 text-xs text-muted">
                  {p.role === "stage_guest" ? "on stage" : customerTerm.toLowerCase()}
                  {p.muted && " · muted"}
                </span>
              </span>

              <span className="flex flex-wrap gap-1.5">
                <ModButton onClick={() => onMute(p.userId)}>
                  {p.muted ? "Unmute" : "Mute"}
                </ModButton>
                {p.role === "stage_guest" ? (
                  <ModButton onClick={() => onDemote(p.userId)}>
                    Return to audience
                  </ModButton>
                ) : (
                  <ModButton onClick={() => onPromote(p.userId)}>
                    Bring on stage
                  </ModButton>
                )}
                <ModButton onClick={() => onRemove(p.userId)}>Remove</ModButton>
                <ModButton onClick={() => onBlockRejoin(p.userId)}>
                  Block rejoin
                </ModButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ModButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-theme border border-border px-2.5 py-1 text-xs font-medium text-fg transition-colors hover:bg-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

export function SessionRoom({
  bookingCode,
  experienceTitle,
  viewerDisplayName,
  viewerRole,
  participants: initialParticipants,
  watermarkEnabled,
  watermarkMoveIntervalSeconds,
  moderationEnabled = true,
  reportingEnabled = true,
  recordingNotice,
  terms,
}: {
  bookingCode: string;
  experienceTitle: string;
  viewerDisplayName: string;
  viewerRole: ParticipantRole;
  participants: RoomParticipant[];
  watermarkEnabled: boolean;
  watermarkMoveIntervalSeconds: number;
  /** From policies.moderation.hostModerationControls. */
  moderationEnabled?: boolean;
  /** From policies.moderation.reportingEnabled. */
  reportingEnabled?: boolean;
  recordingNotice: React.ReactNode;
  terms: { provider: string; customer: string };
}) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [log, setLog] = useState<string[]>([]);

  const isHost = viewerRole === "host" || viewerRole === "co_host";

  /** Appends to the visible operational log — the same events a real backend records. */
  const record = (note: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()} · ${note}`, ...prev].slice(0, 8));

  const update = (userId: string, patch: Partial<RoomParticipant>) =>
    setParticipants((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, ...patch } : p))
    );

  const nameOf = (userId: string) =>
    participants.find((p) => p.userId === userId)?.displayName ?? "participant";

  /**
   * Ends the session as *delivered*, which releases the host's guaranteed
   * compensation. Leaving early deliberately does NOT call this: an early exit
   * is an ambiguous outcome for a human to review, not an automatic forfeit.
   */
  async function completeSession() {
    try {
      await fetch("/api/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode }),
      });
    } catch {
      /* demo adapter; navigation should not be blocked by this */
    }
    router.push(`/feedback/${bookingCode}`);
  }

  async function submitReport(report: { category: string; description: string }) {
    record(`Report submitted: ${report.category}`);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode, ...report }),
      });
    } catch {
      /* the in-session confirmation is rendered by ReportMenu regardless */
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        {/* Stage. No media transport exists — the shell says so instead of faking one. */}
        <div className="relative aspect-video overflow-hidden rounded-theme border border-border bg-surface">
          {watermarkEnabled && (
            <WatermarkOverlay
              displayName={viewerDisplayName}
              bookingCode={bookingCode}
              moveIntervalSeconds={watermarkMoveIntervalSeconds}
            />
          )}

          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="font-heading text-lg font-semibold text-fg">
              {experienceTitle}
            </p>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Session shell — this demo has no audio or video. A live deployment
              renders the {terms.provider.toLowerCase()}&apos;s stream here through the
              configured session provider.
            </p>
            {watermarkEnabled && (
              <p className="mt-2 text-xs text-muted">
                Your watermark reads{" "}
                <span className="text-fg">
                  {viewerDisplayName} · {bookingCode}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <EmergencyLeaveButton
            onLeave={() => {
              record("You left the session");
              router.push(`/feedback/${bookingCode}`);
            }}
          />
          {isHost && (
            <button
              type="button"
              onClick={() => {
                record("Session ended by host");
                void completeSession();
              }}
              className="rounded-theme bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              End session
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              record("Session completed");
              void completeSession();
            }}
            className="rounded-theme border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Session finished
          </button>
        </div>

        {log.length > 0 && (
          <section
            aria-labelledby="session-log-heading"
            className="rounded-theme border border-border bg-surface p-4"
          >
            <h3 id="session-log-heading" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Session log (operational metadata only)
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {log.map((entry, i) => (
                <li key={`${entry}-${i}`}>{entry}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              Actions are recorded to support dispute review. Session audio and video
              are never recorded or transcribed.
            </p>
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <section
          aria-labelledby="participants-heading"
          className="rounded-theme border border-border bg-surface p-5"
        >
          <h3 id="participants-heading" className="font-heading text-sm font-semibold text-fg">
            In the room ({participants.filter((p) => !p.removed).length})
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            {participants
              .filter((p) => !p.removed)
              .map((p) => (
                <li key={p.userId} className="flex items-center justify-between gap-2">
                  <span className="text-fg">{p.displayName}</span>
                  <span className="text-xs text-muted">
                    {p.role === "host"
                      ? terms.provider
                      : p.role === "stage_guest"
                        ? "on stage"
                        : terms.customer}
                  </span>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Audience members join without publishing rights until the{" "}
            {terms.provider.toLowerCase()} brings them on stage.
          </p>
        </section>

        {isHost && moderationEnabled && (
          <HostModerationControls
            participants={participants}
            chatEnabled={chatEnabled}
            customerTerm={terms.customer}
            onToggleChat={() => {
              setChatEnabled((v) => !v);
              record(chatEnabled ? "Chat disabled" : "Chat enabled");
            }}
            onMute={(id) => {
              const p = participants.find((x) => x.userId === id);
              update(id, { muted: !p?.muted });
              record(`${nameOf(id)} ${p?.muted ? "unmuted" : "muted"} by host`);
            }}
            onRemove={(id) => {
              update(id, { removed: true });
              record(`${nameOf(id)} removed by host`);
            }}
            onBlockRejoin={(id) => {
              update(id, { removed: true });
              record(`${nameOf(id)} blocked from rejoining`);
            }}
            onPromote={(id) => {
              update(id, { role: "stage_guest", canPublish: true });
              record(`${nameOf(id)} promoted to stage`);
            }}
            onDemote={(id) => {
              update(id, { role: "audience", canPublish: false });
              record(`${nameOf(id)} returned to audience`);
            }}
          />
        )}

        {reportingEnabled && (
          <ReportMenu
            onSubmit={(r) =>
              void submitReport({ category: r.category, description: r.description })
            }
          />
        )}

        {recordingNotice}
      </aside>
    </div>
  );
}
