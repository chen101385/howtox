import type { Sections } from "@/config/types";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";

/**
 * Pricing tiers from config.sections.pricing. A tier flagged `featured` gets a
 * primary ring and a badge; everything else is identical across clients.
 */
export function Pricing({
  pricing,
}: {
  pricing: NonNullable<Sections["pricing"]>;
}) {
  return (
    <section id="pricing" className="bg-surface py-20">
      <Container>
        {(pricing.heading || pricing.subheading) && (
          <div className="max-w-2xl">
            {pricing.heading && (
              <h2 className="font-heading text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                {pricing.heading}
              </h2>
            )}
            {pricing.subheading && (
              <p className="mt-4 text-lg leading-relaxed text-muted">
                {pricing.subheading}
              </p>
            )}
          </div>
        )}

        <ul className="mt-12 grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pricing.tiers.map((tier) => (
            <li
              key={tier.name}
              className={`flex h-full flex-col rounded-theme border bg-bg p-6 ${
                tier.featured
                  ? "border-primary ring-2 ring-primary"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-heading text-lg font-semibold text-fg">
                  {tier.name}
                </h3>
                {tier.featured && (
                  <span className="rounded-theme bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg">
                    Most popular
                  </span>
                )}
              </div>

              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="font-heading text-4xl font-bold text-fg">
                  {tier.price}
                </span>
                {tier.cadence && (
                  <span className="text-sm text-muted">{tier.cadence}</span>
                )}
              </p>

              {tier.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {tier.description}
                </p>
              )}

              <ul className="mt-6 flex-1 space-y-3 text-sm text-fg">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    >
                      <path d="M9.5 17.2L4.3 12l1.4-1.4 3.8 3.8 8.8-8.8L19.7 7 9.5 17.2z" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.cta && (
                <Button link={tier.cta} className="mt-8 w-full" />
              )}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
