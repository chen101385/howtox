import { activeClient } from "@/config/active";
import { Header } from "@/sections/Header";
import { Hero } from "@/sections/Hero";
import { Footer } from "@/sections/Footer";

/**
 * Home page. Assembles the site from the active client's config.
 *
 * Phase 1 renders Header + Hero + Footer. Subsequent phases drop in
 * Services, About, Testimonials, Pricing, FAQ, CTA and the booking embed —
 * each guarded by `config.sections.*` / `config.modules.*` so it only appears
 * when that client has configured it.
 */
export default function Home() {
  const { brand, nav, sections, contact } = activeClient;

  return (
    <>
      <Header brand={brand} nav={nav} />
      <main>
        <Hero hero={sections.hero} />
        {/* Next phases mount here:
            {sections.services && <Services ... />}
            {sections.about && <About ... />}
            {sections.testimonials && <Testimonials ... />}
            {sections.pricing && <Pricing ... />}
            {sections.faq && <Faq ... />}
            {modules?.booking?.enabled && <Booking ... />}
            {sections.cta && <CtaBand ... />}
        */}
      </main>
      <Footer brand={brand} contact={contact} />
    </>
  );
}
