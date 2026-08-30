# Feature Specification: Calendar Correctness Core

**Feature Branch**: `001-calendar-core`

**Created**: 2026-08-30

**Status**: Implemented (backfill — this spec documents a feature that already exists and passes)

**Input**: User description: "Calendar correctness core (Layer 0, Module A). Deterministic Ethiopian <-> Gregorian calendar conversion, already implemented in this repo, that must be captured as a formal spec."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct Ethiopian ↔ Gregorian conversion, both directions (Priority: P1)

A developer building software for an Ethiopian context needs to convert dates between the Ethiopian and Gregorian calendars and trust every result — not just today's date. The maintained JavaScript option in the ecosystem is wrong on 48.9% of days while still converting the current date correctly, so "it works when I tried it" is not evidence.

**Why this priority**: This is the foundation. Fiscal logic, aging, and every downstream feature sit on top of correct conversion. If conversion is wrong, everything above it is wrong in ways that pass a smoke test.

**Independent Test**: Drive every authored conformance vector through the implementation in both directions and confirm all gating vectors agree; independently walk every day across 1990–2035 both directions and confirm zero mismatches and zero exceptions.

**Acceptance Scenarios**:

1. **Given** a Gregorian date within the supported range, **When** it is converted to Ethiopian, **Then** the result matches the authored vector for that date.
2. **Given** an Ethiopian date within the supported range, **When** it is converted to Gregorian, **Then** the result matches the authored vector for that date.
3. **Given** every calendar day from 1990 to 2035, **When** each is round-tripped through the other calendar and back, **Then** it returns to its original value with no exceptions.

---

### User Story 2 - Pagumē (month 13) is never lost (Priority: P1)

A user works with dates in Pagumē, the 13th Ethiopian month of 5 or 6 days (~1.4% of all dates, concentrated in early September). A prior library returns a type that cannot represent a 13th month and therefore raises on every Pagumē day.

**Why this priority**: Silent or crashing failure on ~1.4% of dates is a latent production bug. Pagumē must be a first-class value everywhere, not a special case bolted on by callers.

**Independent Test**: Construct and convert dates in month 13 for both leap (6-day) and non-leap (5-day) years and confirm they are legal values that convert without error, as asserted by the Pagumē vectors.

**Acceptance Scenarios**:

1. **Given** a leap year, **When** a date of Pagumē 6 is converted to Gregorian, **Then** it succeeds and matches its vector.
2. **Given** a non-leap year, **When** a date of Pagumē 6 is constructed, **Then** it is rejected as invalid; Pagumē 5 is accepted.

---

### User Story 3 - The same fixtures verify every language (Priority: P1)

A team adopting the library in both a TypeScript frontend and a Python backend needs a guarantee the two agree. Historically, independent implementations across languages silently disagree because each carries its own epoch constant and no shared tests exist.

**Why this priority**: Cross-language agreement is the project's core value proposition and a release blocker. Divergence between runners is not a "known issue."

**Independent Test**: Run the TypeScript runner and the Python runner over the identical shared JSON fixture and confirm both report zero gating-vector failures.

**Acceptance Scenarios**:

1. **Given** the shared vector file, **When** both language runners execute it, **Then** both report zero gating failures.
2. **Given** a change that would make one language disagree with the fixtures, **When** the cross-language harness runs, **Then** it fails the build.

---

### User Story 4 - Everyday date operations (Priority: P2)

A developer needs the ordinary operations around a date: add or subtract days, add months without corrupting the result at the Pagumē boundary, ask for the weekday, ask whether the year is a leap year, and work in either the Amete Mihret (civil) or Amete Alem (liturgical) era.

**Why this priority**: These make the type usable in real applications, but they build on the P1 conversion core and are only meaningful once it is correct.

**Independent Test**: Exercise the operations for self-consistency (e.g., adding N days then −N days returns the original; era conversion preserves the underlying instant) without asserting any hand-authored calendar value.

**Acceptance Scenarios**:

1. **Given** any date, **When** N days are added and then subtracted, **Then** the original date is returned.
2. **Given** a date near the end of a 30-day month, **When** a month is added such that the target is Pagumē, **Then** the day clamps into Pagumē's real length rather than overflowing.
3. **Given** a date in one era, **When** it is expressed in the other era, **Then** the underlying instant is unchanged.

### Edge Cases

