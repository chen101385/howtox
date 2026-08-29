import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { client } from "@/config/active";
import {
  BOOKING_MODES,
  CATEGORY_LABELS,
  EXPERIENCE_CATEGORIES,
} from "@/domain/experience";
import { bookingModeDescription, bookingModeLabel } from "@/lib/format";
import { requireCapability } from "@/lib/guard";

/**
 * Creation shell — deliberately inert.
 *
 * Authoring is not implemented in this pass, so every control is `disabled` and
 * there is no submit handler and no action. A form that looked like it worked
 * would be worse than no form: a host would write a listing and lose it. The
 * scaffold exists to show the shape of the eventual flow and where the
 * publish-time anti-circumvention scan (`assessListingText`) would run.
 */
export const dynamic = "force-dynamic";

/**
 * The eventual submit path would resolve the owning host from the authenticated
 * viewer via AuthProvider rather than from any value posted by the form.
 */
export const metadata: Metadata = {
  title: `New ${client.terms.listing({ lower: true })} — ${client.config.site.brand.name}`,
};

const FIELD =
  "mt-1.5 w-full rounded-theme border border-border bg-surface px-3 py-2 text-sm text-fg disabled:opacity-60";
const LABEL = "block text-sm font-medium text-fg";

export default function NewExperiencePage() {
  requireCapability("marketplace.listings");

  const listing = client.terms.listing();
  const listingLower = client.terms.listing({ lower: true });
  const guestsLower = client.terms.customer({ plural: true, lower: true });
  const crowdshared = client.terms.groupBooking();

  return (
    <Container className="py-12">
      <header className="mb-8">
        <p className="text-sm text-muted">
          <Link
            href="/host/experiences"
            className="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ← Your {client.terms.listing({ plural: true, lower: true })}
          </Link>
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-fg sm:text-4xl">
          New {listingLower}
        </h1>
      </header>

      <div className="mb-8 rounded-theme border border-accent bg-surface p-5">
        <h2 className="font-heading text-base font-semibold text-fg">
          This form does not work yet
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Creating a {listingLower} is not implemented in this pass. Every field
          below is disabled and nothing is saved or submitted — the scaffold is
          here to show the shape of the flow, not to accept content.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          When it is built, publishing will first run the anti-circumvention scan
          (<code className="text-fg">assessListingText</code> in{" "}
          <code className="text-fg">src/domain/risk.ts</code>) across the title,
          tagline and description. Contact details or off-platform payment
          handles embedded in those fields are surfaced as a publish-time error
          for the {client.terms.provider({ lower: true })} to fix, before the{" "}
          {listingLower} is visible to any {client.terms.customer({ lower: true })}.
        </p>
      </div>

      {/* No action and no submit: this scaffold must not appear to accept input. */}
      <form className="space-y-8">
        <fieldset disabled className="space-y-8">
          <legend className="sr-only">{listing} details — disabled scaffold</legend>

          <section className="rounded-theme border border-border bg-surface p-5">
            <h2 className="font-heading text-lg font-semibold text-fg">Basics</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="title" className={LABEL}>
                  Title
                </label>
                <input id="title" name="title" type="text" className={FIELD} />
              </div>
              <div>
                <label htmlFor="tagline" className={LABEL}>
                  Tagline
                </label>
                <input id="tagline" name="tagline" type="text" className={FIELD} />
                <p className="mt-1 text-xs text-muted">
                  One line, shown on cards.
                </p>
              </div>
              <div>
                <label htmlFor="description" className={LABEL}>
                  Description
                </label>
                <textarea id="description" name="description" rows={5} className={FIELD} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="category" className={LABEL}>
                    Category
                  </label>
                  <select id="category" name="category" className={FIELD} defaultValue="">
                    <option value="" disabled>
                      Choose a category
                    </option>
                    {EXPERIENCE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="durationMinutes" className={LABEL}>
                    Length (minutes)
                  </label>
                  <input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min={15}
                    step={5}
                    className={FIELD}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-theme border border-border bg-surface p-5">
            <h2 className="font-heading text-lg font-semibold text-fg">
              How {guestsLower} book
            </h2>
            <ul className="mt-4 space-y-3">
              {BOOKING_MODES.map((mode) => (
                <li key={mode} className="flex gap-3">
                  <input
                    id={`mode-${mode}`}
                    name="bookingModes"
                    type="checkbox"
                    value={mode}
                    className="mt-1 h-4 w-4 rounded-theme border border-border"
                  />
                  <label htmlFor={`mode-${mode}`} className="text-sm">
                    <span className="font-medium text-fg">
                      {bookingModeLabel(mode, crowdshared)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {bookingModeDescription(mode, crowdshared)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-theme border border-border bg-surface p-5">
            <h2 className="font-heading text-lg font-semibold text-fg">Pricing</h2>
            <p className="mt-1.5 text-sm text-muted">
              One price per mode you offer, in {client.config.product.currency}.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="price-one-to-one" className={LABEL}>
                  {bookingModeLabel("one_to_one", crowdshared)}
                </label>
                <input
                  id="price-one-to-one"
                  name="priceOneToOne"
                  type="number"
                  min={0}
                  step={1}
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="price-private-group" className={LABEL}>
                  {bookingModeLabel("private_group", crowdshared)}
                </label>
                <input
                  id="price-private-group"
                  name="pricePrivateGroup"
                  type="number"
                  min={0}
                  step={1}
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="price-per-seat" className={LABEL}>
                  {bookingModeLabel("crowdshared", crowdshared)} (per seat)
                </label>
                <input
                  id="price-per-seat"
                  name="pricePerSeat"
                  type="number"
                  min={0}
                  step={1}
                  className={FIELD}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled
              className="rounded-theme bg-primary px-4 py-2 text-sm font-medium text-primary-fg opacity-60"
            >
              Publish
            </button>
            <p className="text-xs text-muted">
              Disabled — publishing is not implemented.
            </p>
          </div>
        </fieldset>
      </form>
    </Container>
  );
}
