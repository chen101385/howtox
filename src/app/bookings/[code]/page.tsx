import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/Container";
import { CompensationBreakdown } from "@/components/marketplace/PriceBreakdown";
import { RecordingPolicyNotice } from "@/components/marketplace/RecordingPolicyNotice";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { formatMoneyCompact } from "@/domain/money";
import { DEFAULT_COMPENSATION_POLICY } from "@/domain/ledger";
import { bookingModeLabel, occurrenceDateTime } from "@/lib/format";
import { requireCapability } from "@/lib/guard";

/**
 * Booking summary and mock-checkout confirmation.
 *
 * States plainly that no payment was taken. A demo that shows a convincing
 * receipt is worse than useless — someone will believe it.
 */
export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: { code: string } }) {
  requireCapability("commerce.checkout");

  const repos = getRepositories();
  const booking = await repos.bookings.getByCode(CURRENT_TENANT, params.code);
  if (!booking) notFound();

  const experience = await repos.experiences.getById(
    CURRENT_TENANT,
    booking.experienceId
  );
  const occurrence = booking.occurrenceId
    ? await repos.experiences.getOccurrence(CURRENT_TENANT, booking.occurrenceId)
    : null;
  const host = experience
    ? await repos.experiences.getHost(CURRENT_TENANT, experience.hostId)
    : null;

  const entries = await repos.ledger.listForBooking(CURRENT_TENANT, booking.id);
  const policy = client.config.policies.compensation ?? DEFAULT_COMPENSATION_POLICY;
  const recording = client.config.policies.recording;

  return (
    <Container className="max-w-3xl py-12">
      <div className="rounded-theme border border-accent bg-surface p-6">
        <p className="font-heading text-lg font-semibold text-fg">
          You&apos;re booked
        </p>
        <p className="mt-1 text-sm text-muted">
          Booking code{" "}
          <span className="font-mono font-semibold text-fg">{booking.bookingCode}</span>
        </p>
        <p className="mt-3 rounded-theme border border-border bg-bg p-3 text-xs leading-relaxed text-muted">
          <strong className="font-semibold text-fg">Demo checkout.</strong> No payment
          method was collected and no money moved. The ledger entries below are
          simulated to show the compensation model.
        </p>
      </div>

      <section className="mt-8">
        <h1 className="font-heading text-2xl font-bold text-fg">
          {experience?.title ?? "Booking"}
        </h1>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-theme border border-border bg-surface p-4">
            <dt className="text-xs text-muted">When</dt>
            <dd className="mt-1 text-sm text-fg">
              {occurrence
                ? occurrenceDateTime(occurrence.startsAt, occurrence.timezone)
                : "To be scheduled with the host"}
            </dd>
          </div>
          <div className="rounded-theme border border-border bg-surface p-4">
            <dt className="text-xs text-muted">Format</dt>
            <dd className="mt-1 text-sm text-fg">
              {bookingModeLabel(booking.bookingMode, client.terms.groupBooking())} ·{" "}
              {booking.seatCount}{" "}
              {booking.seatCount === 1 ? "seat" : "seats"}
            </dd>
          </div>
          <div className="rounded-theme border border-border bg-surface p-4">
            <dt className="text-xs text-muted">
              {client.terms.provider()}
            </dt>
            <dd className="mt-1 text-sm text-fg">
              {host?.public.displayName ?? "—"}
            </dd>
          </div>
          <div className="rounded-theme border border-border bg-surface p-4">
            <dt className="text-xs text-muted">Total</dt>
            <dd className="mt-1 text-sm font-semibold text-fg">
              {formatMoneyCompact(booking.totalPrice)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/lobby/${booking.bookingCode}`}
          className="rounded-theme bg-primary px-6 py-3 text-sm font-semibold text-primary-fg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Go to the session lobby
        </Link>
        <Link
          href="/bookings"
          className="rounded-theme border border-border px-6 py-3 text-sm font-medium text-fg hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          All my bookings
        </Link>
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <CompensationBreakdown
          guestPrice={booking.totalPrice}
          policy={policy}
          providerTerm={client.terms.provider()}
        />

        {recording && (
          <RecordingPolicyNotice
            watermarkEnabled={recording.watermarkEnabled}
            platformRecordingEnabled={recording.platformRecordingEnabled}
          />
        )}
      </section>

      {entries.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading text-lg font-bold text-fg">Ledger entries</h2>
          <p className="mt-1 text-xs text-muted">
            Recorded as discrete entries rather than a single payout figure, so
            refunds, bonuses and disputes stay reconstructible.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="py-2 pr-4 font-medium">Type</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Memo</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                  <th scope="col" className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-fg">{entry.type.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4 text-muted">{entry.memo}</td>
                    <td className="py-2 pr-4 text-muted">{entry.status}</td>
                    <td className="py-2 text-right text-fg">
                      {formatMoneyCompact(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Container>
  );
}
