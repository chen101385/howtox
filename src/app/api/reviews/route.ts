import { NextResponse } from "next/server";
import { z } from "zod";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { incidentId as toIncidentId, reviewId as toReviewId } from "@/domain/ids";
import { money } from "@/domain/money";
import { defaultSeverity, type Incident } from "@/domain/incident";
import { recommendBonus, requiresSafetyReview, type Review } from "@/domain/review";
import { performanceBonusEntry, tipEntry } from "@/domain/ledger";
import { getProviders } from "@/providers";

/**
 * Post-session feedback.
 *
 * The four channels are kept separate on the server too:
 *   - rating + public comment  → the public review
 *   - structured answers       → a bonus RECOMMENDATION, left pending
 *   - the misconduct flag      → a private incident for human triage
 *   - private notes            → never published
 *
 * A low rating alone creates no incident and moves no money.
 */
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  bookingCode: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  publicComment: z.string().max(2000).optional(),
  privateNotes: z.string().max(2000).optional(),
  tipMinor: z.number().int().min(0).max(100_000).optional(),
  structured: z.object({
    deliveredAsAdvertised: z.boolean(),
    meaningfullyInteractive: z.boolean(),
    wouldBookAgain: z.boolean(),
    memorable: z.boolean(),
    inappropriateBehavior: z.boolean(),
  }),
});

export async function POST(request: Request) {
  if (!client.has("reputation.reviews")) {
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

  const experience = await repos.experiences.getById(
    CURRENT_TENANT,
    booking.experienceId
  );
  if (!experience) {
    return NextResponse.json({ error: "Listing unavailable." }, { status: 409 });
  }
  const host = await repos.experiences.getHost(CURRENT_TENANT, experience.hostId);

  const currency = client.config.product.currency;
  const tip = parsed.tipMinor ? money(parsed.tipMinor, currency) : undefined;

  const review: Review = {
    id: toReviewId(`rev_${booking.bookingCode.replace("-", "").toLowerCase()}`),
    tenantId: CURRENT_TENANT,
    bookingId: booking.id,
    experienceId: experience.id,
    hostId: experience.hostId,
    authorUserId: viewer.userId,
    rating: parsed.rating as Review["rating"],
    publicComment: parsed.publicComment || undefined,
    structured: parsed.structured,
    privateNotes: parsed.privateNotes || undefined,
    tip,
    createdAt: new Date().toISOString(),
  };

  await repos.reputation.create(review);

  // Tip: real money in production, a demo ledger entry here.
  if (tip && tip.amountMinor > 0 && host) {
    await repos.ledger.append([
      tipEntry({
        tenantId: CURRENT_TENANT,
        bookingId: booking.id,
        hostUserId: host.userId,
        amount: tip,
      }),
    ]);
  }

  // Bonus is a recommendation only, and is recorded as `pending`.
  const bonus = recommendBonus(review);
  if (bonus.recommended && host) {
    const policy = client.config.policies.compensation;
    if (policy) {
      await repos.ledger.append([
        performanceBonusEntry({
          tenantId: CURRENT_TENANT,
          bookingId: booking.id,
          hostUserId: host.userId,
          amount: money(
            Math.round(
              (booking.totalPrice.amountMinor * policy.maxPerformanceBonusBps) / 10_000
            ),
            currency
          ),
          rationale: bonus.rationale,
        }),
      ]);
    }
  }

  // Only the explicit misconduct flag opens an incident.
  if (requiresSafetyReview(parsed.structured)) {
    const incident: Incident = {
      id: toIncidentId(`inc_${booking.bookingCode.replace("-", "").toLowerCase()}`),
      tenantId: CURRENT_TENANT,
      bookingId: booking.id,
      reporterUserId: viewer.userId,
      category: "other_safety",
      severity: defaultSeverity("other_safety"),
      status: "submitted",
      description:
        parsed.privateNotes ||
        "Reporter flagged inappropriate behavior in post-session feedback.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewNotes: [],
    };
    await repos.incidents.create(incident);
  }

  return NextResponse.json({
    ok: true,
    bonusPendingReview: bonus.recommended,
  });
}
