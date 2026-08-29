"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingMode } from "@/domain/experience";
import { money, multiply, type Money } from "@/domain/money";
import type { CompensationPolicy } from "@/domain/ledger";
import { bookingModeDescription, bookingModeLabel, occurrenceDateTime } from "@/lib/format";
import { PriceBreakdown, CompensationBreakdown } from "./PriceBreakdown";

/**
 * Booking selection.
 *
 * Server components pass plain, already-serialized view models; this file owns
 * only the interaction. Prices arrive as minor units and stay that way until the
 * final render, so no arithmetic happens on formatted strings.
 */

export type OccurrenceOption = {
  id: string;
  startsAt: string;
  timezone: string;
  bookingMode: BookingMode;
  capacity: number;
  seatsRemaining: number;
  priceMinor: number;
  currency: string;
};

export type BookingPanelProps = {
  experienceSlug: string;
  experienceTitle: string;
  availableModes: BookingMode[];
  occurrences: OccurrenceOption[];
  /** Fallback prices when a mode has no scheduled occurrence. */
  modePricingMinor: Partial<Record<BookingMode, number>>;
  currency: string;
  policy: CompensationPolicy;
  maxCrowdsharedSeats: number;
  terms: { provider: string; customer: string; crowdshared: string };
};

/** Radio-group of booking modes. Keyboard operable, no hover dependency. */
export function BookingModeSelector({
  modes,
  selected,
  onSelect,
  crowdsharedTerm,
}: {
  modes: BookingMode[];
  selected: BookingMode;
  onSelect: (mode: BookingMode) => void;
  crowdsharedTerm: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-fg">How do you want to book?</legend>
      <div className="mt-3 space-y-2" role="radiogroup">
        {modes.map((mode) => {
          const active = mode === selected;
          return (
            <label
              key={mode}
              className={`flex cursor-pointer items-start gap-3 rounded-theme border p-3 transition-colors ${
                active ? "border-primary bg-primary/10" : "border-border hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name="booking-mode"
                value={mode}
                checked={active}
                onChange={() => onSelect(mode)}
                className="mt-1 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block text-sm font-medium text-fg">
                  {bookingModeLabel(mode, crowdsharedTerm)}
                </span>
                <span className="block text-xs leading-relaxed text-muted">
                  {bookingModeDescription(mode, crowdsharedTerm)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Lists scheduled instances for the selected mode. */
export function OccurrenceSelector({
  occurrences,
  selectedId,
  onSelect,
  occurrenceTerm,
}: {
  occurrences: OccurrenceOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  occurrenceTerm: string;
}) {
  if (occurrences.length === 0) {
    return (
      <p className="rounded-theme border border-border bg-surface p-3 text-sm text-muted">
        No scheduled {occurrenceTerm.toLowerCase()}s for this option yet. Try another
        booking type.
      </p>
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-fg">Pick a time</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup">
        {occurrences.map((o) => {
          const active = o.id === selectedId;
          const full = o.seatsRemaining <= 0;
          return (
            <label
              key={o.id}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-theme border p-3 text-sm transition-colors ${
                full
                  ? "cursor-not-allowed border-border opacity-50"
                  : active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-surface"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="occurrence"
                  value={o.id}
                  checked={active}
                  disabled={full}
                  onChange={() => onSelect(o.id)}
                  className="accent-[var(--color-primary)]"
                />
                <span className="text-fg">
                  {occurrenceDateTime(o.startsAt, o.timezone)}
                </span>
              </span>
              <span className="text-xs text-muted">
                {full ? "Sold out" : `${o.seatsRemaining} left`}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Seat count for crowdshared and private-group bookings. */
export function SeatSelector({
  value,
  max,
  onChange,
  label = "Seats",
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(1, n));

  return (
    <div>
      <label htmlFor="seat-count" className="text-sm font-medium text-fg">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= 1}
          aria-label="Decrease seats"
          className="h-9 w-9 rounded-theme border border-border text-fg disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          −
        </button>
        <input
          id="seat-count"
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 1))}
          className="h-9 w-16 rounded-theme border border-border bg-bg text-center text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label="Increase seats"
          className="h-9 w-9 rounded-theme border border-border text-fg disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          +
        </button>
        <span className="text-xs text-muted">max {max}</span>
      </div>
    </div>
  );
}

/* ----------------------------- Composed panel --------------------------- */

export function BookingPanel(props: BookingPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<BookingMode>(props.availableModes[0]);
  const [occurrenceId, setOccurrenceId] = useState<string | undefined>();
  const [seats, setSeats] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeOccurrences = useMemo(
    () => props.occurrences.filter((o) => o.bookingMode === mode),
    [props.occurrences, mode]
  );

  const selected = modeOccurrences.find((o) => o.id === occurrenceId);

  const unitPriceMinor =
    selected?.priceMinor ?? props.modePricingMinor[mode] ?? 0;
  const unitPrice: Money = money(unitPriceMinor, props.currency);

  // One-to-one and private-group are sold as a single unit; only crowdshared
  // multiplies by seats.
  const quantity = mode === "crowdshared" ? seats : 1;
  const total = multiply(unitPrice, quantity);

  const maxSeats =
    mode === "crowdshared"
      ? Math.min(props.maxCrowdsharedSeats, selected?.seatsRemaining ?? 1)
      : 1;

  const canSubmit = unitPriceMinor > 0 && (modeOccurrences.length === 0 || Boolean(selected));

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceSlug: props.experienceSlug,
          bookingMode: mode,
          occurrenceId: selected?.id,
          seatCount: quantity,
        }),
      });
      const data: { bookingCode?: string; error?: string } = await response.json();
      if (!response.ok || !data.bookingCode) {
        throw new Error(data.error ?? "Could not create the booking.");
      }
      router.push(`/bookings/${data.bookingCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 rounded-theme border border-border bg-surface p-6">
      <BookingModeSelector
        modes={props.availableModes}
        selected={mode}
        onSelect={(m) => {
          setMode(m);
          setOccurrenceId(undefined);
          setSeats(1);
        }}
        crowdsharedTerm={props.terms.crowdshared}
      />

      <OccurrenceSelector
        occurrences={modeOccurrences}
        selectedId={occurrenceId}
        onSelect={setOccurrenceId}
        occurrenceTerm="session"
      />

      {mode === "crowdshared" && selected && (
        <SeatSelector value={seats} max={Math.max(1, maxSeats)} onChange={setSeats} />
      )}

      {unitPriceMinor > 0 && (
        <div className="border-t border-border pt-4">
          <PriceBreakdown
            unitPrice={unitPrice}
            quantity={quantity}
            unitLabel={mode === "crowdshared" ? "seat" : "booking"}
            total={total}
          />
        </div>
      )}

      <details className="rounded-theme border border-border">
        <summary className="cursor-pointer px-4 py-2 text-sm text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Where does this money go?
        </summary>
        <div className="p-2">
          <CompensationBreakdown
            guestPrice={total}
            policy={props.policy}
            providerTerm={props.terms.provider}
          />
        </div>
      </details>

      {error && (
        <p role="alert" className="text-sm text-primary">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full rounded-theme bg-primary px-6 py-3 text-base font-semibold text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {submitting ? "Reserving…" : "Continue to checkout"}
      </button>

      <p className="text-center text-xs text-muted">
        Demo checkout — no payment method is collected and no money moves.
      </p>
    </div>
  );
}
