import { NextResponse } from "next/server";
import { z } from "zod";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { incidentId as toIncidentId } from "@/domain/ids";
import {
  REPORT_CATEGORY_LABELS,
  defaultSeverity,
  type Incident,
  type ReportCategory,
} from "@/domain/incident";
import { getProviders } from "@/providers";
import {
  RATE_LIMITS,
  clientAddress,
  enforceRateLimits,
} from "@/lib/rate-limit-guard";

/**
 * In-session reporting.
 *
 * Creates an incident in `submitted` for human triage. Nothing is adjudicated
 * here, no account is actioned, and the reported party is never told who filed
 * the report — the response deliberately returns only an acknowledgement.
 */
export const dynamic = "force-dynamic";

const categories = Object.keys(REPORT_CATEGORY_LABELS) as [
  ReportCategory,
  ...ReportCategory[],
];

const bodySchema = z.object({
  bookingCode: z.string().min(1).optional(),
  category: z.enum(categories),
  description: z.string().max(4000).optional(),
});

export async function POST(request: Request) {
  if (!client.has("trust.reporting")) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  // The loosest write limit in the app, on purpose — see RATE_LIMITS.report.
  const limited = await enforceRateLimits([
    { scope: "report-ip", value: clientAddress(request), rule: RATE_LIMITS.report },
  ]);
  if (limited) return limited;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const viewer = await getProviders().auth.getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in to report." }, { status: 401 });
  }

  const repos = getRepositories();
  const booking = parsed.bookingCode
    ? await repos.bookings.getByCode(CURRENT_TENANT, parsed.bookingCode)
    : null;

  const now = new Date().toISOString();
  const incident: Incident = {
    id: toIncidentId(`inc_${now.replace(/\D/g, "").slice(-12)}`),
    tenantId: CURRENT_TENANT,
    bookingId: booking?.id,
    reporterUserId: viewer.userId,
    category: parsed.category,
    severity: defaultSeverity(parsed.category),
    status: "submitted",
    description: parsed.description?.trim() || "(no additional detail provided)",
    createdAt: now,
    updatedAt: now,
    reviewNotes: [],
  };

  await repos.incidents.create(incident);

  return NextResponse.json({ ok: true, severity: incident.severity });
}
