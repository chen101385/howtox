import { formatMoneyCompact, multiply, type Money } from "@/domain/money";
import { computeBreakdown, type CompensationPolicy } from "@/domain/ledger";

/**
 * Money surfaces.
 *
 * Both components take canonical `Money` and format at the last moment. Neither
 * ever receives a pre-formatted string, so totals stay arithmetic rather than
 * string concatenation.
 */

export function PriceBreakdown({
  unitPrice,
  quantity,
  unitLabel = "seat",
  total,
}: {
  unitPrice: Money;
  quantity: number;
  unitLabel?: string;
  total: Money;
}) {
  const lineTotal = multiply(unitPrice, quantity);

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">
          {formatMoneyCompact(unitPrice)} × {quantity} {unitLabel}
          {quantity === 1 ? "" : "s"}
        </dt>
        <dd className="text-fg">{formatMoneyCompact(lineTotal)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-2 font-semibold">
        <dt className="text-fg">Total</dt>
        <dd className="text-fg">{formatMoneyCompact(total)}</dd>
      </div>
    </dl>
  );
}

/**
 * Shows where the guest's money goes.
 *
 * Published deliberately: the guaranteed share is the host's core protection, and
 * showing it is what makes staying on-platform legible to both sides.
 */
export function CompensationBreakdown({
  guestPrice,
  policy,
  providerTerm = "Host",
  variant = "guest",
}: {
  guestPrice: Money;
  policy: CompensationPolicy;
  providerTerm?: string;
  variant?: "guest" | "host";
}) {
  const b = computeBreakdown(guestPrice, policy);

  const rows: { label: string; value: Money; emphasis?: boolean; note?: string }[] = [
    {
      label: `Guaranteed to the ${providerTerm.toLowerCase()}`,
      value: b.guaranteedHostCompensation,
      emphasis: true,
      note: "Paid for delivering the session. Not affected by star ratings.",
    },
    {
      label: "Potential performance bonus",
      value: b.potentialPerformanceBonus,
      note: "Discretionary and reviewed separately. Never subtracted from the guarantee.",
    },
    { label: "Platform fee", value: b.platformFee },
    { label: "Payment processing", value: b.processingAllocation },
  ];

  return (
    <div className="rounded-theme border border-border bg-surface p-5">
      <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted">
        {variant === "host" ? "What you earn" : "Where your money goes"}
      </h3>

      <dl className="mt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <dt className="text-muted">
            {variant === "host" ? "Guest pays" : "You pay"}
          </dt>
          <dd className="font-semibold text-fg">{formatMoneyCompact(b.guestPrice)}</dd>
        </div>

        {rows.map((row) => (
          <div key={row.label} className="border-t border-border pt-3">
            <div className="flex justify-between text-sm">
              <dt className={row.emphasis ? "font-medium text-fg" : "text-muted"}>
                {row.label}
              </dt>
              <dd className={row.emphasis ? "font-semibold text-fg" : "text-muted"}>
                {formatMoneyCompact(row.value)}
              </dd>
            </div>
            {row.note && <p className="mt-1 text-xs leading-relaxed text-muted">{row.note}</p>}
          </div>
        ))}
      </dl>

      {b.tipsEnabled && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          Tips are optional, and go entirely to the {providerTerm.toLowerCase()}.
        </p>
      )}
    </div>
  );
}
