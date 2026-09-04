import { Container } from "@/components/Container";

/**
 * Scheduler slot. Renders the embed URL supplied by the client's booking module;
 * without one it shows a themed placeholder so the page still reads as complete.
 */
export function BookingEmbed({
  embedUrl,
  heading,
  provider,
}: {
  embedUrl?: string;
  heading?: string;
  provider?: "cal.com";
}) {
  return (
    <section id="booking" className="bg-surface py-20">
      <Container>
        {heading && (
          <h2 className="max-w-2xl font-heading text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {heading}
          </h2>
        )}

        <div className="mt-12">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={heading ?? "Booking calendar"}
              loading="lazy"
              className="h-[640px] w-full rounded-theme border border-border"
            />
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-theme border border-dashed border-border bg-bg p-10 text-center">
              <h3 className="font-heading text-lg font-semibold text-fg">
                {provider === "cal.com"
                  ? "Scheduling will connect through Cal.com"
                  : "Scheduling is not connected yet"}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                {provider === "cal.com"
                  ? "The signed-in booking area is ready. Add the Cal.com link to configuration or NEXT_PUBLIC_CAL_LINK and the calendar will appear here automatically."
                  : "A scheduling calendar has not been linked for this site. Once a booking link is added to the configuration, the calendar appears here automatically."}
              </p>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
