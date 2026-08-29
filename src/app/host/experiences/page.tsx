import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { hostId } from "@/domain/ids";
import { bookingModeLabel, categoryLabel, duration } from "@/lib/format";
import { requireCapability } from "@/lib/guard";

/**
 * The host's own catalogue.
 *
 * Every row links to the public page for the same record, so a host can check
 * what they publish rather than trusting an internal preview. The upcoming count
 * is derived from occurrences rather than stored, because a stale counter on the
 * listing is exactly the kind of thing a host would be misled by.
 */
export const dynamic = "force-dynamic";

/**
 * Demo stand-in for the signed-in host. A real deployment resolves this from the
 * authenticated viewer via AuthProvider, not from a constant.
 */
const DEMO_HOST_ID = hostId("hst_lamplighter");

export const metadata: Metadata = {
  title: `Your ${client.terms.listing({ plural: true, lower: true })} — ${client.config.site.brand.name}`,
};

export default async function HostExperiencesPage() {
  requireCapability("marketplace.listings");

  const repos = getRepositories();
  const experiences = await repos.experiences.listByHost(CURRENT_TENANT, DEMO_HOST_ID);
  const now = Date.now();

  const rows = await Promise.all(
    experiences.map(async (experience) => {
      const occurrences = await repos.experiences.listOccurrences(
        CURRENT_TENANT,
        experience.id
      );
      const upcoming = occurrences.filter(
        (o) => o.status === "scheduled" && new Date(o.startsAt).getTime() > now
      ).length;
      return { experience, upcoming };
    })
  );

  const listing = client.terms.listing();
  const listingsLower = client.terms.listing({ plural: true, lower: true });
  const occurrencesLower = client.terms.occurrence({ plural: true, lower: true });

  return (
    <Container className="py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-fg sm:text-4xl">
            Your {listingsLower}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {rows.length} {rows.length === 1 ? listing.toLowerCase() : listingsLower}
          </p>
        </div>
        <Link
          href="/host/experiences/new"
          className="rounded-theme bg-primary px-4 py-2 text-sm font-medium text-primary-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          New {listing.toLowerCase()}
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-theme border border-border bg-surface p-8 text-center text-sm text-muted">
          You have no {listingsLower} yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-theme border border-border">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead className="bg-surface">
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  {listing}
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Length
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  How guests book
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Upcoming
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ experience, upcoming }) => (
                <tr key={experience.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/experiences/${experience.slug}`}
                      className="font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {experience.title}
                    </Link>
                    <span className="mt-0.5 block text-xs text-muted">
                      {experience.tagline}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {categoryLabel(experience.category)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {duration(experience.durationMinutes)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {experience.bookingModes
                      .map((m) => bookingModeLabel(m, client.terms.groupBooking()))
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-theme border border-border px-2 py-0.5 text-xs text-muted">
                      {experience.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {upcoming} {occurrencesLower}
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
