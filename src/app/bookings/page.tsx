import Link from "next/link";
import { Container } from "@/components/Container";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { formatMoneyCompact } from "@/domain/money";
import { getProviders } from "@/providers";
import { bookingModeLabel, occurrenceDateTime } from "@/lib/format";
import { requireCapability } from "@/lib/guard";

/**
 * The viewer's bookings.
 *
 * In-memory storage means this list is empty after a server restart — stated
 * plainly in the empty state rather than looking like a bug.
 */
export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  requireCapability("commerce.checkout");

  const viewer = await getProviders().auth.getViewer();
  const repos = getRepositories();
  const bookings = viewer
    ? await repos.bookings.listForGuest(CURRENT_TENANT, viewer.userId)
    : [];

  const rows = await Promise.all(
    bookings.map(async (booking) => {
      const experience = await repos.experiences.getById(
        CURRENT_TENANT,
        booking.experienceId
      );
      const occurrence = booking.occurrenceId
        ? await repos.experiences.getOccurrence(CURRENT_TENANT, booking.occurrenceId)
        : null;
      return { booking, experience, occurrence };
    })
  );

  return (
    <Container className="max-w-4xl py-12">
      <h1 className="font-heading text-3xl font-bold text-fg">Your bookings</h1>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-theme border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            No bookings yet. Bookings in this demo are held in memory and clear when
            the server restarts.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-block rounded-theme bg-primary px-6 py-3 text-sm font-semibold text-primary-fg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Find something to do
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map(({ booking, experience, occurrence }) => (
            <li
              key={booking.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-theme border border-border bg-surface p-5"
            >
              <div className="min-w-0">
                <h2 className="font-heading font-semibold text-fg">
                  {experience?.title ?? "Booking"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {occurrence
                    ? occurrenceDateTime(occurrence.startsAt, occurrence.timezone)
                    : "To be scheduled"}{" "}
                  ·{" "}
                  {bookingModeLabel(booking.bookingMode, client.terms.groupBooking())} ·{" "}
                  {formatMoneyCompact(booking.totalPrice)}
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {booking.bookingCode} · {booking.status}
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/bookings/${booking.bookingCode}`}
                  className="rounded-theme border border-border px-4 py-2 text-sm text-fg hover:bg-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Details
                </Link>
                <Link
                  href={`/lobby/${booking.bookingCode}`}
                  className="rounded-theme bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Lobby
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
