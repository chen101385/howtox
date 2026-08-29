import { NextResponse } from "next/server";
import { z } from "zod";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { getProviders } from "@/providers";

/**
 * Records session-policy acceptance against a booking.
 *
 * Deliberately a server-side write: acceptance is the fact a later dispute turns
 * on ("was the guest told recording was prohibited?"), so it must not live only
 * in the browser that ticked the box.
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({ bookingCode: z.string().min(1) });

export async function POST(request: Request) {
  if (!client.has("sessions.lobby")) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const repos = getRepositories();
  const booking = await repos.bookings.getByCode(CURRENT_TENANT, parsed.bookingCode);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const viewer = await getProviders().auth.getViewer();
  if (!viewer || viewer.userId !== booking.guestUserId) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  await repos.bookings.update({
    ...booking,
    policiesAcceptedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
