import type { Brand, Navigation } from "@/config/types";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";

/** Sticky top nav. Brand + links + optional CTA, all from config. */
export function Header({ brand, nav }: { brand: Brand; nav: Navigation }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-heading text-lg font-bold text-fg">
          {brand.name}
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {nav.cta && <Button link={nav.cta} />}
      </Container>
    </header>
  );
}
