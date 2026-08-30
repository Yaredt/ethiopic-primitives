# Feature Specification: Ge'ez Numerals

**Feature Branch**: `003-geez-numerals`

**Created**: 2026-08-30

**Status**: Draft (implementation to follow; acceptance gated later by an externally authored fixture)

**Input**: User description: "Ge'ez numeral conversion primitive. Bidirectional conversion between Arabic integers and Ge'ez numerals (፩ ፪ … ፻ ፼). Per Constitution Principle VII the system has no zero, no negatives, no fractions — to_geez(0) MUST raise, negative and fractional inputs MUST raise. Monetary values MUST default to Arabic numerals. Layer 0 deterministic; conformance vectors are authored external input; every language runs the same vector files."

## Clarifications

### Session 2026-08-30

- Q: What is the largest number this first release must render and parse? → A: Up to 99,999,999 (10⁸−1) — single-level ፼ myriad grouping; ፼ is not stacked (፼፼) in v1.
- Q: When a group's multiplier is exactly 1, should the leading ፩ be omitted (100 → ፻, 10,000 → ፼)? → A: Yes — omit the leading 1; canonical CLDR/Unicode form is the single canonical rendering.
- Q: Should the parser accept only the exact canonical form, or also valid non-canonical variants? → A: Canonical-only — `from_geez` accepts exactly the renderer's canonical strings; every other sequence (e.g. ፩፻) raises as malformed. Strict bijection; lenient ingestion deferred to a later explicit mode.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Render an integer as Ge'ez numerals (Priority: P1)

A document, certificate, or UI needs to display a whole number in traditional Ge'ez numerals rather than Arabic digits — for example a year on a printed calendar, a page number, or an item count in Amharic-language content. The Ge'ez system is additive-multiplicative (units ፩–፱, tens ፲–፺, hundred ፻, ten-thousand ፼) with no place-value zero, so rendering is not a per-digit substitution and must compose the symbols correctly. A shipped library today maps `0` to the glyph for one (፩); this feature must never do that.

**Why this priority**: Arabic → Ge'ez is the primary, most-requested direction and the one where the existing ecosystem is provably wrong. Every other operation depends on a correct, total rendering of the valid domain.

**Independent Test**: Over the whole supported positive-integer range, confirm every input produces a non-empty Ge'ez string built only from the defined symbol set, and confirm the round-trip (`from_geez(to_geez(n)) == n`) holds for every value — without the test asserting any specific hand-authored glyph sequence.

**Acceptance Scenarios**:

1. **Given** a positive integer within the supported range, **When** it is rendered, **Then** the result is a non-empty string composed only of Ge'ez numeral symbols.
2. **Given** any positive integer in range, **When** it is rendered and then parsed back, **Then** the parsed value equals the original integer.
3. **Given** the input `0`, **When** rendering is requested, **Then** the operation raises an explicit error and never returns ፩ or an empty string (Constitution Principle VII).

---

### User Story 2 - Parse Ge'ez numerals back to an integer (Priority: P1)

Software ingesting Amharic/Ge'ez-script text (scanned records, user input, historical documents) needs to turn a Ge'ez numeral string back into an ordinary integer for computation, sorting, or storage. Parsing must be the exact inverse of rendering across the whole supported range and must reject any string that is not the canonical rendering — including well-formed-but-non-canonical spellings such as ፩፻ — rather than guessing a value. (Tolerant ingestion of non-canonical real-world spellings is a recognized future need, deferred to a later explicit opt-in mode so the v1 core stays a strict bijection.)

**Why this priority**: Without a parser the primitive is write-only; round-trip inverse behaviour is also the strongest self-consistency guarantee available before the external fixture exists.

**Independent Test**: For every value in the supported range, confirm `to_geez` then `from_geez` returns the original; and confirm that representative malformed inputs (empty string, non-numeral characters, values outside the domain) are rejected explicitly.

**Acceptance Scenarios**:

1. **Given** a well-formed Ge'ez numeral string produced by the renderer, **When** it is parsed, **Then** the returned integer equals the value that produced it.
2. **Given** an empty string, **When** parsing is requested, **Then** the operation raises rather than returning 0 or a default.
3. **Given** a string containing a character outside the Ge'ez numeral set, **When** parsing is requested, **Then** the operation raises an explicit error identifying the input as invalid.

---

### User Story 3 - The numeral domain is closed: no zero, no negatives, no fractions (Priority: P1)

