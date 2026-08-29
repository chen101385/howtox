import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { SessionRoom, type RoomParticipant } from "@/components/marketplace/SessionRoom";
import { RecordingPolicyNotice } from "@/components/marketplace/RecordingPolicyNotice";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { defaultPermissions } from "@/domain/session";
import { getProviders } from "@/providers";
import { requireCapability } from "@/lib/guard";

/**
 * Live-session shell.
 *
 * Policy acceptance is re-checked HERE, server-side, not just in the lobby — a
 * guest can navigate straight to this URL, and a client-side gate would be no
 * gate at all.
 *
 * The participant list is illustrative: the demo session provider creates no real
 * room, so there is nobody to enumerate.
 */
export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: { code: string } }) {
  requireCapability("sessions.live");

  const repos = getRepositories();
  const booking = await repos.bookings.getByCode(CURRENT_TENANT, params.code);
  if (!booking) notFound();

  const recording = client.config.policies.recording;

  if (recording?.requirePolicyAcceptance && !booking.policiesAcceptedAt) {
    return (
      <Container className="max-w-2xl py-12">
        <div className="rounded-theme border border-border bg-surface p-8 text-center">
          <h1 className="font-heading text-xl font-bold text-fg">
            Accept the session policies first
          </h1>
          <p className="mt-2 text-sm text-muted">
            Go through the lobby so we can record that you&apos;ve seen the recording
            and conduct rules.
          </p>
          <a
            href={`/lobby/${booking.bookingCode}`}
            className="mt-4 inline-block rounded-theme bg-primary px-6 py-3 text-sm font-semibold text-primary-fg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Go to the lobby
          </a>
        </div>
      </Container>
    );
  }

  const experience = await repos.experiences.getById(
    CURRENT_TENANT,
    booking.experienceId
  );
  const host = experience
    ? await repos.experiences.getHost(CURRENT_TENANT, experience.hostId)
    : null;
  const viewer = await getProviders().auth.getViewer();

  const viewerIsHost = Boolean(viewer && host && viewer.userId === host.userId);
  const viewerRole = viewerIsHost ? "host" : "audience";

  // Illustrative roster. Audience members carry no publishing rights by default.
  const participants: RoomParticipant[] = [
    {
      userId: String(host?.userId ?? "host"),
      displayName: host?.public.displayName ?? client.terms.provider(),
      role: "host",
      canPublish: true,
    },
    ...booking.seats.map((seat, i) => ({
      userId: `${seat.id}`,
      displayName: seat.guestDisplayName,
      role: "audience" as const,
      canPublish: defaultPermissions("audience").canPublishAudio,
      muted: i > 0,
    })),
  ];

  const viewerDisplayName = viewerIsHost
    ? (host?.public.displayName ?? client.terms.provider())
    : (booking.seats[0]?.guestDisplayName ?? viewer?.displayName ?? "Guest");

  return (
    <Container className="py-8">
      <h1 className="sr-only">{experience?.title ?? "Live session"}</h1>
      <SessionRoom
        bookingCode={booking.bookingCode}
        experienceTitle={experience?.title ?? "Live session"}
        viewerDisplayName={viewerDisplayName}
        viewerRole={viewerRole}
        participants={participants}
        watermarkEnabled={Boolean(recording?.watermarkEnabled)}
        watermarkMoveIntervalSeconds={recording?.watermarkMoveIntervalSeconds ?? 20}
        moderationEnabled={Boolean(
          client.config.policies.moderation?.hostModerationControls
        )}
        reportingEnabled={Boolean(client.config.policies.moderation?.reportingEnabled)}
        terms={{
          provider: client.terms.provider(),
          customer: client.terms.customer(),
        }}
        recordingNotice={
          recording ? (
            <RecordingPolicyNotice
              variant="full"
              watermarkEnabled={recording.watermarkEnabled}
              platformRecordingEnabled={recording.platformRecordingEnabled}
            />
          ) : null
        }
      />
    </Container>
  );
}
