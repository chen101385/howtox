import Link from "next/link";
import type { HostProfile, HostTrustSummary as TrustSummary } from "@/domain/identity";

/**
 * Public host surfaces.
 *
 * These render `HostProfile.public` only, which is produced by
 * `toPublicProfile()`. No private identity field is reachable from this file's
 * props, which is the point: a leak would have to be introduced deliberately.
 */

/** A verification badge, or an honest absence of one. */
export function VerifiedIdentityIndicator({
  verified,
  className = "",
}: {
  verified: boolean;
  className?: string;
}) {
  if (!verified) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-muted ${className}`}
        title="This host has not completed identity verification."
      >
        <span aria-hidden="true">○</span> Not yet verified
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium text-accent ${className}`}
      title="Identity verification passed."
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
        <path d="M12 2l2.2 1.6 2.7-.3 1 2.5 2.4 1.2-.6 2.6.6 2.6-2.4 1.2-1 2.5-2.7-.3L12 17l-2.2-1.6-2.7.3-1-2.5L3.7 12l.6-2.6-.6-2.6 2.4-1.2 1-2.5 2.7.3L12 2zm-1 12l5-5-1.4-1.4L11 11.2 9.4 9.6 8 11l3 3z" />
      </svg>
      Verified
    </span>
  );
}

/** Compact trust signals. Absent values are omitted rather than faked. */
export function HostTrustSummary({ trust }: { trust: TrustSummary }) {
  const items: { label: string; value: string }[] = [
    { label: "sessions hosted", value: trust.sessionsHosted.toLocaleString() },
  ];

  if (trust.averageRating !== undefined) {
    items.push({
      label: `from ${trust.reviewCount} reviews`,
      value: `${trust.averageRating.toFixed(1)}★`,
    });
  }
  if (trust.onTimeRate !== undefined) {
    items.push({ label: "started on time", value: `${trust.onTimeRate}%` });
  }

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="sr-only">{item.label}</dt>
          <dd className="font-heading text-lg font-semibold text-fg">
            {item.value}
            <span className="ml-1.5 text-xs font-normal text-muted">{item.label}</span>
          </dd>
        </div>
      ))}
      {trust.respondsWithin && (
        <div>
          <dt className="sr-only">Response time</dt>
          <dd className="font-heading text-lg font-semibold text-fg">
            {trust.respondsWithin}
            <span className="ml-1.5 text-xs font-normal text-muted">to reply</span>
          </dd>
        </div>
      )}
    </dl>
  );
}

/** Small card used on discovery rails and experience pages. */
export function HostPreview({
  host,
  providerTerm = "Host",
  showBio = false,
}: {
  host: HostProfile;
  providerTerm?: string;
  showBio?: boolean;
}) {
  const initial = host.public.displayName.charAt(0);

  return (
    <article className="relative flex gap-4 rounded-theme border border-border bg-surface p-5">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-primary-fg"
        aria-hidden="true"
      >
        {initial}
      </div>

      <div className="min-w-0">
        <h3 className="font-heading font-semibold text-fg">
          <Link
            href={`/hosts/${host.public.handle}`}
            className="after:absolute after:inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {host.public.displayName}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-muted">{host.headline}</p>

        {showBio && <p className="mt-3 text-sm leading-relaxed text-muted">{host.bio}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <VerifiedIdentityIndicator verified={host.public.identityVerified} />
          <span>{host.trust.sessionsHosted.toLocaleString()} sessions</span>
          {host.trust.averageRating !== undefined && (
            <span>{host.trust.averageRating.toFixed(1)}★</span>
          )}
        </div>
        <span className="sr-only">{providerTerm}</span>
      </div>
    </article>
  );
}
