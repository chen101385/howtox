import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import {
  incidentMachine,
  REPORT_CATEGORY_LABELS,
  suggestedResolution,
} from "@/domain/incident";
import { incidentId as toIncidentId } from "@/domain/ids";
import { requireCapability } from "@/lib/guard";

/**
 * Incident detail.
 *
 * The transition buttons are rendered from `incidentMachine.nextStates()` and are
 * all disabled: state changes are not implemented in this pass, and a control
 * that looked live would imply an adjudication path that does not exist.
 *
 * The resolution block is only rendered when the session outcome is actually
 * known from the record — for a `technical_failure` report. Guessing a session
 * status to produce a suggestion would manufacture a policy default out of
 * nothing, so every other category omits the block instead.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Incident — ${client.config.site.brand.name}`,
};

function stamp(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-fg">{value}</dd>
    </div>
  );
}

export default async function IncidentDetailPage({
  params,
}: {
  params: { incidentId: string };
}) {
  requireCapability("trust.reporting");

  const repos = getRepositories();
  const incident = await repos.incidents.getById(
    CURRENT_TENANT,
    toIncidentId(params.incidentId)
  );
  if (!incident) notFound();

  const nextStates = incidentMachine.nextStates(incident.status);

  // Only a technical_failure report tells us how the session actually ended.
  const suggestion =
    incident.category === "technical_failure"
      ? suggestedResolution("technical_failure")
      : null;

  return (
    <Container className="py-12">
      <header className="mb-8">
        <p className="text-sm text-muted">
          <Link
            href="/ops/incidents"
            className="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ← Incident queue
          </Link>
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-fg sm:text-4xl">
          {REPORT_CATEGORY_LABELS[incident.category]}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {incident.id} · reported {stamp(incident.createdAt)}
        </p>
      </header>

      <section className="mb-8 rounded-theme border border-border bg-surface p-5">
        <h2 className="font-heading text-lg font-semibold text-fg">Report</h2>
        <p className="mt-1.5 text-xs text-muted">
          The reporter&apos;s own words. An allegation, not a finding.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg">{incident.description}</p>

        <dl className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Status" value={incident.status} />
          <Field label="Severity" value={incident.severity} />
          <Field label="Category" value={REPORT_CATEGORY_LABELS[incident.category]} />
          <Field label="Reported by" value={incident.reporterUserId} />
          <Field label="Reported user" value={incident.reportedUserId ?? "—"} />
          <Field label="Booking" value={incident.bookingId ?? "—"} />
          <Field
            label={`${client.terms.occurrence()} id`}
            value={incident.sessionId ?? "—"}
          />
          <Field label="Created" value={stamp(incident.createdAt)} />
          <Field label="Last updated" value={stamp(incident.updatedAt)} />
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-heading text-lg font-semibold text-fg">Review notes</h2>
        {incident.reviewNotes.length === 0 ? (
          <p className="rounded-theme border border-border bg-surface p-5 text-sm text-muted">
            No reviewer has added a note yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {incident.reviewNotes.map((note) => (
              <li
                key={`${note.at}-${note.note}`}
                className="rounded-theme border border-border bg-surface p-5"
              >
                <p className="text-xs text-muted">{stamp(note.at)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg">{note.note}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {suggestion && (
        <section className="mb-8 rounded-theme border border-accent bg-surface p-5">
          <h2 className="font-heading text-lg font-semibold text-fg">
            Suggested starting point
          </h2>
          <p className="mt-3 text-sm text-fg">
            <span className="font-medium">Default outcome:</span>{" "}
            {suggestion.outcome.replace(/_/g, " ")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {suggestion.rationale}
          </p>
          <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-muted">
            This is a policy <strong className="text-fg">default</strong> for a
            reviewer to accept or override — never an automatic decision. Nothing
            in this system acts on it, and{" "}
            {suggestion.requiresHumanReview
              ? "a human must confirm before any money moves."
              : "a human still confirms the outcome on this surface."}
          </p>
        </section>
      )}

      <section>
        <h2 className="font-heading text-lg font-semibold text-fg">
          Valid next states
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          From <span className="text-fg">{incident.status}</span>. These controls
          are disabled — changing incident state is not implemented in this pass.
        </p>
        {nextStates.length === 0 ? (
          <p className="mt-4 rounded-theme border border-border bg-surface p-5 text-sm text-muted">
            {incident.status} is a terminal state.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            {nextStates.map((state) => (
              <button
                key={state}
                type="button"
                disabled
                className="rounded-theme border border-border bg-surface px-4 py-2 text-sm font-medium text-fg opacity-60"
              >
                Move to {state}
              </button>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}
