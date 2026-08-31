import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { client } from "@/config/active";

/**
 * Policy index.
 *
 * 404s for a client that defines no documents, rather than rendering an empty
 * page that reads as "this company has no policies".
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `Policies — ${client.config.site.brand.name}`,
  description: "Terms, privacy, cancellation and conduct policies.",
  robots: { index: false, follow: true },
};

export default function LegalIndexPage() {
  const documents = client.config.legal?.documents ?? [];
  if (documents.length === 0) notFound();

  const unreviewed = documents.filter((d) => d.templateOnly).length;

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-fg sm:text-4xl">Policies</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          {`How ${client.config.site.brand.name} works, what we do with your data, and what happens when something goes wrong.`}
        </p>

        {unreviewed > 0 && (
          <p
            role="note"
            className="mt-8 rounded-theme border border-border bg-surface p-4 text-sm leading-relaxed text-fg"
          >
            <strong className="font-semibold">
              {unreviewed === documents.length
                ? "These are template documents."
                : `${unreviewed} of these documents are template text.`}
            </strong>{" "}
            They have not been through legal review and are not fit to publish
            as-is.
          </p>
        )}

        <ul className="mt-10 divide-y divide-border border-y border-border">
          {documents.map((document) => (
            <li key={document.id}>
              <Link
                href={`/legal/${document.id}`}
                className="group flex flex-col gap-1 py-5 transition-colors"
              >
                <span className="font-heading text-lg font-semibold text-fg group-hover:text-primary">
                  {document.title}
                </span>
                <span className="text-sm leading-relaxed text-muted">
                  {document.summary}
                </span>
                <span className="text-xs text-muted">
                  Updated{" "}
                  <time dateTime={document.updatedAt}>
                    {new Date(document.updatedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
