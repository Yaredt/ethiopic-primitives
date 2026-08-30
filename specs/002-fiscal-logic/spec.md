# Feature Specification: Fiscal Logic

**Feature Branch**: `002-fiscal-logic`

**Created**: 2026-08-30

**Status**: Draft (implementation to follow; acceptance gated later by an externally authored fixture)

**Input**: User description: "Fiscal logic (Layer 0, Module A §2.3) — the highest-value unbuilt piece; no open-source package implements it. Build on the already-verified calendar core (feature 001)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Which fiscal year does a date belong to? (Priority: P1)

An accountant or payroll system needs to know, for any Ethiopian date, which Ethiopian fiscal year it falls in. The fiscal year runs Hamle 1 through Sene 30 of the following Ethiopian year (8 July – 7 July Gregorian), so a calendar year and a fiscal year do not line up — a date in, say, Meskerem belongs to a fiscal year that began the previous Hamle. No open-source package computes this; the logic currently lives only inside proprietary ERPs.

**Why this priority**: Every other fiscal operation (quarter, period, aging, reporting) depends on correctly locating a date within the fiscal year. It is the foundation of the module.

**Independent Test**: For a set of dates spanning a Hamle 1 / Sene 30 boundary, confirm the fiscal-year label is stable within a fiscal year and increments exactly once at Hamle 1; confirm `fiscal_year_bounds(fy)` returns a start of Hamle 1 and an end of Sene 30 that bracket every date labelled `fy`.

**Acceptance Scenarios**:

1. **Given** a date on Hamle 1, **When** its fiscal year is requested, **Then** it is the first day of a new fiscal year (the label differs from the day before).
2. **Given** a date on Sene 30, **When** its fiscal year is requested, **Then** it is the last day of a fiscal year (the label differs from the day after).
3. **Given** Sene 30 and Hamle 1 of consecutive positions, **When** each is labelled, **Then** they fall in different fiscal years.
4. **Given** a fiscal-year label, **When** its bounds are requested, **Then** the start is a Hamle 1, the end is a Sene 30, and every date between them labels back to that same fiscal year.

---

### User Story 2 - Fiscal quarter and period, with Pagumē as a real period (Priority: P1)

A financial report groups transactions by fiscal quarter (Q1 begins Hamle 1) and by accounting period (1–13). Pagumē, the 5–6 day 13th month, is a **real accounting period** in which real transactions occur — it must be its own period, never silently folded into an adjacent one. A prior library's habit of collapsing month 13 is precisely the failure this must avoid.

**Why this priority**: Quarter and period are the primary grouping dimensions for any fiscal report; mishandling Pagumē corrupts ~1.4% of dates in a way that passes a casual check.

**Independent Test**: Walk a full fiscal year and confirm every date maps to exactly one quarter in 1–4 and exactly one period in 1–13; confirm Pagumē dates map to a distinct period that no 30-day month maps to.

**Acceptance Scenarios**:

1. **Given** any date in a fiscal year, **When** its quarter is requested, **Then** the result is an integer 1–4.
2. **Given** any date, **When** its period is requested, **Then** the result is an integer 1–13.
3. **Given** a Pagumē date, **When** its period is requested, **Then** it is a period distinct from that of any Nähase (month 12) or Sene (month 10) date — Pagumē is never merged.
4. **Given** the sequence of dates crossing a period boundary, **When** each is labelled, **Then** the period changes exactly at the boundary.

---

### User Story 3 - Aging across the Pagumē boundary (Priority: P1)

An accounts-receivable process ages invoices into buckets (0–30, 31–60, 61–90, 90+ days) as of a reporting date. Because a fiscal year contains a 5–6 day Pagumē, aging must be computed in **real elapsed days**, not by multiplying months by 30 — otherwise every bucket that straddles Pagumē is off by 5 or 6 days.

**Why this priority**: Incorrect aging directly misstates receivables and is a real financial-reporting defect; the Pagumē correction is the whole reason this belongs in a specialised module rather than a generic date library.

