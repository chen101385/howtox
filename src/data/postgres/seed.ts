/**
 * Loads the demo seed data into Postgres.
 *
 * Shared by the `db:seed` script and by the PGlite integration tests, so the
 * tests exercise the same insert path a real database gets — a seeding bug shows
 * up in CI rather than on first deploy.
 *
 * Idempotent: every insert is `onConflictDoNothing`, so re-running tops up a
 * partially seeded database instead of failing.
 */

import type { PostgresDatabase } from "./client";
import * as t from "./schema";
import {
  fromExperience,
  fromIncident,
  fromLedgerEntry,
  fromOccurrence,
  fromReview,
  fromRiskSignal,
} from "./mappers";
import { SEED_EXPERIENCES } from "../seed/experiences";
import { SEED_HOSTS, SEED_USERS_PRIVATE } from "../seed/hosts";
import { generateOccurrences } from "../seed/occurrences";
import { SEED_INCIDENTS, SEED_REVIEWS, SEED_RISK_SIGNALS } from "../seed/reviews";
import { SEED_LEDGER_ENTRIES } from "../seed/ledger";

export type SeedResult = Record<string, number>;

export async function seedDatabase(
  db: PostgresDatabase,
  opts?: { now?: Date }
): Promise<SeedResult> {
  const now = opts?.now ?? new Date();

  // Users first — host_profiles and everything downstream reference them.
  const userRows = SEED_USERS_PRIVATE.map((u) => ({
    id: u.id,
    tenantId: u.tenantId,
    legalFirstName: u.legalFirstName,
    legalLastName: u.legalLastName,
    email: u.email,
    phone: u.phone ?? null,
    payoutAccountRef: u.payoutAccountRef ?? null,
    addressLine: u.addressLine ?? null,
    governmentIdRef: u.governmentIdRef ?? null,
    verificationStatus: u.verification.identity,
    verifiedAt: u.verification.verifiedAt ? new Date(u.verification.verifiedAt) : null,
    verificationProvider: u.verification.provider ?? null,
    displayName: u.display.displayName,
    displayStyle: u.display.style,
    handle: u.display.handle,
    avatarSrc: u.display.avatar?.src ?? null,
    avatarAlt: u.display.avatar?.alt ?? null,
    roles: u.roles,
    createdAt: new Date(u.createdAt),
  }));

  const hostRows = SEED_HOSTS.map((h) => ({
    id: h.id,
    tenantId: h.tenantId,
    userId: h.userId,
    headline: h.headline,
    bio: h.bio,
    approximateRegion: h.approximateRegion ?? null,
    languages: h.languages,
    categories: h.categories,
    sessionsHosted: h.trust.sessionsHosted,
    averageRating: h.trust.averageRating ?? null,
    reviewCount: h.trust.reviewCount,
    onTimeRate: h.trust.onTimeRate ?? null,
    respondsWithin: h.trust.respondsWithin ?? null,
  }));

  const occurrences = generateOccurrences(now);

  await db.transaction(async (tx) => {
    await tx.insert(t.users).values(userRows).onConflictDoNothing();
    await tx.insert(t.hostProfiles).values(hostRows).onConflictDoNothing();
    await tx
      .insert(t.experiences)
      .values(SEED_EXPERIENCES.map(fromExperience))
      .onConflictDoNothing();
    await tx
      .insert(t.occurrences)
      .values(occurrences.map(fromOccurrence))
      .onConflictDoNothing();
    await tx
      .insert(t.reviews)
      .values(SEED_REVIEWS.map(fromReview))
      .onConflictDoNothing();
    await tx
      .insert(t.incidents)
      .values(SEED_INCIDENTS.map(fromIncident))
      .onConflictDoNothing();
    await tx
      .insert(t.riskSignals)
      .values(SEED_RISK_SIGNALS.map(fromRiskSignal))
      .onConflictDoNothing();
    await tx
      .insert(t.ledgerEntries)
      .values(SEED_LEDGER_ENTRIES.map(fromLedgerEntry))
      .onConflictDoNothing();
  });

  return {
    users: userRows.length,
    hosts: hostRows.length,
    experiences: SEED_EXPERIENCES.length,
    occurrences: occurrences.length,
    reviews: SEED_REVIEWS.length,
    incidents: SEED_INCIDENTS.length,
    riskSignals: SEED_RISK_SIGNALS.length,
    ledgerEntries: SEED_LEDGER_ENTRIES.length,
  };
}
