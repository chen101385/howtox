import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import {
  HostPreview,
  HostTrustSummary,
} from "@/components/marketplace/HostPreview";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { hostId } from "@/domain/ids";
import { requireCapability } from "@/lib/guard";

/**
 * Host home.
 *
 * The only thing this surface shows about the signed-in host is their own
 * PUBLIC profile — the same object a guest sees. Private identity (legal
 * surname, email, payout routing) is deliberately unreachable from here: the
 * page never touches `UserPrivate`, so a leak would have to be added on purpose.
 */
export const dynamic = "force-dynamic";

/**
 * Demo stand-in for the signed-in host. A real deployment resolves the viewer's
 * host record from the authenticated session via AuthProvider — never from a
 * module constant like this one.
 */
const DEMO_HOST_ID = hostId("hst_lamplighter");

export const metadata: Metadata = {
  title: `${client.terms.provider()} — ${client.config.site.brand.name}`,
};

export default async function HostHomePage() {
  requireCapability("marketplace.listings");

  const repos = getRepositories();
  const host = await repos.experiences.getHost(CURRENT_TENANT, DEMO_HOST_ID);

  const provider = client.terms.provider();
  const guestLower = client.terms.customer({ lower: true });
  const listingsLower = client.terms.listing({ plural: true, lower: true });
  const occurrencesLower = client.terms.occurrence({ plural: true, lower: true });

  const destinations = [
    {
      href: "/host/experiences",
      label: `Your ${listingsLower}`,
      body: `Edit what you offer, see which ${listingsLower} are published, and how many ${occurrencesLower} are still ahead of you.`,
    },
    {
      href: "/host/sessions",
      label: `Upcoming ${occurrencesLower}`,
      body: `Everything scheduled, in order, with seats booked against capacity.`,
    },
    {
      href: "/host/earnings",
      label: "Earnings",
      body: `What has been released, what is still pending, and anything held for review.`,
    },
  ];

  return (
    <Container className="py-12">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-fg sm:text-4xl">
          {provider} home
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your public presence and the work in front of you.
        </p>
      </header>

      {host ? (
        <section className="mb-10 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 font-heading text-lg font-semibold text-fg">
              Your public profile
            </h2>
            <HostPreview host={host} providerTerm={provider} showBio />
          </div>

          <div className="rounded-theme border border-border bg-surface p-5">
            <h2 className="font-heading text-lg font-semibold text-fg">
              What a {guestLower} sees
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The card beside this is exactly what a {guestLower} sees — nothing is
              added or hidden for you. Your legal surname, email, phone number and
              payout details are never part of a public profile and are never
              rendered on this surface.
            </p>
            <div className="mt-5 border-t border-border pt-5">
              <HostTrustSummary trust={host.trust} />
            </div>
          </div>
        </section>
      ) : (
        <p className="mb-10 rounded-theme border border-border bg-surface p-8 text-sm text-muted">
          No {client.terms.provider({ lower: true })} profile is loaded for this
          demo session.
        </p>
      )}

      <nav aria-label={`${provider} surfaces`}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {destinations.map((d) => (
            <li
              key={d.href}
              className="relative rounded-theme border border-border bg-surface p-5"
            >
              <h2 className="font-heading font-semibold text-fg">
                <Link
                  href={d.href}
                  className="after:absolute after:inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {d.label}
                </Link>
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{d.body}</p>
            </li>
          ))}
        </ul>
      </nav>
    </Container>
  );
}
