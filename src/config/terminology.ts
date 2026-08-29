/**
 * Configurable terminology.
 *
 * The same architecture serves a coaching site ("Coach"/"Client"/"Program") and an
 * entertainment marketplace ("Host"/"Guest"/"Experience"). Shared components must
 * therefore never hardcode "Host", "Guest", or "Experience" — they read these
 * labels and apply them.
 */

export type Terminology = {
  /** Person supplying the service. Default: "Host". */
  provider: { singular: string; plural: string };
  /** Person receiving it. Default: "Guest". */
  customer: { singular: string; plural: string };
  /** The offering itself. Default: "Experience". */
  listing: { singular: string; plural: string };
  /** A scheduled instance. Default: "Session". */
  occurrence: { singular: string; plural: string };
  /** Multi-buyer group booking. Default: "Crowdshared". */
  groupBooking: { singular: string; plural: string };
};

export const DEFAULT_TERMINOLOGY: Terminology = {
  provider: { singular: "Provider", plural: "Providers" },
  customer: { singular: "Customer", plural: "Customers" },
  listing: { singular: "Offering", plural: "Offerings" },
  occurrence: { singular: "Session", plural: "Sessions" },
  groupBooking: { singular: "Group booking", plural: "Group bookings" },
};

export const MARKETPLACE_TERMINOLOGY: Terminology = {
  provider: { singular: "Host", plural: "Hosts" },
  customer: { singular: "Guest", plural: "Guests" },
  listing: { singular: "Experience", plural: "Experiences" },
  occurrence: { singular: "Session", plural: "Sessions" },
  groupBooking: { singular: "Crowdshared", plural: "Crowdshared events" },
};

export const APPOINTMENTS_TERMINOLOGY: Terminology = {
  provider: { singular: "Practitioner", plural: "Practitioners" },
  customer: { singular: "Client", plural: "Clients" },
  listing: { singular: "Service", plural: "Services" },
  occurrence: { singular: "Appointment", plural: "Appointments" },
  groupBooking: { singular: "Group session", plural: "Group sessions" },
};

type TermKey = keyof Terminology;

/** Sentence-case helper so labels can be embedded mid-sentence. */
export function lower(term: string): string {
  return term.charAt(0).toLowerCase() + term.slice(1);
}

/**
 * Small accessor bound to a client's terminology, so components read
 * `t.listing()` / `t.provider({ plural: true })` instead of string literals.
 */
export function createTerms(terminology: Terminology) {
  const get = (key: TermKey, opts?: { plural?: boolean; lower?: boolean }) => {
    const entry = terminology[key];
    const value = opts?.plural ? entry.plural : entry.singular;
    return opts?.lower ? lower(value) : value;
  };

  return {
    raw: terminology,
    provider: (opts?: { plural?: boolean; lower?: boolean }) => get("provider", opts),
    customer: (opts?: { plural?: boolean; lower?: boolean }) => get("customer", opts),
    listing: (opts?: { plural?: boolean; lower?: boolean }) => get("listing", opts),
    occurrence: (opts?: { plural?: boolean; lower?: boolean }) => get("occurrence", opts),
    groupBooking: (opts?: { plural?: boolean; lower?: boolean }) => get("groupBooking", opts),
  };
}

export type Terms = ReturnType<typeof createTerms>;
