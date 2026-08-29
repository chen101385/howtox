import type { Sections } from "@/config/types";
import { Container } from "@/components/Container";

/** About block. Copy, optional portrait and stat row all come from config.sections.about. */
export function About({ about }: { about: NonNullable<Sections["about"]> }) {
  return (
    <section id="about" className="bg-surface py-20">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {about.heading}
          </h2>

          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted">
            {about.body}
          </p>

          {about.stats && about.stats.length > 0 && (
            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
              {about.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-heading text-3xl font-bold text-primary">
                    {stat.value}
                  </dd>
                  <p className="mt-1 text-sm text-muted">{stat.label}</p>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Media slot: uses the config image when present, otherwise a themed
            placeholder so the layout is complete before assets are added. */}
        <div className="relative">
          {about.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={about.image.src}
              alt={about.image.alt}
              className="w-full rounded-theme border border-border object-cover shadow-sm"
            />
          ) : (
            <div className="aspect-[4/3] w-full rounded-theme border border-border bg-gradient-to-br from-accent/15 via-bg to-primary/15" />
          )}
        </div>
      </Container>
    </section>
  );
}
