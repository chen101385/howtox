import { describe, expect, it } from "vitest";
import * as t from "./schema";
import {
  BOOKING_MODES,
  DELIVERY_MODES,
  EXPERIENCE_CATEGORIES,
} from "@/domain/experience";
import { bookingMachine } from "@/domain/booking";
import { incidentMachine, REPORT_CATEGORY_LABELS } from "@/domain/incident";
import { ROLES } from "@/domain/identity";
import { LEDGER_ENTRY_STATUSES, LEDGER_ENTRY_TYPES } from "@/domain/ledger";

/**
 * Drift guard.
 *
 * A Postgres enum and a TypeScript union are two separate declarations of the
 * same set. Adding a value to one and forgetting the other produces a runtime
 * insert failure in production, which is exactly the class of bug that should
 * be a failing test instead. These assertions compare them as sets.
 */

const sorted = (values: readonly string[]) => [...values].sort();

describe("Postgres enums match the domain unions", () => {
  it("booking_mode", () => {
    expect(sorted(t.bookingModeEnum.enumValues)).toEqual(sorted(BOOKING_MODES));
  });

  it("delivery_mode", () => {
    expect(sorted(t.deliveryModeEnum.enumValues)).toEqual(sorted(DELIVERY_MODES));
  });

  it("experience_category", () => {
    expect(sorted(t.experienceCategoryEnum.enumValues)).toEqual(
      sorted(EXPERIENCE_CATEGORIES)
    );
  });

  it("booking_status", () => {
    expect(sorted(t.bookingStatusEnum.enumValues)).toEqual(
      sorted(Object.keys(bookingMachine.transitions))
    );
  });

  it("incident_status", () => {
    expect(sorted(t.incidentStatusEnum.enumValues)).toEqual(
      sorted(Object.keys(incidentMachine.transitions))
    );
  });

  it("report_category", () => {
    expect(sorted(t.reportCategoryEnum.enumValues)).toEqual(
      sorted(Object.keys(REPORT_CATEGORY_LABELS))
    );
  });

  it("role", () => {
    expect(sorted(t.roleEnum.enumValues)).toEqual(sorted(ROLES));
  });

  it("ledger_entry_type", () => {
    expect(sorted(t.ledgerEntryTypeEnum.enumValues)).toEqual(
      sorted(LEDGER_ENTRY_TYPES)
    );
  });

  it("ledger_entry_status", () => {
    expect(sorted(t.ledgerEntryStatusEnum.enumValues)).toEqual(
      sorted(LEDGER_ENTRY_STATUSES)
    );
  });
});

describe("money columns", () => {
  /**
   * Money must never be stored as `numeric`, `real` or `double precision`.
   * A float column would silently undo the integer-minor-units invariant that
   * `src/domain/money.ts` enforces everywhere else.
   */
  const moneyColumns = [
    t.experiences.priceOneToOneMinor,
    t.experiences.priceGroupMinor,
    t.experiences.pricePerSeatMinor,
    t.occurrences.pricePerSeatMinor,
    t.bookings.totalPriceMinor,
    t.seats.pricePaidMinor,
    t.reviews.tipMinor,
    t.ledgerEntries.amountMinor,
  ];

  it("are all integer-typed", () => {
    for (const column of moneyColumns) {
      expect(column.getSQLType(), column.name).toBe("bigint");
    }
  });

  it("are named to make the unit obvious", () => {
    for (const column of moneyColumns) {
      expect(column.name).toMatch(/_minor$/);
    }
  });
});

describe("tenant scoping", () => {
  const tables = [
    t.users,
    t.hostProfiles,
    t.experiences,
    t.occurrences,
    t.bookings,
    t.seats,
    t.conversations,
    t.messages,
    t.reviews,
    t.incidents,
    t.riskSignals,
    t.ledgerEntries,
  ];

  it("every table carries a non-null tenant_id", () => {
    for (const table of tables) {
      const column = (table as unknown as { tenantId?: { notNull: boolean } })
        .tenantId;
      expect(column, "missing tenantId").toBeDefined();
      expect(column?.notNull).toBe(true);
    }
  });
});
