import { NextResponse } from "next/server";
import { z } from "zod";
import {
  RATE_LIMITS,
  clientAddress,
  enforceRateLimits,
} from "@/lib/rate-limit-guard";

/**
 * Lead capture endpoint referenced by client configs (`integrations.formEndpoint`).
 *
 * Validates and acknowledges, but does NOT deliver anywhere — there is no email
 * provider configured. It logs in development and returns a response that says so,
 * rather than pretending a message was sent.
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  message: z.string().max(4000).optional(),
});

export async function POST(request: Request) {
  const limited = await enforceRateLimits([
    { scope: "lead-ip", value: clientAddress(request), rule: RATE_LIMITS.lead },
  ]);
  if (limited) return limited;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[lead] received enquiry from ${parsed.email} (not delivered anywhere)`);
  }

  return NextResponse.json({
    ok: true,
    delivered: false,
    notice:
      "Received, but no delivery provider is configured. Wire an email provider before relying on this endpoint.",
  });
}
