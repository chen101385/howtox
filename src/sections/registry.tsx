import { Hero } from "./Hero";
import { Services } from "./marketing/Services";
import { About } from "./marketing/About";
import { Testimonials } from "./marketing/Testimonials";
import { Pricing } from "./marketing/Pricing";
import { Faq } from "./marketing/Faq";
import { CtaBand } from "./marketing/CtaBand";
import { BookingEmbed } from "./marketing/BookingEmbed";
import * as marketplace from "./marketplace/sections";
import type { SectionContext, SectionRenderer } from "./types";

/**
 * Section registry.
 *
 * Page composition is data (`pages.home.sections` in client config); this maps
 * those ids to renderers. Adding a section means registering it here and naming
 * it in a client's composition — no page file changes.
 *
 * Marketing sections read `site.sections.*` and return null when that content is
 * absent, so a composition may safely list a section the client did not fill in.
 */

const marketingSections: Record<string, SectionRenderer> = {
  hero: ({ client }: SectionContext) => {
    const hero = client.config.site.sections?.hero;
    return hero ? <Hero hero={hero} /> : null;
  },
  services: ({ client }) => {
    const services = client.config.site.sections?.services;
    return services ? <Services services={services} /> : null;
  },
  about: ({ client }) => {
    const about = client.config.site.sections?.about;
    return about ? <About about={about} /> : null;
  },
  testimonials: ({ client }) => {
    const testimonials = client.config.site.sections?.testimonials;
    return testimonials ? <Testimonials testimonials={testimonials} /> : null;
  },
  pricing: ({ client }) => {
    const pricing = client.config.site.sections?.pricing;
    return pricing ? <Pricing pricing={pricing} /> : null;
  },
  faq: ({ client }) => {
    const faq = client.config.site.sections?.faq;
    return faq ? <Faq faq={faq} /> : null;
  },
  cta: ({ client }) => {
    const cta = client.config.site.sections?.cta;
    return cta ? <CtaBand cta={cta} /> : null;
  },
  booking: ({ client }) => (
    <BookingEmbed embedUrl={client.config.integrations.bookingEmbedUrl} />
  ),
};

const marketplaceSections: Record<string, SectionRenderer> = {
  marketplaceHero: marketplace.marketplaceHero,
  intentFilters: marketplace.intentFilters,
  liveTonight: marketplace.liveTonight,
  featuredExperiences: marketplace.featuredExperiences,
  storytelling: marketplace.storytelling,
  crowdsharedEvents: marketplace.crowdsharedEvents,
  featuredHosts: marketplace.featuredHosts,
  howItWorks: marketplace.howItWorks,
  trustAndSafety: marketplace.trustAndSafety,
  becomeAHost: marketplace.becomeAHost,
};

export const SECTION_REGISTRY: Record<string, SectionRenderer> = {
  ...marketingSections,
  ...marketplaceSections,
};

export function getSectionRenderer(id: string): SectionRenderer | undefined {
  return SECTION_REGISTRY[id];
}
