"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Pre-session lobby.
 *
 * The gate before the room: the guest must actively accept the session policies
 * (recording prohibition and conduct) before joining. Acceptance is an explicit
 * action, not a pre-ticked box — it is recorded as a `policy_accepted` event and
 * is exactly the sort of fact a dispute later turns on.
 */
export function SessionLobby({
  bookingCode,
  experienceTitle,
  hostDisplayName,
  startsAtLabel,
  watermarkEnabled,
  children,
}: {
  bookingCode: string;
  experienceTitle: string;
  hostDisplayName: string;
  startsAtLabel: string;
  watermarkEnabled: boolean;
  /** Policy notice, rendered by the server component. */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [acceptedRecording, setAcceptedRecording] = useState(false);
  const [acceptedConduct, setAcceptedConduct] = useState(false);
  const [joining, setJoining] = useState(false);

  const canJoin = acceptedRecording && acceptedConduct;

  async function join() {
    setJoining(true);
    // Records acceptance before the room opens; failure must not block the guest
    // from joining a session they have paid for.
    try {
      await fetch("/api/sessions/accept-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode }),
      });
    } catch {
      /* demo adapter is in-memory; proceed regardless */
    }
    router.push(`/session/${bookingCode}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm text-muted">You&apos;re about to join</p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-fg">
          {experienceTitle}
        </h1>
        <p className="mt-2 text-sm text-muted">
          with {hostDisplayName} · {startsAtLabel}
        </p>
      </header>

      {children}

      <fieldset className="space-y-3 rounded-theme border border-border bg-surface p-5">
        <legend className="px-1 text-sm font-medium text-fg">
          Before you join
        </legend>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedRecording}
            onChange={(e) => setAcceptedRecording(e.target.checked)}
            className="mt-1 accent-[var(--color-primary)]"
          />
          <span className="text-sm leading-relaxed text-muted">
            I understand that recording, screenshotting, rebroadcasting or
            redistributing this session is not permitted
            {watermarkEnabled && ", and that my view carries an individual watermark"}
            .
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedConduct}
            onChange={(e) => setAcceptedConduct(e.target.checked)}
            className="mt-1 accent-[var(--color-primary)]"
          />
          <span className="text-sm leading-relaxed text-muted">
            I&apos;ll treat everyone in the session respectfully, and I know I can
            report a problem or leave at any time.
          </span>
        </label>
      </fieldset>

      <button
        type="button"
        onClick={join}
        disabled={!canJoin || joining}
        className="w-full rounded-theme bg-primary px-6 py-3 text-base font-semibold text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {joining ? "Joining…" : "Join session"}
      </button>

      {!canJoin && (
        <p className="text-center text-xs text-muted">
          Accept both to continue.
        </p>
      )}
    </div>
  );
}
