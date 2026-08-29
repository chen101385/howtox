import type { Sections } from "@/config/types";
import { Container } from "@/components/Container";

/** Social proof grid. Quotes and attribution come from config.sections.testimonials. */
export function Testimonials({
  testimonials,
}: {
  testimonials: NonNullable<Sections["testimonials"]>;
}) {
  return (
    <section id="testimonials" className="bg-bg py-20">
      <Container>
        {testimonials.heading && (
          <h2 className="max-w-2xl font-heading text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {testimonials.heading}
          </h2>
        )}

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.items.map((item) => (
            <li
              key={item.author + item.quote}
              className="flex flex-col rounded-theme border border-border bg-surface p-6"
            >
              <figure className="flex h-full flex-col">
                <blockquote className="flex-1 text-base leading-relaxed text-fg">
                  <p>{item.quote}</p>
                </blockquote>

                <figcaption className="mt-6 border-t border-border pt-4">
                  <h3 className="font-heading text-sm font-semibold text-fg">
                    {item.author}
                  </h3>
                  {item.role && (
                    <p className="mt-0.5 text-sm text-muted">{item.role}</p>
                  )}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
