import { describe, expect, it } from "vitest";
import {
  add,
  allocate,
  CurrencyMismatchError,
  formatMoneyCompact,
  money,
  multiply,
  percentOf,
  subtract,
  sum,
  zero,
} from "./money";

describe("money construction", () => {
  it("rejects non-integer minor units", () => {
    expect(() => money(10.5)).toThrow(/integer minor units/);
  });

  it("accepts negative integers for debits", () => {
    expect(money(-500).amountMinor).toBe(-500);
  });
});

describe("arithmetic", () => {
  it("adds and subtracts", () => {
    expect(add(money(1000), money(250)).amountMinor).toBe(1250);
    expect(subtract(money(1000), money(250)).amountMinor).toBe(750);
  });

  it("refuses to mix currencies", () => {
    expect(() => add(money(100, "USD"), money(100, "EUR"))).toThrow(
      CurrencyMismatchError
    );
  });

  it("sums a list", () => {
    expect(sum([money(100), money(250), money(75)]).amountMinor).toBe(425);
  });

  it("sums an empty list to zero", () => {
    expect(sum([]).amountMinor).toBe(0);
    expect(zero("EUR").currency).toBe("EUR");
  });

  it("multiplies and rounds to whole minor units", () => {
    expect(multiply(money(333), 3).amountMinor).toBe(999);
    expect(multiply(money(101), 0.5).amountMinor).toBe(51);
  });
});

describe("percentOf — basis points avoid float drift", () => {
  it("computes a 70% share exactly", () => {
    expect(percentOf(money(6000), 7000).amountMinor).toBe(4200);
  });

  it("computes 17.5% without floating error", () => {
    expect(percentOf(money(10_000), 1750).amountMinor).toBe(1750);
  });

  it("rounds half away from zero", () => {
    // 1234 * 15% = 185.1 → 185
    expect(percentOf(money(1234), 1500).amountMinor).toBe(185);
  });
});

describe("allocate — no cent created or lost", () => {
  it("splits evenly when divisible", () => {
    const parts = allocate(money(900), 3);
    expect(parts.map((p) => p.amountMinor)).toEqual([300, 300, 300]);
  });

  it("distributes the remainder to the earliest shares", () => {
    const parts = allocate(money(1000), 3);
    expect(parts.map((p) => p.amountMinor)).toEqual([334, 333, 333]);
    expect(sum(parts).amountMinor).toBe(1000);
  });

  it("handles negative amounts without losing a unit", () => {
    const parts = allocate(money(-1000), 3);
    expect(sum(parts).amountMinor).toBe(-1000);
  });

  it("rejects an invalid part count", () => {
    expect(() => allocate(money(100), 0)).toThrow();
    expect(() => allocate(money(100), 2.5)).toThrow();
  });
});

describe("formatting is presentation-only", () => {
  it("omits cents when the amount is whole", () => {
    expect(formatMoneyCompact(money(6000))).toBe("$60");
  });

  it("shows cents when present", () => {
    expect(formatMoneyCompact(money(6050))).toBe("$60.50");
  });
});
