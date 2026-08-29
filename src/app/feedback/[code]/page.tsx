import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { ReviewForm } from "@/components/marketplace/Feedback";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { DEFAULT_COMPENSATION_POLICY } from "@/domain/ledger";
import { suggestedResolution } from "@/domain/incident";
import { requireCapability } from "@/lib/guard";

/**
 * Post-session feedback.
 *
 * The note about compensation is shown before the form on purpose: a guest should
 * know that rating honestly will not take money out of the host's pocket, because
 * fear of that is what makes review systems dishonest.
 */
export const dynamic = "force-dynamic";

export default async function FeedbackPage({ params }: { params: { code: string } }) {
  requireCapability("reputation.reviews");

  const repos = getRepositories();
  const booking = await repos.bookings.getByCode(CURRENT_TENANT, params.code);
  if (!booking) notFound();

  const experience = await repos.experiences.getById(
    CURRENT_TENANT,
    booking.experienceId
  );
  const host = experience
    ? await repos.experiences.getHost(CURRENT_TENANT, experience.hostId)
    : null;

  const policy = client.config.policies.compensation ?? DEFAULT_COMPENSATION_POLICY;
  // A normally completed session releases the guarantee and opens feedback.
  const outcome = suggestedResolution("completed");

  return (
    <Container className="max-w-2xl py-12">
      <header>
        <h1 className="font-heading text-3xl font-bold text-fg">How was it?</h1>
        <p className="mt-2 text-muted">
          {experience?.title}
          {host && ` with ${host.public.displayName}`}
        </p>
      </header>

      <div className="mt-6 rounded-theme border border-border bg-surface p-4">
        <p className="text-xs leading-relaxed text-muted">
          <strong className="font-medium text-fg">Rate honestly.</strong>{" "}
          {outcome.rationale} Your rating affects what other people see and whether a
          discretionary bonus is reviewed — it never reduces the{" "}
          {client.terms.provider({ lower: true })}&apos;s guaranteed pay for the time
          they delivered.
        </p>
      </div>

      <div className="mt-8">
        <ReviewForm
          bookingCode={booking.bookingCode}
          currency={client.config.product.currency}
          tipsEnabled={policy.tipsEnabled}
          providerTerm={client.terms.provider()}
        />
      </div>
    </Container>
  );
}
