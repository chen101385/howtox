import { NextResponse } from "next/server";
import { z } from "zod";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { occurrenceId as toOccurrenceId } from "@/domain/ids";
import { BookingError, createBooking } from "@/domain/services/booking-service";
import { DEFAULT_COMPENSATION_POLICY } from "@/domain/ledger";
import { getProviders } from "@/providers";

/**
 * Booking creation.
 *
 * Input is validated server-side rather than trusted from the client: price,
 * seat availability and mode legality are all re-derived from stored records, so
 * a tampered request cannot buy a sold-out seat or set its own price.
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  experienceSlug: z.string().min(1),
  bookingMode: z.enum(["one_to_one", "private_group", "crowdshared"]),
  occurrenceId: z.string().optional(),
  seatCount: z.number().int().min(1).max(100),
});

export async function POST(request: Request) {
  if (!client.has("commerce.checkout", "marketplace.listings")) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const repos = getRepositories();
  const experience = await repos.experiences.getBySlug(
    CURRENT_TENANT,
    parsed.experienceSlug
  );
  if (!experience) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const occurrence = parsed.occurrenceId
    ? await repos.experiences.getOccurrence(
        CURRENT_TENANT,
        toOccurrenceId(parsed.occurrenceId)
      )
    : undefined;

  if (parsed.occurrenceId && !occurrence) {
    return NextResponse.json({ error: "That session no longer exists." }, { status: 404 });
  }

  const host = await repos.experiences.getHost(CURRENT_TENANT, experience.hostId);
  if (!host) {
    return NextResponse.json({ error: "Host unavailable." }, { status: 409 });
  }

  const viewer = await getProviders().auth.getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in to book." }, { status: 401 });
  }

  try {
    const booking = await createBooking({
      tenantId: CURRENT_TENANT,
      experience,
      occurrence: occurrence ?? undefined,
      bookingMode: parsed.bookingMode,
      seatCount: parsed.seatCount,
      guestUserId: viewer.userId,
      guestDisplayName: viewer.displayName,
      hostUserId: host.userId,
      policy: client.config.policies.compensation ?? DEFAULT_COMPENSATION_POLICY,
      currency: client.config.product.currency,
    });

    return NextResponse.json({ bookingCode: booking.bookingCode });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[bookings] unexpected error", error);
    return NextResponse.json({ error: "Could not complete the booking." }, { status: 500 });
  }
}
