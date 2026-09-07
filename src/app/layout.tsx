import type { Metadata } from "next";
import "./globals.css";
import { client } from "@/config/active";
import { themeToCssVars } from "@/theme/theme";
import { Header } from "@/sections/Header";
import { Footer } from "@/sections/Footer";
import { DemoModeBanner } from "@/components/marketplace/DemoModeBanner";
import { loadViewerMenu } from "@/components/auth/ViewerMenu";
import { mockedProviders } from "@/providers";

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
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Only marketplace clients have third-party integrations worth disclosing —
  // a brochure site has nothing simulated to warn about. Which ones are still
  // mocks comes from the providers themselves, so the banner stays accurate as
  // real adapters land one at a time.
  const mocked = client.has("commerce.checkout") ? mockedProviders() : [];
  const viewerMenu = await loadViewerMenu();

  return (
    <html lang="en" data-mode={site.theme.mode ?? "light"}>
      {/* The client's palette, type and radius are injected as CSS variables.
          Every themed utility resolves against these — swap the client, swap the
          entire look, with no CSS changes. */}
      <body style={themeToCssVars(site.theme)}>
        <DemoModeBanner mocked={mocked} />
        <Header
          brand={site.brand}
          nav={client.nav}
          viewerMenu={viewerMenu.menu}
          viewerSignedIn={viewerMenu.signedIn}
        />
        <main>{children}</main>
        <Footer
          brand={site.brand}
          contact={site.contact}
          legal={client.config.legal?.documents}
        />
      </body>
    </html>
  );
}
