import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { SessionLobby } from "@/components/marketplace/SessionLobby";
import { RecordingPolicyNotice } from "@/components/marketplace/RecordingPolicyNotice";
import { client } from "@/config/active";
import { CURRENT_TENANT, getRepositories } from "@/data";
import { canEnterLobby } from "@/domain/booking";
import { occurrenceDateTime } from "@/lib/format";
import { requireCapability } from "@/lib/guard";

/**
 * Session lobby.
 *
 * Gates entry on payment having settled (`canEnterLobby`) and, inside the client
 * component, on explicit policy acceptance. Both gates exist because they answer
 * different questions: has this been paid for, and has this person agreed to the
 * session rules.
 */
export const dynamic = "force-dynamic";

export default async function LobbyPage({ params }: { params: { code: string } }) {
  requireCapability("sessions.lobby");

  const repos = getRepositories();
  const booking = await repos.bookings.getByCode(CURRENT_TENANT, params.code);
  if (!booking) notFound();

  const experience = await repos.experiences.getById(
    CURRENT_TENANT,
    booking.experienceId
  );
  const occurrence = booking.occurrenceId
    ? await repos.experiences.getOccurrence(CURRENT_TENANT, booking.occurrenceId)
    : null;
  const host = experience
    ? await repos.experiences.getHost(CURRENT_TENANT, experience.hostId)
    : null;

  const recording = client.config.policies.recording;

  if (!canEnterLobby(booking)) {
    return (
      <Container className="max-w-2xl py-12">
        <div className="rounded-theme border border-border bg-surface p-8 text-center">
          <h1 className="font-heading text-xl font-bold text-fg">
            This booking isn&apos;t ready
          </h1>
          <p className="mt-2 text-sm text-muted">
            Its status is &ldquo;{booking.status}&rdquo;. Only confirmed bookings can
            enter the lobby.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <SessionLobby
        bookingCode={booking.bookingCode}
        experienceTitle={experience?.title ?? "Your session"}
        hostDisplayName={host?.public.displayName ?? client.terms.provider()}
        startsAtLabel={
          occurrence
            ? occurrenceDateTime(occurrence.startsAt, occurrence.timezone)
            : "Time to be confirmed"
        }
        watermarkEnabled={Boolean(recording?.watermarkEnabled)}
      >
        {recording && (
          <RecordingPolicyNotice
            watermarkEnabled={recording.watermarkEnabled}
            platformRecordingEnabled={recording.platformRecordingEnabled}
          />
        )}
      </SessionLobby>
    </Container>
  );
}
