import type { RiskAssessment } from "@/domain/risk";

/**
 * Surfaces an anti-circumvention assessment to the sender.
 *
 * Tone matters: a warned user is usually not a bad actor, so the copy explains
 * what protection they would lose rather than accusing them of anything. Only
 * `block`/`review` states actually stop the message.
 */
export function RiskWarning({
  assessment,
  providerTerm = "host",
}: {
  assessment: Pick<RiskAssessment, "action" | "message" | "severity">;
  providerTerm?: string;
}) {
  if (assessment.action === "allow") return null;

  const blocking = assessment.action === "block" || assessment.action === "review";

  return (
    <div
      role={blocking ? "alert" : "status"}
      className={`rounded-theme border p-4 ${
        blocking ? "border-primary bg-primary/10" : "border-border bg-surface"
      }`}
    >
      <p className="text-sm font-medium text-fg">
        {blocking ? "This message wasn't sent" : "Heads up"}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{assessment.message}</p>

      {blocking && (
        <ul className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
          <li>• Bookings made here are covered by refund protection and support.</li>
          <li>
            • {providerTerm[0].toUpperCase() + providerTerm.slice(1)}s are paid a
            guaranteed rate and are protected if a guest cancels late.
          </li>
          <li>• Off-platform arrangements have none of that for either side.</li>
        </ul>
      )}
    </div>
  );
}

/**
 * Why staying on-platform is worth it. Shown on host onboarding and in messaging,
 * because enforcement alone does not change behavior — incentives do.
 */
export function OnPlatformBenefits({
  audience,
  providerTerm = "Host",
  customerTerm = "Guest",
}: {
  audience: "host" | "guest";
  providerTerm?: string;
  customerTerm?: string;
}) {
  const hostBenefits = [
    "Guaranteed compensation for every session you deliver",
    "Compensation if a guest cancels late",
    "Discovery — guests find you without you advertising",
    "Reputation and reviews that carry across bookings",
    "Tips, paid out in full",
    "Scheduling, seat inventory and reminders handled",
    "Individual session watermarking",
    "Dispute support when something goes wrong",
    "Repeat-customer tools, with fees that fall as a relationship continues",
  ];

  const guestBenefits = [
    "Refund protection when a session isn't delivered",
    "Pseudonymity — your legal name is never shown to a host",
    `${providerTerm} reputation you can actually check`,
    "Reporting and moderation during a live session",
    "Booking history in one place",
    "One-tap rebooking with hosts you liked",
    "A support path if something goes wrong",
  ];

  const items = audience === "host" ? hostBenefits : guestBenefits;

  return (
    <div>
      <h3 className="font-heading text-base font-semibold text-fg">
        What you get by booking here
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
            <span aria-hidden="true" className="text-accent">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        {audience === "host"
          ? `Fees decline for repeat bookings with the same ${customerTerm.toLowerCase()}. Final marketplace economics are not set.`
          : "None of these protections apply to arrangements made off-platform."}
      </p>
    </div>
  );
}
