/**
 * Money — integer minor units only.
 *
 * The canonical representation is never a formatted string. `"$60"` cannot be
 * summed, split, or reconciled; 6000 minor units can. Formatting is strictly a
 * presentation concern (see `formatMoney`), and callers must pass a locale-aware
 * currency rather than assuming USD.
 */

export type Currency = string; // ISO-4217, e.g. "USD"

export type Money = {
  /** Integer minor units (cents for USD). Never a float. */
  amountMinor: number;
  currency: Currency;
};

export class CurrencyMismatchError extends Error {
  constructor(a: Currency, b: Currency) {
    super(`Cannot combine money in ${a} with money in ${b}`);
    this.name = "CurrencyMismatchError";
  }
}

export function money(amountMinor: number, currency: Currency = "USD"): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(
      `Money must be integer minor units; received ${amountMinor}. ` +
        `Use Math.round() at the boundary where a fractional value is produced.`
    );
  }
  return { amountMinor, currency };
}

export const zero = (currency: Currency = "USD"): Money => money(0, currency);

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function sum(items: readonly Money[], currency: Currency = "USD"): Money {
  return items.reduce<Money>((acc, m) => add(acc, m), zero(currency));
}

export function multiply(a: Money, factor: number): Money {
  return money(Math.round(a.amountMinor * factor), a.currency);
}

/**
 * Percentage of an amount, in basis points (1 bp = 0.01%). Basis points avoid the
 * float drift of `amount * 0.175`. Rounds half away from zero.
 */
export function percentOf(a: Money, basisPoints: number): Money {
  return money(Math.round((a.amountMinor * basisPoints) / 10_000), a.currency);
}

export function isNegative(a: Money): boolean {
  return a.amountMinor < 0;
}

export function isZero(a: Money): boolean {
  return a.amountMinor === 0;
}

export function negate(a: Money): Money {
  return money(-a.amountMinor, a.currency);
}

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amountMinor - b.amountMinor;
}

/**
 * Split an amount into `parts` shares that sum exactly to the original.
 * Remainder minor units are distributed to the earliest shares, so no cent is
 * created or lost (the classic penny-allocation problem).
 */
export function allocate(a: Money, parts: number): Money[] {
  if (parts <= 0 || !Number.isInteger(parts)) {
    throw new Error(`allocate() requires a positive integer part count; got ${parts}`);
  }
  const base = Math.trunc(a.amountMinor / parts);
  let remainder = a.amountMinor - base * parts;
  const step = remainder >= 0 ? 1 : -1;
  return Array.from({ length: parts }, () => {
    let share = base;
    if (remainder !== 0) {
      share += step;
      remainder -= step;
    }
    return money(share, a.currency);
  });
}

/** Presentation only. Never store or compare the output of this function. */
export function formatMoney(m: Money, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: 2,
  }).format(m.amountMinor / 100);
}

/** Compact form for dense UI (e.g. "$60" rather than "$60.00"). */
export function formatMoneyCompact(m: Money, locale = "en-US"): string {
  const hasCents = m.amountMinor % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(m.amountMinor / 100);
}
