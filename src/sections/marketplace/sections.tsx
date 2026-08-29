import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { ExperienceCard } from "@/components/marketplace/ExperienceCard";
import { HostPreview } from "@/components/marketplace/HostPreview";
import { IntentFilters } from "@/components/marketplace/IntentFilters";
import { CrowdsharedRail, LiveTonightRail, type RailItem } from "@/components/marketplace/Rails";
import { RecordingPolicyNotice } from "@/components/marketplace/RecordingPolicyNotice";
import { OnPlatformBenefits } from "@/components/marketplace/RiskWarning";
import { CURRENT_TENANT, getRepositories } from "@/data";
import type { Experience, ExperienceOccurrence } from "@/domain/experience";
import type { SectionContext } from "../types";

/**
 * Marketplace homepage sections.
 *
 * Each is an async function returning a node rather than a component, so the page
 * can await data without running into async-component JSX typing. Every string a
 * visitor reads either comes from the record being rendered or from the client's
 * terminology — no marketplace noun is hardcoded here.
 */

/* ------------------------------- Helpers -------------------------------- */

async function buildRailItems(
  occurrences: ExperienceOccurrence[]
): Promise<RailItem[]> {
  const repos = getRepositories();
  const items = await Promise.all(
    occurrences.map(async (occurrence) => {
      const experience = await repos.experiences.getById(
        CURRENT_TENANT,
        occurrence.experienceId
      );
      if (!experience) return null;
      const host = await repos.experiences.getHost(CURRENT_TENANT, experience.hostId);
      return {
        occurrence,
        experience,
        hostName: host?.public.displayName ?? "",
      } satisfies RailItem;
    })
  );
  return items.filter((i): i is RailItem => i !== null);
}

async function cardsFor(experiences: Experience[]) {
  const repos = getRepositories();
  return Promise.all(
    experiences.map(async (experience) => {
      const host = await repos.experiences.getHost(CURRENT_TENANT, experience.hostId);
      const occurrences = await repos.experiences.listOccurrences(
        CURRENT_TENANT,
        experience.id
      );
      const next = occurrences.find(
        (o) => o.status === "scheduled" && new Date(o.startsAt) > new Date()
      );
      return { experience, hostName: host?.public.displayName ?? "", next };
    })
  );
}

function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-heading text-2xl font-bold text-fg sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

function ExperienceGrid({
  cards,
  listingTerm,
}: {
  cards: Awaited<ReturnType<typeof cardsFor>>;
  listingTerm: string;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ experience, hostName, next }) => (
        <ExperienceCard
          key={experience.id}
          experience={experience}
          hostName={hostName}
          nextOccurrence={next}
          listingTerm={listingTerm}
        />
      ))}
    </div>
  );
}

/* ------------------------------- Sections ------------------------------- */

