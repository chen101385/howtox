/**
 * Recording policy notice.
 *
 * The wording here is load-bearing and deliberately unglamorous. A browser cannot
 * prevent someone pointing a second device at their screen, so the product must
 * not imply that it can. What the platform actually offers is deterrence
 * (visible policy), attribution (individualized watermark), and enforcement
 * (reporting and account action) — and that is exactly what this says.
 *
 * Copy rules: never claim recording is impossible, blocked, or detected.
 */

export function RecordingPolicyNotice({
  variant = "full",
  watermarkEnabled,
  platformRecordingEnabled,
}: {
  variant?: "full" | "compact";
  watermarkEnabled: boolean;
  platformRecordingEnabled: boolean;
}) {
  if (variant === "compact") {
    return (
      <p className="text-xs leading-relaxed text-muted">
        Recording, screenshots and rebroadcast are not allowed.{" "}
        {watermarkEnabled && "Your session carries an individual watermark. "}
        We can&apos;t make recording technically impossible — we can identify and act
        on it.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="recording-policy-heading"
      className="rounded-theme border border-border bg-surface p-5"
    >
      <h3
        id="recording-policy-heading"
        className="font-heading text-base font-semibold text-fg"
      >
        Recording is not permitted
      </h3>

      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
        <li>
          Recording, screen-capturing, photographing, rebroadcasting or redistributing
          a live session is prohibited.
        </li>
        <li>
          {platformRecordingEnabled
            ? "Any platform recording is clearly indicated before it starts."
            : "There is no recording feature in the session. The platform does not record or transcribe session audio or video."}
        </li>
        {watermarkEnabled && (
          <li>
            Each participant&apos;s view carries an individual watermark showing a
            display name and booking code, so leaked material can be traced back to
            the account it came from.
          </li>
        )}
        <li>
          If you see material recorded from a session, report it. Accounts that
          record or redistribute sessions can be removed.
        </li>
      </ul>

      <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
        <strong className="font-medium text-fg">Being straight with you:</strong> no
        website can stop someone filming their own screen with another device. This
        policy works by making recording clearly prohibited, individually
        attributable, and actionable — not by making it impossible.
      </p>
    </section>
  );
}

/**
 * Explains that a host's promotional sample is public by design, so guests do not
 * confuse it with the private-session rules above.
 */
export function SamplePolicyNote({ listingTerm = "experience" }: { listingTerm?: string }) {
  return (
    <p className="text-xs text-muted">
      This is a promotional sample the host published to showcase their{" "}
      {listingTerm.toLowerCase()}. Samples are public. Live sessions are private and
      covered by the no-recording policy.
    </p>
  );
}
