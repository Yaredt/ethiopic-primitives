/**
 * Julian Day Number <-> proleptic Gregorian calendar.
 *
 * Standard integer algorithm (Fliegel & Van Flandern lineage), matching the
 * verified reference implementation in `tools/reference_ethiopic.py`. All math
 * is integer; no Date object, no timezone, no locale (Constitution Principle VIII).
 */

/** A proleptic Gregorian calendar date as a plain {year, month, day} triple. */
export interface GregorianDate {
  /** Astronomical year numbering: 1 CE = 1, 1 BCE = 0, 2 BCE = -1. */
  year: number;
  /** 1..12 */
  month: number;
  /** 1..31 */
  day: number;
}

function assertInt(name: string, v: number): void {
  if (!Number.isInteger(v)) {
    throw new RangeError(`${name} must be an integer, got ${v}`);
  }
}

/** Gregorian (proleptic) -> Julian Day Number. */
export function gregorianToJdn(year: number, month: number, day: number): number {
  assertInt("year", year);
  assertInt("month", month);
  assertInt("day", day);
  if (month < 1 || month > 12) {
    throw new RangeError(`month must be 1..12, got ${month}`);
  }
  const a = Math.floor((14 - month) / 12);
  const yy = year + 4800 - a;
  const mm = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

/** Julian Day Number -> Gregorian (proleptic). */
export function jdnToGregorian(jdn: number): GregorianDate {
  assertInt("jdn", jdn);
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    year: 100 * b + d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

/**
 * Day of week for a JDN. 0 = Monday .. 6 = Sunday (ISO-8601 order).
 * JDN 0 is a Monday, so `jdn mod 7` gives the ISO weekday directly.
 */
export function jdnWeekday(jdn: number): number {
  return ((jdn % 7) + 7) % 7;
}