export async function marketplaceHero({ client }: SectionContext) {
  const hero = client.config.site.sections?.hero;
  if (!hero) return null;

  const repos = getRepositories();
  const tonight = await repos.experiences.listUpcoming(CURRENT_TENANT, {
    withinHours: 12,
    limit: 1,
  });

  return (
    <section className="border-b border-border bg-surface">
      <Container className="py-20 sm:py-28">
        <div className="max-w-3xl">
          {tonight.length > 0 && hero.eyebrow && (
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {hero.eyebrow}
            </p>
          )}

          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-fg sm:text-5xl lg:text-6xl">
            {hero.headline}
          </h1>

          {hero.subheadline && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {hero.subheadline}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            {hero.ctaPrimary && <Button link={hero.ctaPrimary} size="lg" />}
            {hero.ctaSecondary && <Button link={hero.ctaSecondary} size="lg" />}
          </div>

          {hero.highlights && (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {hero.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}

export async function intentFilters({ client }: SectionContext) {
  return (
    <section className="border-b border-border py-10">
      <Container>
        <h2 className="sr-only">Browse by intent</h2>
        <IntentFilters
          showCategories
          crowdsharedTerm={client.terms.groupBooking()}
        />
      </Container>
    </section>
  );
}

export async function liveTonight({ client, options }: SectionContext) {
  const limit = typeof options?.limit === "number" ? options.limit : 4;
  const repos = getRepositories();
  const occurrences = await repos.experiences.listUpcoming(CURRENT_TENANT, {
    withinHours: 12,
    limit,
  });
  const items = await buildRailItems(occurrences);
  if (items.length === 0) return null;

  return (
    <section className="py-16">
      <Container>
        <SectionHeading
          title="Live tonight"
          subtitle={`Starting in the next few hours`}
          href="/discover?intent=live_tonight"
          linkLabel="See all"
        />
        <LiveTonightRail items={items} />
      </Container>
    </section>
  );
}

export async function featuredExperiences({ client, options }: SectionContext) {
  const limit = typeof options?.limit === "number" ? options.limit : 6;
  const repos = getRepositories();
  const experiences = await repos.experiences.list({ tenantId: CURRENT_TENANT, limit });
  const cards = await cardsFor(experiences);
  if (cards.length === 0) return null;

  return (
    <section className="border-t border-border py-16">
      <Container>
        <SectionHeading
          title={`Popular ${client.terms.listing({ plural: true, lower: true })}`}
          subtitle="Live and interactive — never a recording"
          href="/discover"
          linkLabel="Browse everything"
        />
        <ExperienceGrid cards={cards} listingTerm={client.terms.listing()} />
      </Container>
    </section>
  );
}

/** Storytelling is a first-class category, given its own homepage placement. */
export async function storytelling({ client, options }: SectionContext) {
  const limit = typeof options?.limit === "number" ? options.limit : 3;
  const repos = getRepositories();
  const experiences = await repos.experiences.list({
    tenantId: CURRENT_TENANT,
    category: "storytelling",
    limit,
  });
  const cards = await cardsFor(experiences);
  if (cards.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface py-16">
      <Container>
        <SectionHeading
          title="Storytelling"
          subtitle="Live stories that change depending on who turns up"
          href="/discover?category=storytelling"
          linkLabel="More storytelling"
        />
        <ExperienceGrid cards={cards} listingTerm={client.terms.listing()} />
      </Container>
    </section>
  );
}

export async function crowdsharedEvents({ client, options }: SectionContext) {
  const limit = typeof options?.limit === "number" ? options.limit : 3;
  const repos = getRepositories();
  const occurrences = await repos.experiences.listUpcoming(CURRENT_TENANT, {
    crowdsharedOnly: true,
    limit,
  });
  const items = await buildRailItems(occurrences);
  if (items.length === 0) return null;

  const term = client.terms.groupBooking();

  return (
    <section className="border-t border-border py-16">
      <Container>
        <SectionHeading
          title={`${term} events`}
          subtitle="Buy a single seat and join a small crowd"
          href="/discover?intent=join_a_small_crowd"
          linkLabel="See all"
        />
        <CrowdsharedRail items={items} crowdsharedTerm={term} />
      </Container>
    </section>
  );
}

export async function featuredHosts({ client, options }: SectionContext) {
  const limit = typeof options?.limit === "number" ? options.limit : 4;
  const repos = getRepositories();
  const hosts = await repos.experiences.listHosts(CURRENT_TENANT, { limit });
  if (hosts.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface py-16">
      <Container>
        <SectionHeading
          title={client.terms.provider({ plural: true })}
          subtitle="People who do this live, regularly"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {hosts.map((host) => (
            <HostPreview
              key={host.id}
              host={host}
              providerTerm={client.terms.provider()}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

export async function howItWorks({ client }: SectionContext) {
  const guest = client.terms.customer({ lower: true });
  const steps = [
    {
      title: "Find something",
      body: `Browse by mood — tonight, with friends, one-to-one — or by what you want to try.`,
    },
    {
      title: "Pick how you join",
      body: `Book privately, bring your own group, or take a single seat alongside other ${client.terms.customer({ plural: true, lower: true })}.`,
    },
    {
      title: "Show up",
      body: `Accept the session rules, join the room, and take part. Every session is live.`,
    },
    {
      title: "Say how it went",
      body: `Rate it, flag anything that went wrong, and tip if you want to.`,
    },
  ];

  return (
    <section id="how-it-works" className="border-t border-border py-16">
      <Container>
        <SectionHeading title="How it works" />
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-theme border border-border bg-surface p-5">
              <span className="font-heading text-sm font-bold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-heading font-semibold text-fg">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-muted">
          Every {guest} is pseudonymous by default — hosts never see your legal name.
        </p>
      </Container>
    </section>
  );
}

export async function trustAndSafety({ client }: SectionContext) {
  const recording = client.config.policies.recording;

  return (
    <section id="trust-and-safety" className="border-t border-border bg-surface py-16">
      <Container>
        <SectionHeading
          title="Trust & safety"
          subtitle="What we actually do, and what we can't promise"
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {recording && (
            <RecordingPolicyNotice
              watermarkEnabled={recording.watermarkEnabled}
              platformRecordingEnabled={recording.platformRecordingEnabled}
            />
          )}
          <div className="rounded-theme border border-border bg-bg p-5">
            <h3 className="font-heading text-base font-semibold text-fg">
              During a session
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>Leave at any time, for any reason.</li>
              <li>Report a problem from inside the session.</li>
              <li>
                {client.terms.provider({ plural: true })} can mute, remove, and block
                rejoining.
              </li>
              <li>
                Audience members can&apos;t broadcast until they&apos;re brought on
                stage.
              </li>
              <li>
                We keep a log of actions — joins, mutes, removals — to help resolve
                disputes. We never record or transcribe session audio or video.
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

export async function becomeAHost({ client }: SectionContext) {
  return (
    <section className="border-t border-border py-16">
      <Container>
        <div className="grid gap-8 rounded-theme border border-border bg-surface p-8 lg:grid-cols-2">
          <div>
            <h2 className="font-heading text-2xl font-bold text-fg sm:text-3xl">
              {`Become a ${client.terms.provider({ lower: true })}`}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              If you can hold a room for an hour, there are people who want to spend
              their evening with you. You set the format, the schedule and the price.
            </p>
            <div className="mt-6">
              <Button
                link={{
                  label: `Start hosting`,
                  href: "/become-a-host",
                  emphasized: true,
                }}
                size="lg"
              />
            </div>
          </div>
          <OnPlatformBenefits
            audience="host"
            providerTerm={client.terms.provider()}
            customerTerm={client.terms.customer()}
          />
        </div>
      </Container>
    </section>
  );
}
