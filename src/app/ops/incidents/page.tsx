import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import {
  REPORT_CATEGORY_LABELS,
  type IncidentStatus,
  type RiskSignalKind,
} from "@/domain/incident";
import { requireCapability } from "@/lib/guard";

/**
 * Reviewer queue.
 *
 * Unreviewed reports sort first so the backlog cannot bury them. Nothing on this
 * surface decides anything: every description is the reporter's allegation, and
 * every risk signal is an indicator that prompts a human to look — neither is a
 * finding.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Incident queue — ${client.config.site.brand.name}`,
};

/** Lower sorts first. Unattended states lead; closed states trail. */
const STATUS_ORDER: Record<IncidentStatus, number> = {
  submitted: 0,
  appealed: 1,
  triaged: 2,
  investigating: 3,
  resolved: 4,
  dismissed: 5,
};

const RISK_SIGNAL_LABELS: Record<RiskSignalKind, string> = {
  off_platform_contact: "Off-platform contact",
  off_platform_payment: "Off-platform payment",
  repeat_circumvention: "Repeat circumvention",
  repeated_cancellations: "Repeated cancellations",
  multiple_reports: "Multiple reports",
};

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function IncidentQueuePage() {
  requireCapability("trust.reporting");

  const repos = getRepositories();
  const incidents = await repos.incidents.list(CURRENT_TENANT);
  const signals = await repos.incidents.listRiskSignals(CURRENT_TENANT);

  const queue = [...incidents].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Container className="py-12">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-fg sm:text-4xl">
          Incident queue
        </h1>
        <p className="mt-2 text-sm text-muted">
          {queue.length} {queue.length === 1 ? "report" : "reports"}. Unreviewed
          reports appear first. Descriptions are the reporter&apos;s own words and
          are treated as allegations, never as findings.
        </p>
      </header>

      {queue.length === 0 ? (
        <p className="rounded-theme border border-border bg-surface p-8 text-center text-sm text-muted">
          Nothing in the queue.
        </p>
      ) : (
        <ul className="space-y-3">
          {queue.map((incident) => (
            <li
              key={incident.id}
              className="relative rounded-theme border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <h2 className="font-heading font-semibold text-fg">
                  <Link
                    href={`/ops/incidents/${incident.id}`}
                    className="after:absolute after:inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {REPORT_CATEGORY_LABELS[incident.category]}
                  </Link>
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-theme border border-border px-2 py-0.5 text-muted">
                    severity: {incident.severity}
                  </span>
                  <span
                    className={
                      incident.status === "submitted"
                        ? "rounded-theme bg-accent px-2 py-0.5 font-medium text-accent-fg"
                        : "rounded-theme border border-border px-2 py-0.5 text-muted"
                    }
                  >
                    {incident.status}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {incident.description}
              </p>
              <p className="mt-2 text-xs text-muted">
                {incident.id} · reported {shortDate(incident.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-12">
        <h2 className="font-heading text-2xl font-bold text-fg">Risk signals</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Risk signals are <strong className="text-fg">indicators, not proof of
          misconduct</strong>. A signal means a pattern was detected that is worth
          a human look; on its own it establishes nothing and triggers no penalty,
          no payout change and no account action. Context is redacted by design —
          full message bodies are never surfaced here.
        </p>

        {signals.length === 0 ? (
          <p className="mt-4 rounded-theme border border-border bg-surface p-8 text-center text-sm text-muted">
            No risk signals recorded.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-theme border border-border">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead className="bg-surface">
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                    Signal
                  </th>
                  <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                    Confidence
                  </th>
                  <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                    Observed
                  </th>
                  <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                    Redacted context
                  </th>
                  <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                    Reviewed
                  </th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal) => (
                  <tr key={signal.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 text-fg">
                      {RISK_SIGNAL_LABELS[signal.kind]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {signal.confidence}/100
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {shortDate(signal.observedAt)}
                    </td>
                    <td className="px-4 py-3 text-muted">{signal.context}</td>
                    <td className="px-4 py-3 text-muted">
                      {signal.reviewed ? "Yes" : "Not yet"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Container>
  );
}
