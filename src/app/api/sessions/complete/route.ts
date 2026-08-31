import { NextResponse } from "next/server";
import { z } from "zod";
import { client } from "@/config/active";
import { CURRENT_TENANT } from "@/data";
import { completeBooking } from "@/domain/services/booking-service";
import {
  RATE_LIMITS,
  clientAddress,
  enforceRateLimits,
} from "@/lib/rate-limit-guard";

/**
 * Marks a session complete and releases the host's guaranteed compensation.
 *
 * Deliberately separate from the feedback endpoint: compensation follows
 * DELIVERY, not review. A guest who never submits feedback must not be able to
 * withhold a host's pay by doing nothing, and a poor review must not claw it back.
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({ bookingCode: z.string().min(1) });

export async function POST(request: Request) {
  if (!client.has("sessions.live", "commerce.ledger")) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const limited = await enforceRateLimits([
    { scope: "session-ip", value: clientAddress(request), rule: RATE_LIMITS.session },
  ]);
  if (limited) return limited;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await completeBooking(parsed.bookingCode, CURRENT_TENANT);
  if (!result) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: result.booking.status,
    releasedEntries: result.released.length,
  });
}
