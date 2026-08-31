import type { Brand, Contact } from "@/config/types";
import type { LegalDocument } from "@/config/client-config";
import { Container } from "@/components/Container";

/**
 * `legal` is passed in rather than read from config here so this stays a pure
 * presentational component — the same reason `Header` takes `viewerMenu`.
 */
export function Footer({
  brand,
  contact,
  legal = [],
}: {
  brand: Brand;
  contact?: Contact;
  legal?: LegalDocument[];
}) {
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            © {brand.name}. Built on the whitelabel site template.
          </p>

          {legal.length > 0 && (
            <nav aria-label="Policies" className="flex flex-wrap gap-x-4 gap-y-2">
              {legal.map((document) => (
                <a
                  key={document.id}
                  href={`/legal/${document.id}`}
                  className="text-xs text-muted underline underline-offset-4 hover:text-fg"
                >
                  {document.title}
                </a>
              ))}
            </nav>
          )}
        </div>
      </Container>
    </footer>
  );
}