Callers may pass values the Ge'ez system cannot express — zero, negative numbers, or non-integers. Because Ge'ez has no zero symbol, no sign, and no fractional notation, every such input is outside the domain and MUST be rejected loudly. Silent coercion (mapping 0 to ፩, truncating a fraction, dropping a sign) is data corruption in a numeral system and is exactly the class of defect this feature exists to prevent.

**Why this priority**: A single silent coercion produces a document that states the wrong number with full typographic confidence; the failure is invisible until it is expensive. Enforcing the closed domain is non-negotiable (Constitution Principle VII).

**Independent Test**: Confirm that `0`, a representative negative integer, and a representative fractional/non-integer input each raise an explicit error from the renderer, and that no such input ever returns a string.

**Acceptance Scenarios**:

1. **Given** `0`, **When** rendering is requested, **Then** an explicit error is raised (never ፩, never empty).
2. **Given** a negative integer, **When** rendering is requested, **Then** an explicit error is raised.
3. **Given** a fractional or non-integer value, **When** rendering is requested, **Then** an explicit error is raised rather than rounding or truncating.
4. **Given** a monetary amount to be formatted, **When** no numeral system is explicitly chosen, **Then** the amount is emitted in Arabic numerals by default (Constitution Principle VII), and Ge'ez rendering of money occurs only on an explicit opt-in for the whole-number part.

---

### User Story 4 - Same numeral answers in every language (Priority: P2)

A team using the TypeScript package on the frontend and the Python package on the backend needs both to render and parse Ge'ez numerals identically for the same inputs, verified by the same shared fixture. Any divergence between runners is a release blocker.

**Why this priority**: Cross-language agreement is the project's core guarantee (Constitution Principle X), but it only becomes fixture-testable once the external numeral vectors exist; until then, agreement is enforced by round-trip self-consistency run in both languages.

**Independent Test**: Run both language runners over the shared numeral fixture (once provided) and confirm zero divergence on the gating set; before the fixture exists, confirm both languages produce identical results across a generated sweep of the supported range in both directions.

**Acceptance Scenarios**:

1. **Given** the shared numeral fixture, **When** both language runners execute it, **Then** both report zero gating failures.
2. **Given** any integer in the supported range, **When** it is rendered and parsed in each language, **Then** the results are identical across languages.

### Edge Cases

- **Zero**: `0` is outside the domain and must raise; it must never map to ፩ or to an empty string.
- **Negative and fractional inputs**: rejected explicitly; never signed, rounded, or truncated into the domain.
- **Range boundaries**: the smallest supported value (1) and the largest (99,999,999) both render and round-trip; a value above 99,999,999 raises rather than producing an ambiguous string (v1 does not stack ፼).
- **Multiplicative composition**: hundreds (፻) and ten-thousands (፼) act as multipliers over the preceding group, not as standalone additive digits; a multiplier of exactly 1 omits the leading ፩ (100 → ፻, 10,000 → ፼); composition and decomposition must be exact inverses across every group boundary.
- **Malformed parse input**: empty string, whitespace, Arabic digits, any non-numeral character, or a well-formed-but-non-canonical spelling (e.g. ፩፻ for 100) is rejected, not coerced.
- **Money**: currency amounts default to Arabic numerals; Ge'ez output for money is opt-in and applies only to a whole-number component (the system has no fractional notation for sub-units).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render any positive integer in the supported range **1–99,999,999** as a Ge'ez numeral string composed only of the defined Ge'ez numeral symbols (units ፩–፱, tens ፲–፺, hundred ፻, ten-thousand ፼); an input above 99,999,999 MUST raise (v1 does not stack ፼).
- **FR-002**: The system MUST parse any **canonical** Ge'ez numeral string (exactly as produced by the renderer, per FR-011) back to its integer value, such that parsing is the exact inverse of rendering across the entire supported range (strict bijection). Non-canonical spellings (e.g. ፩፻ for 100) MUST be rejected as malformed, not normalized; lenient ingestion is deferred to a later, separately-specified opt-in mode.
- **FR-003**: `to_geez(0)` MUST raise an explicit error; it MUST NOT return ፩, an empty string, or any other value (Constitution Principle VII).
- **FR-004**: Negative inputs MUST raise; the system MUST NOT emit a sign or coerce the magnitude into the domain (Constitution Principle VII).
- **FR-005**: Non-integer / fractional inputs MUST raise; the system MUST NOT round or truncate them into the domain (Constitution Principle VII).
- **FR-006**: Parsing MUST reject malformed input — including the empty string, any string containing a character outside the Ge'ez numeral set, and any well-formed-but-non-canonical spelling (e.g. ፩፻, or a value implying more than 99,999,999) — with an explicit error, never a default or best-guess value.
- **FR-007**: Monetary formatting MUST default to Arabic numerals; Ge'ez rendering of monetary values MUST require an explicit opt-in and apply only to a whole-number component (Constitution Principle VII).
- **FR-008**: All numeral operations MUST be deterministic and pure — identical inputs yield identical outputs with no dependence on network, ambient locale, timezone, or the system clock (Constitution Principle VIII).
- **FR-009**: Where the capability ships in more than one language, all implementations MUST expose the same numeral surface and MUST run the identical shared numeral fixture; divergence on the gating set is a release blocker (Constitution Principle X).
- **FR-010**: Acceptance MUST be driven exclusively by an externally authored numeral fixture; the implementation and its automated tests MUST NOT assert any hand-authored numeral value (Constitution Principle I). Until that fixture exists, automated tests are limited to error contracts and round-trip self-consistency.
- **FR-011**: Rendering MUST produce a single canonical form per integer: a group multiplier of exactly 1 omits the leading ፩ (100 → ፻, 10,000 → ፼), consistent with CLDR/Unicode. There MUST be exactly one rendered string for each in-range integer.

