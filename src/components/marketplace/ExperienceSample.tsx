import type { ExperienceSample as Sample } from "@/domain/experience";
import { SamplePolicyNote } from "./RecordingPolicyNotice";
import { duration } from "@/lib/format";

/**
 * Host-published promotional sample.
 *
 * Samples are public by design — they exist so a guest can judge a host before
 * booking. That makes them the opposite of a live session, and the note below
 * says so explicitly to prevent the two policies being confused.
 *
 * Media refs resolve through MediaProvider; the demo serves local files only.
 */
export function ExperienceSampleView({
  sample,
  listingTerm = "experience",
  /** From policies.recording.samplesExempt — samples are public by design. */
  showPolicyNote = true,
}: {
  sample: Sample;
  listingTerm?: string;
  showPolicyNote?: boolean;
}) {
  return (
    <figure className="space-y-3">
      <div className="overflow-hidden rounded-theme border border-border bg-surface">
        {sample.kind === "video" ? (
          <video
            controls
            preload="none"
            poster={sample.posterSrc}
            className="aspect-video w-full"
          >
            <source src={sample.src} />
            Your browser does not support embedded video.
          </video>
        ) : sample.kind === "audio" ? (
          <div className="p-4">
            <audio controls preload="none" className="w-full">
              <source src={sample.src} />
              Your browser does not support embedded audio.
            </audio>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sample.src}
            alt={sample.alt}
            className="aspect-video w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      <figcaption className="space-y-1">
        <p className="text-sm font-medium text-fg">
          {sample.title}
          {sample.durationSeconds !== undefined && (
            <span className="ml-2 text-xs font-normal text-muted">
              {duration(Math.round(sample.durationSeconds / 60))}
            </span>
          )}
        </p>
        {showPolicyNote && <SamplePolicyNote listingTerm={listingTerm} />}
      </figcaption>
    </figure>
  );
}
