import type { Sections } from "@/config/types";
import { Container } from "@/components/Container";

/**
 * Closing conversion band. Copy and button come from config.sections.cta.
 * The button is styled inline rather than via <Button> so it inverts cleanly
 * against the primary background whatever `emphasized` says.
 */
export function CtaBand({ cta }: { cta: NonNullable<Sections["cta"]> }) {
  return (
    <section id="cta" className="bg-primary py-20 text-primary-fg">
      <Container className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {cta.heading}
          </h2>
          {cta.subheading && (
            <p className="mt-4 text-lg leading-relaxed opacity-90">
              {cta.subheading}
            </p>
          )}
        </div>

        <a
          href={cta.button.href}
          target={cta.button.external ? "_blank" : undefined}
          rel={cta.button.external ? "noopener noreferrer" : undefined}
          className="inline-flex shrink-0 items-center justify-center rounded-theme bg-bg px-7 py-3.5 text-base font-medium text-fg transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          {cta.button.label}
        </a>
      </Container>
    </section>
  );
}