**Independent Test**: For invoice/as-of pairs that straddle a Pagumē, confirm the day count equals the real elapsed days (matching the calendar core's day arithmetic) and that the assigned bucket reflects those real days, not a 30-day-month approximation.

**Acceptance Scenarios**:

1. **Given** an invoice date and a later as-of date, **When** the aging bucket is computed, **Then** the day count equals the real elapsed days between them.
2. **Given** a pair whose span crosses Pagumē, **When** aging is computed, **Then** the result differs from a naive 30-day-per-month estimate by the real length of that Pagumē.
3. **Given** an as-of date earlier than the invoice date, **When** aging is computed, **Then** the operation is rejected (or defined) explicitly rather than returning a silently wrong bucket.

---

### User Story 4 - Same fiscal answers in every language (Priority: P2)

A team using the TypeScript package on the frontend and the Python package on the backend needs both to give identical fiscal answers for the same date, verified by the same shared fixtures.

**Why this priority**: Cross-language agreement is the project's core guarantee (Principle X), but it only becomes testable once the fiscal fixture exists; until then, agreement is enforced by self-consistency.

**Independent Test**: Run both language runners over the shared fiscal fixture (once provided) and confirm zero divergence on the gating set; before the fixture exists, confirm both languages produce identical results across a generated sweep of dates.

**Acceptance Scenarios**:

1. **Given** the shared fiscal fixture, **When** both language runners execute it, **Then** both report zero gating failures.
2. **Given** any date in a wide range, **When** each fiscal function is called in both languages, **Then** the results are identical.

### Edge Cases

- **Hamle 1 / Sene 30 boundary**: the fiscal-year label must change exactly at Hamle 1 and nowhere else within the year.
- **Pagumē as a period**: month 13 must be a distinct period; a 5-day (non-leap) and a 6-day (leap) Pagumē must both be handled.
- **Pagumē inside a quarter**: because 13 months do not divide evenly into 4 quarters, Pagumē's quarter assignment is a defined convention (see Assumptions), not an accident of arithmetic.
- **Aging with equal invoice and as-of date**: a span of zero days lands in the first bucket.
- **Aging backwards in time**: an as-of date before the invoice date is an explicit, defined case, not a silent negative.
- **Custom bucket thresholds**: callers may pass bucket boundaries other than 30/60/90; boundaries must be interpreted consistently (real days).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST return, for any Ethiopian date, the fiscal-year label of the fiscal year that runs Hamle 1 – Sene 30 and contains that date.
- **FR-002**: The system MUST return, for any fiscal-year label, the start date (a Hamle 1) and end date (a Sene 30) of that fiscal year, such that every date within those bounds labels back to the same fiscal year.
- **FR-003**: The system MUST return, for any Ethiopian date, its fiscal quarter as an integer 1–4, with Q1 beginning on Hamle 1.
- **FR-004**: The system MUST return, for any Ethiopian date, its accounting period as an integer 1–13, and Pagumē (month 13) MUST be represented as its own period, never merged into an adjacent period (Constitution Principle VI).
- **FR-005**: The system MUST compute aging buckets from an invoice date and an as-of date using **real elapsed days** across the Pagumē boundary (consistent with the calendar core's day arithmetic), with configurable bucket thresholds defaulting to 30/60/90.
- **FR-006**: The system MUST define explicit, non-silent behaviour when the as-of date precedes the invoice date.
- **FR-007**: All fiscal computations MUST derive from the verified calendar core (feature 001); the system MUST NOT introduce a second, independent calendar-conversion path (Constitution Principle III).
- **FR-008**: Fiscal computations MUST be deterministic and pure — identical inputs yield identical outputs with no dependence on network, ambient locale, timezone, or the system clock (Constitution Principle VIII).
- **FR-009**: Where the capability ships in more than one language, all implementations MUST expose the same fiscal surface and MUST run the identical shared fiscal fixture; divergence on the gating set is a release blocker (Constitution Principle X).
- **FR-010**: Acceptance MUST be driven exclusively by an externally authored fiscal fixture; the implementation and its automated tests MUST NOT assert any hand-authored fiscal-year, quarter, or period value (Constitution Principle I). Until that fixture exists, automated tests are limited to error contracts and self-consistency.

### Key Entities

- **Fiscal year**: an accounting year running Hamle 1 through Sene 30 of the following Ethiopian year (8 July – 7 July Gregorian), identified by an integer label.
- **Fiscal quarter**: one of four divisions of the fiscal year, numbered 1–4, with Q1 beginning Hamle 1.
- **Accounting period**: one of thirteen periods within the fiscal year, numbered 1–13, in which period 13 corresponds to Pagumē and is never merged.
- **Aging bucket**: a labelled range of real elapsed days (default 0–30, 31–60, 61–90, 90+) into which an invoice is placed as of a reporting date.
- **Fiscal vector (external, read-only)**: a provenance-tagged record pairing an input (a date, a fiscal-year label, or an invoice/as-of pair) with its expected fiscal output. Owned by the fixture, authored externally, never by the implementation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the gating fiscal vectors pass in every shipped language (once the fixture exists).
- **SC-002**: Across a day-by-day sweep of at least one full decade, every date maps to exactly one fiscal year, exactly one quarter (1–4), and exactly one period (1–13), with zero exceptions.
- **SC-003**: 100% of Pagumē dates map to a distinct period that no 30-day month maps to (Pagumē is never merged).
- **SC-004**: For every invoice/as-of pair whose span crosses a Pagumē, the computed day count equals the calendar core's real-day difference (0 discrepancies).
- **SC-005**: The TypeScript and Python implementations agree on 100% of a generated date sweep for every fiscal function, and on 100% of the gating fiscal vectors once provided.
- **SC-006**: The implementation contains zero automated tests that assert a hand-authored fiscal value (Principle I compliance verifiable by inspection).

## Assumptions

The following three conventions are **informed guesses that require validation against a Tier-1 (Ethiopian government / MoFED) source**. The externally authored `fiscal.json` will confirm or correct them; the implementation is structured so a single convention change does not ripple.

- **A1 — Fiscal-year label**: the fiscal year that begins on Hamle 1 of Ethiopian year *Y* is labelled *Y* (start-year labelling). *Alternative to validate*: labelling by the ending year (*Y+1*).
- **A2 — Period numbering**: an accounting period maps to the Ethiopian calendar month number, so Meskerem = 1 … Nähase = 12, Pagumē = 13 — which makes "period 13 is Pagumē" literally true. *Alternative to validate*: fiscal-chronological numbering from Hamle = 1, in which Pagumē would be the 3rd fiscal month.
- **A3 — Pagumē's quarter**: the twelve 30-day months form four quarters of three in fiscal-chronological order (Q1 = Hamle, Nähase, Meskerem; … Q4 = Miyazya, Ginbot, Sene), and Pagumē — which falls chronologically between Nähase and Meskerem — is assigned to Q1. *Alternative to validate*: assigning Pagumē to Q4 as a year-end sliver.

Other assumptions:

- The verified calendar core (feature 001) is the sole conversion and day-arithmetic engine; fiscal logic is pure derivation on top of it.
- MoFED (mofed.gov.et) Citizens' Budget documentation is the citable Tier-1 authority for the Hamle 1 – Sene 30 definition; it must still be added to `tests/vectors/` provenance before public release (Principle II).
- `aging_bucket` default thresholds are 30/60/90 days; callers may override them.
- Numerals, script equivalence, and calendar format/parse are separate features and out of scope here.