### Key Entities

- **Ge'ez numeral symbol**: one of the defined glyphs — units ፩ ፪ ፫ ፬ ፭ ፮ ፯ ፰ ፱, tens ፲ ፳ ፴ ፵ ፶ ፷ ፸ ፹ ፺, hundred ፻, ten-thousand ፼ — with no symbol for zero, sign, or fraction.
- **Supported integer domain**: the closed set of positive integers **1–99,999,999** the system renders and parses; zero and everything below 1 or above 99,999,999 is out of domain.
- **Numeral vector (external, read-only)**: a provenance-tagged record pairing an input (an integer, or a Ge'ez string) with its expected output. Owned by the fixture, authored externally, never by the implementation (Constitution Principle I).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the gating numeral vectors pass in every shipped language (once the fixture exists).
- **SC-002**: Across the entire supported integer range (1–99,999,999), the round-trip `from_geez(to_geez(n)) == n` holds for 100% of values, with zero exceptions, and each integer has exactly one canonical rendering (strict bijection).
- **SC-003**: `to_geez(0)`, a negative input, and a fractional input each raise in 100% of cases and return a string in 0% of cases.
- **SC-004**: 100% of malformed parse inputs in a representative invalid set are rejected explicitly; 0% return a coerced or default value.
- **SC-005**: The TypeScript and Python implementations agree on 100% of a generated sweep of the supported range in both directions, and on 100% of the gating numeral vectors once provided.
- **SC-006**: The implementation contains zero automated tests that assert a hand-authored numeral value (Principle I compliance verifiable by inspection).

## Assumptions

- **A1 — Supported range** *(clarified 2026-08-30)*: the first release supports positive integers **1 through 99,999,999** (10⁸−1). This is CLDR's single-level Ethiopic myriad range: units/tens compose within a group, ፻ (100) separates the hundreds within a myriad group, and ፼ (10,000) separates myriad groups — e.g., 83,692 → ፰፼፴፮፻፺፪. The ten-thousand symbol ፼ is **not stacked** (no ፼፼ = 10⁸) in v1; a value above 99,999,999 is out of domain and MUST raise. The implementation is structured so the bound can be raised (recursive ፼ stacking) later without reworking the group algorithm.
- **A2 — Composition of hundreds and ten-thousands** *(clarified 2026-08-30)*: ፻ (100) and ፼ (10,000) are multiplicative separators — a preceding unit/tens group multiplies them — not additive digits. When that multiplier is exactly 1, the leading ፩ is **omitted**: 100 → ፻ (not ፩፻), 10,000 → ፼ (not ፩፼). This omission yields a **single canonical rendering** per integer, and it is the exact form the renderer emits and the parser treats as canonical. Rendering and parsing are exact inverses at every group boundary.
- **A3 — Money opt-in shape**: monetary Ge'ez output, when explicitly requested, renders only the whole-number part; sub-units remain Arabic because the system has no fractional notation. The precise opt-in surface is an implementation detail settled at planning time.
- The numeral fixture (`tests/vectors/numerals.json`) does not yet exist; it is authored externally and must carry `source` provenance and a `gating` flag per Constitution Principle II before any public release. Until it exists, acceptance is limited to error contracts and round-trip self-consistency (Principle I).
- Calendar conversion, fiscal logic, and script equivalence are separate features and out of scope here; this feature is a standalone Layer 0 primitive with no dependency on the calendar core.
