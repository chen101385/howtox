import type { Sections } from "@/config/types";
import { Container } from "@/components/Container";
import { Icon } from "@/components/Icon";

/** Service grid. Heading, subheading and every card come from config.sections.services. */
export function Services({
  services,
}: {
  services: NonNullable<Sections["services"]>;
}) {
  return (
    <section id="services" className="bg-bg py-20">
      <Container>
        {(services.heading || services.subheading) && (
          <div className="max-w-2xl">
            {services.heading && (
              <h2 className="font-heading text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                {services.heading}
              </h2>
            )}
            {services.subheading && (
              <p className="mt-4 text-lg leading-relaxed text-muted">
                {services.subheading}
              </p>
            )}
          </div>
        )}

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.items.map((item) => (
            <li
              key={item.title}
              className="rounded-theme border border-border bg-surface p-6"
            >
              <span className="inline-flex rounded-theme bg-primary/10 p-3 text-primary">
                <Icon name={item.icon} />
              </span>

              <h3 className="mt-5 font-heading text-lg font-semibold text-fg">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.description}
              </p>

              {(item.price || item.duration) && (
                <p className="mt-4 flex flex-wrap gap-x-3 text-xs font-medium uppercase tracking-wide text-muted">
                  {item.price && <span>{item.price}</span>}
                  {item.price && item.duration && (
                    <span aria-hidden="true">&middot;</span>
                  )}
                  {item.duration && <span>{item.duration}</span>}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
