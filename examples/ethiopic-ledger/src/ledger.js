// Pure ledger helpers — all Layer-0 behaviour delegated to the package (Principle III).
import {
  EthiopianDate,
  fiscalYearFor,
  fiscalQuarter,
  fiscalPeriod,
  agingBucket,
} from "../lib/index.js";
import { SEED } from "./seed.js";

let _nextId = 1;

/** Build an in-session entry. `date` is an EthiopianDate (already validated). */
export function createEntry(date, description, amount) {
  return { id: _nextId++, date, description, amount };
}

/** Construct an entry from raw parts, validating the date via the primitive (throws on invalid). */
export function entryFromEthiopian(year, month, day, description, amount) {
  return createEntry(new EthiopianDate(year, month, day), description, amount);
}

/** Construct an entry from a Gregorian date via the primitive (throws on invalid). */
export function entryFromGregorian(year, month, day, description, amount) {
  return createEntry(EthiopianDate.fromGregorian({ year, month, day }), description, amount);
}

/** Fresh copy of the seed ledger. */
export function seedEntries() {
  return SEED.map((s) => entryFromEthiopian(s.year, s.month, s.day, s.description, s.amount));
}

/** Fiscal year / quarter / period for an entry — from the fiscal primitive. */
export function fiscalTags(entry) {
  return {
    year: fiscalYearFor(entry.date),
    quarter: fiscalQuarter(entry.date),
    period: fiscalPeriod(entry.date),
  };
}

/** Real-day aging of an entry as of a date — from the fiscal primitive (may throw on backwards). */
export function ageEntry(entry, asOf) {
  return agingBucket(entry.date, asOf);
}

/** Group entries by fiscal period (1..13), preserving order; returns [{period, entries}] sorted. */
export function groupByPeriod(entries) {
  const byPeriod = new Map();
  for (const e of entries) {
    const p = fiscalPeriod(e.date);
    if (!byPeriod.has(p)) byPeriod.set(p, []);
    byPeriod.get(p).push(e);
  }
  return [...byPeriod.keys()]
    .sort((a, b) => a - b)
    .map((period) => ({ period, entries: byPeriod.get(period) }));
}
