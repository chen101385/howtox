import type { Brand, Contact } from "@/config/types";
import { Container } from "@/components/Container";

export function Footer({ brand, contact }: { brand: Brand; contact?: Contact }) {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="flex flex-col gap-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-lg font-bold text-fg">{brand.name}</p>
          {brand.tagline && <p className="mt-1 text-sm text-muted">{brand.tagline}</p>}
        </div>

        <div className="text-sm text-muted">
          {contact?.email && (
            <p>
              <a href={`mailto:${contact.email}`} className="hover:text-fg">
                {contact.email}
              </a>
            </p>
          )}
          {contact?.phone && <p className="mt-1">{contact.phone}</p>}
          {contact?.socials && contact.socials.length > 0 && (
            <div className="mt-3 flex gap-4">
              {contact.socials.map((s) => (
                <a key={s.href} href={s.href} className="hover:text-fg">
                  {s.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </Container>
      <Container className="border-t border-border py-6">
        <p className="text-xs text-muted">
          © {brand.name}. Built on the whitelabel site template.
        </p>
      </Container>
    </footer>
  );
}
