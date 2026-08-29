import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { userId } from "@/domain/ids";
import { summarizeHostEarnings, type LedgerEntry } from "@/domain/ledger";
import { formatMoneyCompact } from "@/domain/money";
import { requireCapability } from "@/lib/guard";

/**
 * Earnings.
 *
 * Reads the ledger rather than a single payout figure, so every number on this
 * page can be traced to a dated entry with a reason. The explanatory copy is
 * load-bearing, not decoration: a host must be able to see that the guarantee is
 * earned by delivery and that a held amount is waiting on a person, not on an
 * algorithm.
 */
export const dynamic = "force-dynamic";

/**
 * Demo stand-in for the signed-in host. A real deployment resolves this user id
 * from the authenticated viewer via AuthProvider, not from a constant.
 */
const DEMO_HOST_USER_ID = userId("usr_host_lamplighter");

export const metadata: Metadata = {
  title: `Earnings — ${client.config.site.brand.name}`,
};

const ENTRY_TYPE_LABELS: Record<LedgerEntry["type"], string> = {
  guest_charge: "Charge",
  host_guaranteed_compensation: "Guaranteed compensation",
  performance_bonus: "Performance bonus",
  platform_fee: "Platform fee",
  processing_allocation: "Processing allocation",
  tip: "Tip",
  refund: "Refund",
  cancellation_compensation: "Cancellation compensation",
  dispute_hold: "Dispute hold",
  adjustment: "Adjustment",
};

function entryDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function HostEarningsPage() {
  requireCapability("commerce.ledger");

  const repos = getRepositories();
  const entries = await repos.ledger.listForHost(CURRENT_TENANT, DEMO_HOST_USER_ID);
  const currency = client.config.product.currency;
  const summary = summarizeHostEarnings(entries, currency);

  const rows = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const stats = [
    {
      label: "Released",
      value: summary.released,
      note: "Cleared for payout.",
    },
    {
      label: "Pending",
      value: summary.pending,
      note: `Recorded, not yet releasable.`,
    },
    {
      label: "Held",
      value: summary.held,
      note: "Frozen by a dispute, awaiting human review.",
    },
    {
      label: "Tips",
      value: summary.tips,
      note: `100% of every tip reaches you.`,
    },
  ];

  const occurrencesLower = client.terms.occurrence({ plural: true, lower: true });
  const guestsLower = client.terms.customer({ plural: true, lower: true });

  return (
    <Container className="py-12">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-fg sm:text-4xl">Earnings</h1>
        <p className="mt-2 text-sm text-muted">
          Every figure below is the sum of dated ledger entries, each with its own
          reason.
        </p>
      </header>

      <dl className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-theme border border-border bg-surface p-5">
            <dt className="text-sm font-medium text-muted">{stat.label}</dt>
            <dd className="mt-1.5 font-heading text-2xl font-bold text-fg">
              {formatMoneyCompact(stat.value)}
            </dd>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{stat.note}</p>
          </div>
        ))}
      </dl>

      <section className="mb-8 rounded-theme border border-accent bg-surface p-5">
        <h2 className="font-heading text-base font-semibold text-fg">
          How this is calculated
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <li>
            Guaranteed compensation is released for {occurrencesLower} you actually
            delivered. It is <strong className="text-fg">not</strong> reduced by
            ordinary star ratings — a middling review does not touch your base pay.
            Only the optional performance bonus varies, and it is never subtracted
            from the guarantee.
          </li>
          <li>
            Pending amounts have been recorded but are not yet releasable, usually
            because the {client.terms.occurrence({ lower: true })} has not happened
            or feedback from {guestsLower} is still open.
          </li>
          <li>
            Held amounts are frozen by a dispute and are awaiting{" "}
            <strong className="text-fg">human review</strong>. Nothing in this
            system resolves a hold automatically, in either direction.
          </li>
        </ul>
      </section>

      <h2 className="mb-3 font-heading text-lg font-semibold text-fg">All entries</h2>

      {rows.length === 0 ? (
        <p className="rounded-theme border border-border bg-surface p-8 text-center text-sm text-muted">
          No ledger entries yet. Entries appear once a{" "}
          {client.terms.customer({ lower: true })} books one of your{" "}
          {client.terms.listing({ plural: true, lower: true })}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-theme border border-border">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead className="bg-surface">
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Memo
                </th>
                <th scope="col" className="px-4 py-3 font-heading font-semibold text-fg">
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-heading font-semibold text-fg"
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {entryDate(entry.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-fg">
                    {ENTRY_TYPE_LABELS[entry.type]}
                  </td>
                  <td className="px-4 py-3 text-muted">{entry.memo}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-theme border border-border px-2 py-0.5 text-xs text-muted">
                      {entry.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-fg">
                    {formatMoneyCompact(entry.amount)}
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
