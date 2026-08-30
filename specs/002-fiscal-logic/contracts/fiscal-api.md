# Contract: Fiscal Public API

Language-agnostic contract for the fiscal surface. Both packages MUST satisfy it; the shared `tests/vectors/fiscal.json` (once authored) is its executable form. All inputs are feature-001 `EthiopianDate` values (or fiscal-year integers); all computation flows through the calendar core (Principle III).

## Functions

| Contract | TypeScript | Python |
|---|---|---|
| Fiscal year of a date | `fiscalYearFor(date): number` | `fiscal_year_for(date) -> int` |
| Bounds of a fiscal year | `fiscalYearBounds(fy): { start: EthiopianDate, end: EthiopianDate }` | `fiscal_year_bounds(fy) -> tuple[EthiopianDate, EthiopianDate]` |
| Fiscal quarter of a date | `fiscalQuarter(date): 1\|2\|3\|4` | `fiscal_quarter(date) -> int` |
| Accounting period of a date | `fiscalPeriod(date): number` (1–13) | `fiscal_period(date) -> int` |
| Aging bucket | `agingBucket(invoice, asOf, buckets?): AgingResult` | `aging_bucket(invoice, as_of, buckets=[30,60,90]) -> AgingResult` |

## Behavioural contract

- **`fiscalYearFor`**: returns the label (convention A1) of the Hamle 1 – Sene 30 year containing `date`. Stable within a fiscal year; increments exactly once, at Hamle 1.
- **`fiscalYearBounds`**: `start` is a Hamle 1 (month 11, day 1); `end` is a Sene 30 (month 10, day 30) of the next Ethiopian year. Every date in `[start, end]` satisfies `fiscalYearFor(d) == fy`.
- **`fiscalQuarter`**: integer 1–4, Q1 begins Hamle 1 (convention A3). Total: every date maps to exactly one quarter.
- **`fiscalPeriod`**: integer 1–13 (convention A2). Period 13 is Pagumē and is never equal to any 30-day month's period (Principle VI).
- **`agingBucket`**: `days` = real elapsed days from `invoice` to `asOf` via the calendar core (never a 30-day-month approximation). Returns the first bucket whose upper threshold `days` does not exceed, else the overflow bucket. `asOf < invoice` MUST raise.

## Conventions (unverified — see research.md; isolated in the convention layer)

- **A1** label = Ethiopian year of Hamle 1 (start-year).
- **A2** period = Ethiopian calendar month (Pagumē = 13).
- **A3** quarters = four 3-month blocks of the 30-day months; Pagumē → Q1.

Each is confirmed or corrected by a single `fiscal.json` vector; changing one MUST NOT alter the fiscal functions, only the convention layer.

## Purity & cross-language obligations

- Deterministic and pure: no network, locale, timezone, or system-clock dependence (Principle VIII).
- Both languages expose this surface and MUST agree — on a generated parity sweep now, and on the gating `fiscal.json` set once it exists (Principle X).
- No automated test may assert a hand-authored fiscal value (Principle I); interim tests cover error contracts and self-consistency only.

## Acceptance obligations

- Once `tests/vectors/fiscal.json` exists: all gating fiscal vectors pass in both languages, AND a full-decade sweep yields exactly one fiscal-year / quarter / period per date with zero exceptions.
- A green self-consistency run alone is NOT final acceptance (Principle IX applies by analogy).
