import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import type { ExperienceOccurrence } from "@/domain/experience";
import { hostId } from "@/domain/ids";
import { bookingModeLabel, occurrenceDateTime } from "@/lib/format";
import { requireCapability } from "@/lib/guard";

/**
 * The host's schedule.
 *
 * Occurrences are fetched per listing and then flattened, because occurrences
 * belong to a listing, not to the host directly. Filtering to future starts
 * happens at render time against the current clock — which is why this page is
 * force-dynamic rather than statically generated.
 */
export const dynamic = "force-dynamic";

/**
 * Demo stand-in for the signed-in host. A real deployment resolves this from the
 * authenticated viewer via AuthProvider, not from a constant.
 */
const DEMO_HOST_ID = hostId("hst_lamplighter");

export const metadata: Metadata = {
  title: `Upcoming ${client.terms.occurrence({ plural: true, lower: true })} — ${client.config.site.brand.name}`,
};

type Row = { occurrence: ExperienceOccurrence; title: string };

export default async function HostSessionsPage() {
  requireCapability("scheduling.occurrences");

  const repos = getRepositories();
  const experiences = await repos.experiences.listByHost(CURRENT_TENANT, DEMO_HOST_ID);
  const now = Date.now();

  const perExperience = await Promise.all(
    experiences.map(async (experience) => {
      const occurrences = await repos.experiences.listOccurrences(
        CURRENT_TENANT,
        experience.id
      );
      return occurrences.map((occurrence) => ({
        occurrence,
        title: experience.title,
      }));
    })
  );

  const rows: Row[] = perExperience
    .flat()
    .filter(({ occurrence }) => new Date(occurrence.startsAt).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.occurrence.startsAt).getTime() -
        new Date(b.occurrence.startsAt).getTime()
    );

  const occurrence = client.terms.occurrence();
  const occurrencesLower = client.terms.occurrence({ plural: true, lower: true });

  return (
    <Container className="py-12">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-fg sm:text-4xl">
          Upcoming {occurrencesLower}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {rows.length}{" "}
          {rows.length === 1 ? occurrence.toLowerCase() : occurrencesLower} still
          ahead, earliest first.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-theme border border-border bg-surface p-8 text-center text-sm text-muted">
          Nothing scheduled. Add {occurrencesLower} to one of your{" "}
          {client.terms.listing({ plural: true, lower: true })} to appear here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-theme border border-border">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead className="bg-surface">
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  When
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  {client.terms.listing()}
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Booking mode
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Seats
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ occurrence: o, title }) => (
                <tr key={o.id} className="border-b border-border last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/events/${o.id}`}
                      className="font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {occurrenceDateTime(o.startsAt, o.timezone)}
                    </Link>
                    <span className="mt-0.5 block text-xs text-muted">{o.timezone}</span>
                  </td>
                  <td className="px-4 py-3 text-fg">{title}</td>
                  <td className="px-4 py-3 text-muted">
                    {bookingModeLabel(o.bookingMode, client.terms.groupBooking())}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {o.seatsBooked} / {o.capacity}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-theme border border-border px-2 py-0.5 text-xs text-muted">
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
