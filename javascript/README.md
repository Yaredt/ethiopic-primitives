# @ethiopic-primitives/calendar

Deterministic Ethiopian (Ge'ez) calendar conversion for JavaScript / TypeScript.
Layer 0: pure functions, no model calls, no network, no dependence on ambient
locale, timezone, or the system clock.

This is the primary deliverable of the project: the one maintained JS calendar
option surveyed was wrong on 48.9% of days. This implementation is a port of the
verified reference algorithm and passes all 181 gating conformance vectors plus a
day-by-day 1990–2035 sweep in both directions with zero mismatches.

## Install

```bash
npm install @ethiopic-primitives/calendar
```

## Use

```ts
import { EthiopianDate, Era } from "@ethiopic-primitives/calendar";

// Gregorian -> Ethiopian
const e = EthiopianDate.fromGregorian({ year: 2007, month: 9, day: 12 });
e.toString();        // "2000-01-01"  (Mäskäräm 1, 2000)

// Ethiopian -> Gregorian (Pagumē / month 13 is first-class)
new EthiopianDate(2003, 13, 6).toGregorian();   // { year: 2011, month: 9, day: 11 }

e.isLeapYear();
e.addDays(40).toString();
e.weekday();                       // 0 = Monday .. 6 = Sunday
e.toEra(Era.AmeteAlem).year;       // 7500  (+5500 era offset)
```

## Fiscal logic

The Ethiopian fiscal year runs Hamle 1 – Sene 30 (8 July – 7 July). These derive
purely from the calendar core:

```ts
import { EthiopianDate, fiscalYearFor, fiscalYearBounds, fiscalQuarter, fiscalPeriod, agingBucket } from "@ethiopic-primitives/calendar";

const d = new EthiopianDate(2016, 1, 15);
fiscalYearFor(d);            // fiscal-year label
fiscalYearBounds(2016);      // { start: Hamle 1, end: Sene 30 of next year }
fiscalQuarter(d);            // 1..4  (Q1 begins Hamle 1)
fiscalPeriod(d);             // 1..13 (period 13 = Pagumē, never merged)
agingBucket(new EthiopianDate(2016, 12, 25), new EthiopianDate(2017, 1, 15)); // real days across Pagumē
```

**Three conventions are not yet Tier-1-verified** and live in one file,
[`src/fiscal-convention.ts`](src/fiscal-convention.ts): the fiscal-year **label**
(start-year), **period** numbering (= calendar month, Pagumē = 13), and Pagumē's
**quarter** (Q1). When an authored `tests/vectors/fiscal.json` disagrees with a
default, correct it *there only* — never in the fiscal functions.

## Ge'ez numerals

Bidirectional conversion between Arabic integers and Ge'ez numerals over
**1–99,999,999**, plus Arabic-default money. The domain is closed (Principle VII):
there is no zero, sign, or fraction, so those inputs raise rather than coerce.

```ts
import { toGeez, fromGeez, formatMoney, GeezNumeralError } from "@ethiopic-primitives/calendar";

toGeez(2017);                       // canonical Ge'ez numerals (leading-1 omitted: 100 -> hundred glyph)
fromGeez(toGeez(2017));             // 2017  — strict round-trip bijection
formatMoney(1234.5);                // "1234.50"  (Arabic by default)
formatMoney(1234.5, { numerals: "geez" }); // Ge'ez whole part + Arabic ".50"

toGeez(0);                          // throws GeezNumeralError { reason: "zero" } — never the one-glyph, never ""
```

Parsing accepts **only** the canonical rendering (`fromGeez` is the exact inverse
of `toGeez`); a valid-but-non-canonical spelling raises `reason: "non_canonical"`.
Conformance values are owned by the external `tests/vectors/numerals.json`
(Principle I), not by this code.

## Scripts

| Command | What it does |
|---|---|
| `npm run vectors` | Run all shared calendar conformance vectors (both directions) |
| `npm run sweep`   | Principle IX day-by-day sweep 1990–2035, zero tolerance |
| `npm run fiscal-vectors` | Run `tests/vectors/fiscal.json` (skips cleanly until it exists) |
| `npm run numerals-vectors` | Run `tests/vectors/numerals.json` (skips cleanly until it exists) |
| `npm run build`   | Emit `dist/` (`.js` + `.d.ts`) via `tsc` |
| `npm test`        | `node:test` wiring / contract suite (calendar + fiscal + numerals) |

The runners consume `../tests/vectors/calendar.json` — the same fixture the
Python implementation runs, so the two cannot silently drift.

## Design notes

- `Era` is a frozen const object, not a TS `enum`, so the source runs under
  Node's native type stripping (`--experimental-strip-types`) and also compiles
  under `tsc` with `rewriteRelativeImportExtensions`.
- The epoch constant (`1724221`) is trusted only because it reproduces every
  vector and the full sweep — never on its face.

Licensed MIT.
