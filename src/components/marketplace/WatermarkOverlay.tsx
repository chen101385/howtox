"use client";

import { useEffect, useState } from "react";

/**
 * Individualized session watermark.
 *
 * Purpose is attribution, not prevention: if footage leaks, the watermark ties it
 * to a specific booking. It therefore must be visible, must differ per viewer,
 * and must move so a fixed crop cannot reliably remove it.
 *
 * Privacy constraint: the identifier is a PSEUDONYMOUS display name plus a short
 * booking code. Never a legal name, email address or phone number — a leaked
 * frame must not doxx the person who was watching.
 */

const POSITIONS = [
  "left-[8%] top-[12%]",
  "right-[10%] top-[22%]",
  "left-[14%] bottom-[24%]",
  "right-[8%] bottom-[14%]",
  "left-[42%] top-[46%]",
] as const;

export function WatermarkOverlay({
  displayName,
  bookingCode,
  moveIntervalSeconds = 20,
}: {
  /** Pseudonymous display name only. */
  displayName: string;
  /** Short non-sensitive booking code. */
  bookingCode: string;
  moveIntervalSeconds?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % POSITIONS.length),
      Math.max(5, moveIntervalSeconds) * 1000
    );
    return () => window.clearInterval(id);
  }, [moveIntervalSeconds]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      data-testid="watermark-overlay"
    >
      <span
        className={`absolute select-none whitespace-nowrap text-xs font-medium tracking-wide text-fg/25 transition-all duration-1000 ${POSITIONS[index]}`}
        style={{ transform: "rotate(-18deg)" }}
      >
        {displayName} · {bookingCode}
      </span>

      {/* A second, offset mark so cropping one corner does not clear the frame. */}
      <span
        className={`absolute select-none whitespace-nowrap text-xs font-medium tracking-wide text-fg/15 transition-all duration-1000 ${
          POSITIONS[(index + 2) % POSITIONS.length]
        }`}
        style={{ transform: "rotate(-18deg)" }}
      >
        {displayName} · {bookingCode}
      </span>
    </div>
  );
}
