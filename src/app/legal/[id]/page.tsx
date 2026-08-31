import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { client } from "@/config/active";
import type { LegalDocumentId } from "@/config/client-config";

/**
 * One legal document, rendered from config.
 *
 * Content comes from `legal.documents` in the client config, so a new client
 * gets routing, the footer links and the index page by supplying text — no page
 * files, no markdown pipeline, no per-client components.
 */
export const dynamic = "force-static";

function documentFor(id: string) {
  return client.config.legal?.documents.find((d) => d.id === id);
}

export function generateStaticParams(): { id: LegalDocumentId }[] {
  return (client.config.legal?.documents ?? []).map((d) => ({ id: d.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const document = documentFor(params.id);
  if (!document) return {};

  return {
    title: `${document.title} — ${client.config.site.brand.name}`,
    description: document.summary,
    // Boilerplate legal text across many whitelabel deployments is exactly what
    // search engines treat as duplicate content, and it has no search value.
    robots: { index: false, follow: true },
  };
}

export default function LegalDocumentPage({ params }: { params: { id: string } }) {
  const document = documentFor(params.id);
  if (!document) notFound();

  const legal = client.config.legal;
  const updated = new Date(document.updatedAt);

  return (
    <Container className="py-12">
      <article className="mx-auto max-w-3xl">
        <nav className="mb-8 text-sm">
          <Link href="/legal" className="text-muted underline underline-offset-4 hover:text-fg">
            All policies
          </Link>
        </nav>

        <h1 className="font-heading text-3xl font-bold leading-tight text-fg sm:text-4xl">
          {document.title}
        </h1>

        <p className="mt-4 text-lg leading-relaxed text-muted">{document.summary}</p>

        <p className="mt-4 text-sm text-muted">
          Last updated{" "}
          <time dateTime={document.updatedAt}>
            {updated.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          {legal?.entityName && <> · {legal.entityName}</>}
        </p>

        {/* Publishing unreviewed boilerplate as though it were reviewed is the
            specific thing this notice prevents. It is deliberately not subtle. */}
        {document.templateOnly && (
          <p
            role="note"
            className="mt-8 rounded-theme border border-border bg-surface p-4 text-sm leading-relaxed text-fg"
          >
            <strong className="font-semibold">Template text, not legal advice.</strong>{" "}
            This document has not been reviewed by a lawyer and is not fit to
            publish as-is. Replace it with reviewed text for your jurisdiction
            before taking real bookings or payments.
          </p>
        )}

        <div className="mt-10 space-y-10">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-heading text-xl font-semibold text-fg">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-4">
                {section.body.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-base leading-relaxed text-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {legal?.contactEmail && (
          <p className="mt-12 border-t border-border pt-6 text-sm text-muted">
            Questions about this document:{" "}
            <a
              href={`mailto:${legal.contactEmail}`}
              className="underline underline-offset-4 hover:text-fg"
            >
              {legal.contactEmail}
            </a>
          </p>
        )}
      </article>
    </Container>
  );
}
