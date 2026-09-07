import Image from "next/image";
import type { Hero as HeroConfig } from "@/config/types";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";

/** Landing hero. Everything shown is driven by the client's config.sections.hero. */
export function Hero({ hero }: { hero: HeroConfig }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-surface">
      <Container className="grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2">
        <div>
          {hero.eyebrow && (
            <p className="mb-4 inline-block rounded-theme bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {hero.eyebrow}
            </p>
          )}

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-fg sm:text-5xl lg:text-6xl">
            {hero.headline}
          </h1>

          {hero.subheadline && (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {hero.subheadline}
            </p>
          )}

          {(hero.ctaPrimary || hero.ctaSecondary) && (
            <div className="mt-8 flex flex-wrap gap-4">
              {hero.ctaPrimary && <Button link={hero.ctaPrimary} size="lg" />}
              {hero.ctaSecondary && <Button link={hero.ctaSecondary} size="lg" />}
            </div>
          )}

          {hero.highlights && hero.highlights.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {hero.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Media slot: uses the config image when present, otherwise a themed
            placeholder so the layout is complete before assets are added. */}
        <div className="relative aspect-video overflow-hidden rounded-theme border border-border shadow-sm">
          {hero.image ? (
            <Image
              src={hero.image.src}
              alt={hero.image.alt}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/15 via-surface to-accent/15" />
          )}
        </div>
      </Container>
    </section>
  );
}
