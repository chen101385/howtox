import type { Metadata } from "next";
import "./globals.css";
import { client } from "@/config/active";
import { themeToCssVars } from "@/theme/theme";
import { Header } from "@/sections/Header";
import { Footer } from "@/sections/Footer";
import { DemoModeBanner } from "@/components/marketplace/DemoModeBanner";
import { isDemoMode } from "@/providers";

const site = client.config.site;

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

/**
 * The shell every page shares. Nav comes from the resolved client, so module
 * contributions (Discover, Become a Host) appear only when the enabling modules
 * and capabilities are present.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Only marketplace clients have third-party integrations worth disclosing.
  const mocked = client.has("commerce.checkout")
    ? ["Payments", "live video", "identity verification", "storage"]
    : [];

  return (
    <html lang="en" data-mode={site.theme.mode ?? "light"}>
      {/* The client's palette, type and radius are injected as CSS variables.
          Every themed utility resolves against these — swap the client, swap the
          entire look, with no CSS changes. */}
      <body style={themeToCssVars(site.theme)}>
        {isDemoMode() && <DemoModeBanner mocked={mocked} />}
        <Header brand={site.brand} nav={client.nav} />
        <main>{children}</main>
        <Footer brand={site.brand} contact={site.contact} />
      </body>
    </html>
  );
}