- **Pagumē length by year**: month 13 has 6 days only when the Ethiopian year satisfies the leap rule; otherwise 5. Day 6 in a non-leap year is invalid input, not a silent coercion.
- **Year-boundary drift**: Ethiopian New Year lands on 11 or 12 September depending on the following year's leap status; conversion must not derive one calendar's leap rule from the other's.
- **Epoch boundary**: the epoch vector (Ethiopian year 1) is a non-gating corroboration point. The Python path (a wrapped third-party dependency) does not support years below ~8 and rejects it; the TypeScript path handles it. This divergence exists only outside the gating range and is documented, not hidden.
- **Invalid input**: month outside 1–13, day outside a month's real length, and non-integer components are rejected with an error, never coerced.
- **Ambiguous two-digit years**: never guessed (deferred to the format/parse feature, out of scope here).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST convert a Gregorian date to the Ethiopian calendar and an Ethiopian date to the Gregorian calendar, in both directions, for all dates within the supported range.
- **FR-002**: The system MUST represent the 13th month (Pagumē) as a first-class value in every date type, serialization, and return value; no return type may be incapable of expressing month 13.
- **FR-003**: The system MUST treat Pagumē as having 6 days exactly when the Ethiopian year satisfies the leap rule and 5 days otherwise, and MUST reject Pagumē 6 in a non-leap year.
- **FR-004**: The system MUST support both the Amete Mihret and Amete Alem eras, which differ by a fixed 5,500-year offset, and MUST preserve the underlying instant when converting a date between eras.
- **FR-005**: The system MUST provide day arithmetic (add/subtract a number of days), a whole-day difference between two dates computed in real days across the Pagumē boundary, a weekday accessor, and a leap-year predicate.
- **FR-006**: The system MUST provide month arithmetic that clamps the resulting day into the target month's real length rather than overflowing.
- **FR-007**: The system MUST reject invalid input (out-of-range month or day, non-integer components) with an error rather than returning a coerced or wrong value.
- **FR-008**: The system MUST be deterministic and pure: identical inputs produce identical outputs with no dependence on network, ambient locale, timezone, or the system clock.
- **FR-009**: Acceptance MUST be driven exclusively by externally authored conformance vectors; the implementation and its automated tests MUST NOT assert any hand-authored date-conversion result. (Constitution Principle I.)
- **FR-010**: All gating conformance vectors (181) MUST pass, AND a day-by-day sweep across at least 1990–2035 in both directions MUST complete with zero mismatches and zero exceptions. A passing vector run alone is NOT acceptance. (Constitution Principle IX.)
- **FR-011**: Where the capability ships in more than one language, all implementations MUST run the identical shared vector file and MUST agree on the gating set; divergence on the gating set is a release blocker. (Constitution Principle X.)
- **FR-012**: Any conversion capability already available in a verified external package MUST be depended upon rather than reimplemented, absent new measured evidence of failure. (Constitution Principle III — the Python calendar path wraps a dependency that passed 16,801/16,801 days.)

### Key Entities

- **Ethiopian date**: a calendar date in the Ethiopian system — year, month (1–13, where 13 is Pagumē), day (1–30, or 1–5/6 for Pagumē), and era (Amete Mihret or Amete Alem). Immutable; every operation yields a new value.
- **Gregorian date**: a proleptic Gregorian calendar date — year, month (1–12), day — used as the interchange form on the Gregorian side.
- **Conformance vector**: an externally authored, provenance-tagged pairing of one Ethiopian date and one Gregorian date, marked gating or non-gating. Read-only; the single source of truth for correctness.
- **Era**: the counting system for the year — Amete Mihret (civil) or Amete Alem (liturgical, +5,500 years).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 181 gating conformance vectors pass in every shipped language.
- **SC-002**: A day-by-day sweep across 1990–2035 in both directions completes with 0 mismatches and 0 exceptions.
- **SC-003**: The TypeScript and Python implementations agree on 100% of the gating set when run against the identical shared fixture.
- **SC-004**: 100% of Pagumē (month-13) dates within the supported range convert without error and without being collapsed into month 12.
- **SC-005**: Invalid inputs (out-of-range month/day, non-integer components) are rejected 100% of the time rather than returning a coerced value.
- **SC-006**: The implementation contains zero automated tests that assert a hand-authored conversion result (Principle I compliance is verifiable by inspection).

## Assumptions

- The authored conformance vectors under `tests/vectors/` are correct and are the sole acceptance authority; this feature satisfies them and never modifies them.
- The supported gating range is Ethiopian years ≥ 1996 (Gregorian ≥ 2003), matching the gating vectors; the wider 1990–2035 sweep is the zero-tolerance range. The epoch (Ethiopian year 1) is a non-gating corroboration point only.
- The verified external Python package (`py-ethiopian-date-converter`, which passed 16,801/16,801 days in the prior-art survey) is available as a dependency and is wrapped, not reimplemented.
- Formatting and parsing of date strings (Ge'ez script names, transliterations, numeral forms, two-digit-year pivots) are a separate later feature and are out of scope here.
- Fiscal logic, Ge'ez numerals, and the script-equivalence engine are separate later features and are out of scope here.
- A public release is still blocked by Constitution Principle II until a Tier-1 (Ethiopian government) provenance source is added; that gate is tracked outside this feature.
