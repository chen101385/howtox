import type { Metadata } from "next";
import "./globals.css";
import { activeClient } from "@/config/active";
import { themeToCssVars } from "@/theme/theme";

const site = activeClient;

/** SEO/metadata is generated per-client from config. */
export const metadata: Metadata = {
  title: site.seo.title,
  description: site.seo.description,
  openGraph: {
    title: site.seo.title,
    description: site.seo.description,
    images: site.seo.ogImage ? [{ url: site.seo.ogImage.src }] : undefined,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode={site.theme.mode ?? "light"}>
      {/* The client's entire palette + type + radius is injected here as CSS
          variables. Every themed utility (bg-primary, text-fg, rounded-theme)
          resolves against these. Swap the client → swap the whole look. */}
      <body style={themeToCssVars(site.theme)}>{children}</body>
    </html>
  );
}
