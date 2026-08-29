import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { CompensationBreakdown } from "@/components/marketplace/PriceBreakdown";
import { OnPlatformBenefits } from "@/components/marketplace/RiskWarning";
import { client } from "@/config/active";
import { money } from "@/domain/money";
import { DEFAULT_COMPENSATION_POLICY } from "@/domain/ledger";
import { requireCapability } from "@/lib/guard";

/**
 * Host acquisition.
 *
 * Leads with the compensation guarantee because that is the actual pitch: a host
 * deciding between this and arranging sessions privately is weighing whether they
 * get paid when something goes wrong.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Become a host — ${client.config.site.brand.name}`,
  description:
    "Host live, interactive sessions. Guaranteed compensation, cancellation protection, and discovery.",
};

export default function BecomeAHostPage() {
  requireCapability("marketplace.hosts");

  const provider = client.terms.provider();
  const policy = client.config.policies.compensation ?? DEFAULT_COMPENSATION_POLICY;
  // An illustrative price so the split is concrete rather than abstract.
  const examplePrice = money(6000, client.config.product.currency);

  return (
    <Container className="py-12">
      <header className="max-w-3xl">
        <h1 className="font-heading text-4xl font-bold leading-tight text-fg">
          {`Become a ${provider.toLowerCase()}`}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          If you can hold a room for an hour — telling stories, teaching a trick,
          taking song requests, running a game — there are people who want to spend
          an evening with you. You set the format, the schedule and the price.
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="font-heading text-2xl font-bold text-fg">
            You get paid for the time you deliver
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Guaranteed compensation is earned by showing up and running the session
            you advertised. A guest who simply didn&apos;t enjoy it cannot take that
            away. Bonuses are discretionary and sit on top; disputes go to a human,
            not an algorithm.
          </p>
          <div className="mt-6">
            <CompensationBreakdown
              guestPrice={examplePrice}
              policy={policy}
              providerTerm={provider}
              variant="host"
            />
          </div>
        </section>

        <section className="space-y-8">
          <OnPlatformBenefits
            audience="host"
            providerTerm={provider}
            customerTerm={client.terms.customer()}
          />

          <div className="rounded-theme border border-border bg-surface p-5">
            <h3 className="font-heading text-base font-semibold text-fg">
              What we ask
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>Run the session you advertised, live and interactive.</li>
              <li>Keep bookings and payments on the platform.</li>
              <li>Treat guests respectfully and use the moderation tools if needed.</li>
              <li>Don&apos;t record guests, and don&apos;t share their details.</li>
            </ul>
          </div>

          <div className="rounded-theme border border-border bg-surface p-5">
            <h3 className="font-heading text-base font-semibold text-fg">
              Your privacy
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              You appear under a chosen public name — a first name, a nickname, or a
              stage name. Guests never see your legal surname, email address, phone
              number or payout details.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-12 rounded-theme border border-border bg-surface p-8 text-center">
        <p className="font-heading text-lg font-semibold text-fg">
          Applications aren&apos;t open in this demo
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Onboarding, identity verification and payout setup are production
          integrations that aren&apos;t built here. You can still explore the{" "}
          {provider.toLowerCase()} surfaces with seeded data.
        </p>
        <Link
          href="/host"
          className="mt-5 inline-block rounded-theme bg-primary px-6 py-3 text-sm font-semibold text-primary-fg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {`Preview the ${provider.toLowerCase()} dashboard`}
        </Link>
      </div>
    </Container>
  );
}
