import type { Sections } from "@/config/types";
import { Container } from "@/components/Container";

/**
 * FAQ from config.sections.faq. Native details/summary keeps it keyboard
 * operable and expandable with zero client JS.
 */
export function Faq({ faq }: { faq: NonNullable<Sections["faq"]> }) {
  return (
    <section id="faq" className="bg-bg py-20">
      <Container>
        {faq.heading && (
          <h2 className="max-w-2xl font-heading text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {faq.heading}
          </h2>
        )}

        <div className="mt-12 max-w-3xl divide-y divide-border rounded-theme border border-border bg-surface">
          {faq.items.map((item) => (
            <details key={item.question} className="group p-6">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-theme focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <h3 className="font-heading text-base font-semibold text-fg">
                  {item.question}
                </h3>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="mt-0.5 h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  <path d="M11 5h2v14h-2z M5 11h14v2H5z" />
                </svg>
              </summary>

              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
