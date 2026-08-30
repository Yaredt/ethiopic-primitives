/**
 * Ethiopian fiscal logic — pure derivation on top of the verified calendar core
 * (feature 001). The Ethiopian fiscal year runs Hamle 1 (month 11) through
 * Sene 30 (month 10 of the following year), per MoFED.
 *
 * No calendar conversion or day counting happens here; everything reduces to a
 * date's (year, month) or to the calendar core's `daysUntil` (Constitution
 * Principle III). Pagumē (month 13) is a first-class accounting period
 * (Principle VI). The three unverified conventions live in `fiscal-convention.ts`.
 */

import { EthiopianDate } from "./calendar.ts";
import { FiscalConvention, type Quarter } from "./fiscal-convention.ts";

/** Hamle — the first month of the fiscal year (Ethiopian calendar month 11). */
const HAMLE = 11;

/** The result of aging one invoice as of a reporting date. */
export interface AgingResult {
  /** Real elapsed days from invoice to as-of (from the calendar core). */
  days: number;
  /** 0-based bucket index; the last index (== thresholds.length) is the overflow bucket. */
  bucketIndex: number;
  /** Human label, e.g. "0-30", "31-60", "61-90", "90+" for the default thresholds. */
  label: string;
}

/** The fiscal year (label) that contains `date` (Hamle 1 – Sene 30). */
export function fiscalYearFor(date: EthiopianDate): number {
  // Months Hamle..Pagumē (11,12,13) open the fiscal year in the same calendar
  // year; months Meskerem..Sene (1..10) fall in the fiscal year that opened the
  // previous calendar year.
  const startYear = date.month >= HAMLE ? date.year : date.year - 1;
  return FiscalConvention.labelForStartYear(startYear);
}

/** Start (Hamle 1) and end (Sene 30 of the next year) of a fiscal year. */
export function fiscalYearBounds(fy: number): { start: EthiopianDate; end: EthiopianDate } {
  const startYear = FiscalConvention.startYearForLabel(fy);
  return {
    start: new EthiopianDate(startYear, HAMLE, 1),
    end: new EthiopianDate(startYear + 1, 10, 30),
  };
}

/** Fiscal quarter (1–4) of `date`; Q1 begins Hamle 1. */
export function fiscalQuarter(date: EthiopianDate): Quarter {
  return FiscalConvention.quarterOf(date.month);
}

/** Accounting period (1–13) of `date`; period 13 is Pagumē, never merged. */
export function fiscalPeriod(date: EthiopianDate): number {
  return FiscalConvention.periodOf(date.month);
}

/**
 * Age an invoice as of a reporting date, in REAL elapsed days across Pagumē.
 * `buckets` are ascending upper bounds (default 30/60/90). Returns the first
 * bucket whose bound the age does not exceed, else the overflow bucket.
 * Throws if `asOf` precedes `invoice` (a negative age is a caller error).
 */
export function agingBucket(
  invoice: EthiopianDate,
  asOf: EthiopianDate,
  buckets: number[] = [30, 60, 90],
): AgingResult {
  const days = invoice.daysUntil(asOf);
  if (days < 0) {
    throw new RangeError(`as-of date precedes invoice date (age ${days} days)`);
  }
  const sorted = [...buckets].sort((a, b) => a - b);
  let bucketIndex = sorted.findIndex((threshold) => days <= threshold);
  if (bucketIndex === -1) bucketIndex = sorted.length;
  return { days, bucketIndex, label: bucketLabel(sorted, bucketIndex) };
}

/** Build a "lo-hi" / "hi+" label for a bucket index over ascending thresholds. */
function bucketLabel(sorted: number[], index: number): string {
  if (sorted.length === 0) return "0+";
  if (index === 0) return `0-${sorted[0]}`;
  if (index >= sorted.length) return `${sorted[sorted.length - 1]! + 1}+`;
  return `${sorted[index - 1]! + 1}-${sorted[index]!}`;
}
