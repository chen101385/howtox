/**
 * Branded identifiers.
 *
 * Structural typing would happily let a BookingId be passed where an ExperienceId
 * is expected. Branding makes those mistakes compile errors while keeping the
 * runtime representation a plain string.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type TenantId = Brand<string, "TenantId">;
export type UserId = Brand<string, "UserId">;
export type HostId = Brand<string, "HostId">;
export type ExperienceId = Brand<string, "ExperienceId">;
export type OccurrenceId = Brand<string, "OccurrenceId">;
export type BookingId = Brand<string, "BookingId">;
export type SeatId = Brand<string, "SeatId">;
export type RoomId = Brand<string, "RoomId">;
export type ConversationId = Brand<string, "ConversationId">;
export type MessageId = Brand<string, "MessageId">;
export type ReviewId = Brand<string, "ReviewId">;
export type IncidentId = Brand<string, "IncidentId">;
export type RiskSignalId = Brand<string, "RiskSignalId">;
export type LedgerEntryId = Brand<string, "LedgerEntryId">;

export const tenantId = (v: string) => v as TenantId;
export const userId = (v: string) => v as UserId;
export const hostId = (v: string) => v as HostId;
export const experienceId = (v: string) => v as ExperienceId;
export const occurrenceId = (v: string) => v as OccurrenceId;
export const bookingId = (v: string) => v as BookingId;
export const seatId = (v: string) => v as SeatId;
export const roomId = (v: string) => v as RoomId;
export const conversationId = (v: string) => v as ConversationId;
export const messageId = (v: string) => v as MessageId;
export const reviewId = (v: string) => v as ReviewId;
export const incidentId = (v: string) => v as IncidentId;
export const riskSignalId = (v: string) => v as RiskSignalId;
export const ledgerEntryId = (v: string) => v as LedgerEntryId;

/**
 * Short, human-quotable booking code (e.g. "K7QP-2M"). Used in support
 * conversations and as the non-sensitive component of session watermarks.
 * Excludes vowels and lookalike glyphs to avoid accidental words and 0/O, 1/I.
 */
const CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";

export function generateBookingCode(random: () => number = Math.random): string {
  const pick = () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  const block = (n: number) => Array.from({ length: n }, pick).join("");
  return `${block(4)}-${block(2)}`;
}
