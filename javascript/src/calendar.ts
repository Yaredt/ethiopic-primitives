/**
 * Ethiopian (Ge'ez) calendar <-> Julian Day Number, and the EthiopianDate type.
 *
 * Algorithm and constants are a direct port of the verified reference in
 * `tools/reference_ethiopic.py` (EPOCH = 1724221; leap when year % 4 == 3).
 * The epoch constant is trusted only because it reproduces every conformance
 * vector and the full 1990-2035 sweep — never on its face (spec §2.2).
 *
 * Pagumē (month 13) is first-class in every value here (Constitution Principle VI):
 * the type carries `month: 1..13` and no return path collapses it into month 12.
 */

import {
  gregorianToJdn,
  jdnToGregorian,
  jdnWeekday,
  type GregorianDate,
} from "./jdn.ts";

/** Meskerem 1, year 1 Amete Mihret, as a Julian Day Number. */
export const ETHIOPIC_EPOCH_JDN = 1724221;

/** Day offsets of years 1..4 within a leap cycle; year 3 (index 2) is the leap year. */
const CYCLE_OFFSETS = [0, 365, 730, 1096] as const;

/**
 * Ethiopian eras. Amete Alem runs 5500 years ahead of Amete Mihret (spec §2.2).
 *
 * A frozen const object rather than a TS `enum`, so the type strips cleanly at
 * runtime (Node `--experimental-strip-types`) while `Era.AmeteMihret` still works.
 */
export const Era = {
  /** Year of Mercy — the civil era in ordinary use. */
  AmeteMihret: "AMETE_MIHRET",
  /** Year of the World — the alternative liturgical era, +5500 years. */
  AmeteAlem: "AMETE_ALEM",
} as const;

/** One of the {@link Era} values. */
export type Era = (typeof Era)[keyof typeof Era];

const ALEM_OFFSET = 5500;

/** Python-style floor division; matches the reference for dates below the epoch. */
function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

/** Convert a year expressed in `era` to the internal Amete Mihret numbering. */
function toMihretYear(year: number, era: Era): number {
  return era === Era.AmeteAlem ? year - ALEM_OFFSET : year;
}

/** Convert an internal Amete Mihret year to the requested `era`. */
function fromMihretYear(mihretYear: number, era: Era): number {
  return era === Era.AmeteAlem ? mihretYear + ALEM_OFFSET : mihretYear;
}

/** True when the given Amete Mihret year is a leap year (Pagumē has 6 days). */
function isLeapMihret(mihretYear: number): boolean {
  return ((mihretYear % 4) + 4) % 4 === 3;
}

/**
 * An Ethiopian calendar date. `month` ranges 1..13; month 13 is Pagumē, a real
 * month of 5 or 6 days, never an adjustment period (Constitution Principle VI).
 *
 * Instances are immutable; every mutator returns a new instance.
 */
export class EthiopianDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly era: Era;

  constructor(year: number, month: number, day: number, era: Era = Era.AmeteMihret) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new RangeError("year, month and day must be integers");
    }
    if (month < 1 || month > 13) {
      throw new RangeError(`month must be 1..13 (13 = Pagumē), got ${month}`);
    }
    const maxDay = EthiopianDate.daysInMonth(year, month, era);
    if (day < 1 || day > maxDay) {
      throw new RangeError(
        `day must be 1..${maxDay} for month ${month} of year ${year}, got ${day}`,
      );
    }
    this.year = year;
    this.month = month;
    this.day = day;
    this.era = era;
  }

  /** Days in a given month: 30 for months 1..12, 5 or 6 for Pagumē (month 13). */
  static daysInMonth(year: number, month: number, era: Era = Era.AmeteMihret): number {
    if (month < 1 || month > 13) {
      throw new RangeError(`month must be 1..13, got ${month}`);
    }
    if (month < 13) return 30;
    return isLeapMihret(toMihretYear(year, era)) ? 6 : 5;
  }

  /** True when this date's year is an Ethiopian leap year. */
  isLeapYear(): boolean {
    return isLeapMihret(toMihretYear(this.year, this.era));
  }

  /** This date as a Julian Day Number. */
  toJdn(): number {
    const y = toMihretYear(this.year, this.era);
    return (
      ETHIOPIC_EPOCH_JDN +
      365 * (y - 1) +
      floorDiv(y, 4) +
      30 * (this.month - 1) +
      (this.day - 1)
    );
  }

  /** Build an EthiopianDate from a Julian Day Number, in the requested era. */
  static fromJdn(jdn: number, era: Era = Era.AmeteMihret): EthiopianDate {
    if (!Number.isInteger(jdn)) {
      throw new RangeError(`jdn must be an integer, got ${jdn}`);
    }
    const n = jdn - ETHIOPIC_EPOCH_JDN;
    const cycle = floorDiv(n, 1461);
    const r = n - 1461 * cycle;
    let i = 0;
    for (let k = 0; k < 4; k++) {
      if (CYCLE_OFFSETS[k]! <= r) i = k;
    }
    const doy = r - CYCLE_OFFSETS[i]!;
    const mihretYear = 4 * cycle + i + 1;
    const month = floorDiv(doy, 30) + 1;
    const day = (doy % 30) + 1;
    return new EthiopianDate(fromMihretYear(mihretYear, era), month, day, era);
  }

  /** This date as a proleptic Gregorian calendar date. */
  toGregorian(): GregorianDate {
    return jdnToGregorian(this.toJdn());
  }

  /** Convert a proleptic Gregorian date to Ethiopian, in the requested era. */
  static fromGregorian(
    d: GregorianDate,
    era: Era = Era.AmeteMihret,
  ): EthiopianDate {
    return EthiopianDate.fromJdn(gregorianToJdn(d.year, d.month, d.day), era);
  }

  /** A new date `n` real days later (or earlier, for negative `n`). */
  addDays(n: number): EthiopianDate {
    if (!Number.isInteger(n)) {
      throw new RangeError(`n must be an integer, got ${n}`);
    }
    return EthiopianDate.fromJdn(this.toJdn() + n, this.era);
  }

  /**
   * A new date `n` months later, clamping the day into the target month.
   * Adding a month to Meskerem 30 lands on the last day of Teqemt; adding to a
   * 30-day month that lands on Pagumē clamps to Pagumē 5 or 6 (spec §2.4).
   */
  addMonths(n: number): EthiopianDate {
    if (!Number.isInteger(n)) {
      throw new RangeError(`n must be an integer, got ${n}`);
    }
    const zeroBased = (this.month - 1) + n;
    const yearDelta = floorDiv(zeroBased, 13);
    const month = ((zeroBased % 13) + 13) % 13 + 1;
    const year = this.year + yearDelta;
    const day = Math.min(this.day, EthiopianDate.daysInMonth(year, month, this.era));
    return new EthiopianDate(year, month, day, this.era);
  }

  /** Whole days from this date to `other` (`other - this`). */
  daysUntil(other: EthiopianDate): number {
    return other.toJdn() - this.toJdn();
  }

  /** Day of week: 0 = Monday .. 6 = Sunday (ISO-8601). */
  weekday(): number {
    return jdnWeekday(this.toJdn());
  }

  /** This date in the other era, same instant. */
  toEra(era: Era): EthiopianDate {
    return era === this.era ? this : EthiopianDate.fromJdn(this.toJdn(), era);
  }

  /** ISO-like `YYYY-MM-DD` in the date's own era (year may exceed 4 digits for Amete Alem). */
  toString(): string {
    const mm = String(this.month).padStart(2, "0");
    const dd = String(this.day).padStart(2, "0");
    return `${this.year}-${mm}-${dd}`;
  }
}
