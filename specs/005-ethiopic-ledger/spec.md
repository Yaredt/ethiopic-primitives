# Feature Specification: Ethiopic Ledger (Layer-0 demo & integration harness)

**Feature Branch**: `005-ethiopic-ledger`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "An in-repo, offline single-page demo web app — the 'Ethiopic Ledger' — that exercises all four Layer-0 primitives (calendar, fiscal, numerals, script-equivalence) together as an integration harness, an adoption demo, and a reference for how to consume the published packages. Demo consumer, not part of the Layer-0 library: imports the built package, reimplements no primitive (Principle III), stays offline/deterministic (Principle VIII), asserts no hand-authored values (Principle I). Ledger of dated, described, money-valued records exercising calendar conversion, fiscal tagging, Ge'ez-numeral display, homophone search with offset-map highlighting, and Pagumē-crossing aging. Static client-side; deployable to GitHub Pages via CI."

## Scope & Constitution Note *(mandatory context)*

This feature is a **demo consumer**, not a Layer-0 primitive. It **imports** the built `@ethiopic-primitives` package and **reimplements no conversion, fiscal, numeral, or folding logic** (Constitution Principle III). It performs **no network, backend, model, or persistence** calls and does not depend on ambient locale, timezone, or the system clock for a computed result (Principle VIII) — the only clock use permitted is offering "today" as a convenience default the user can change. It **asserts no hand-authored** calendar, fiscal, numeral, or folding values anywhere (Principle I); it only **displays** what the primitives return. The constitution's "Layer 0 only" library scope is unchanged: this app ships as an `examples/` demo, never on the published package surface, and never gates a Layer-0 release.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See any date in both calendars, Pagumē-safe (Priority: P1)

A person recording a transaction enters its date in either the Gregorian or the Ethiopian calendar and immediately sees the equivalent in the other, including dates in Pagumē (the 5–6 day 13th month). The conversion is performed entirely by the calendar primitive; the app never computes a conversion itself.

**Why this priority**: Date entry is the entry point of every ledger record and the most-used calendar seam; if month 13 breaks here, nothing downstream is trustworthy. It is the smallest slice that delivers visible value.

**Independent Test**: Enter a set of dates including at least one in Pagumē (month 13) and one on either side of a new-year boundary; confirm each shows a corresponding date in the other calendar and that a month-13 date is displayed as such rather than rejected or coerced.

**Acceptance Scenarios**:

1. **Given** a Gregorian date, **When** it is entered, **Then** the app shows the Ethiopian equivalent produced by the calendar primitive, month 13 included.
2. **Given** an Ethiopian date in Pagumē (month 13), **When** it is entered, **Then** the app displays it without error and shows its Gregorian equivalent.
3. **Given** a date the primitive rejects as invalid, **When** it is entered, **Then** the app surfaces the primitive's error to the user rather than showing a wrong or blank result.

---

### User Story 2 - Each entry is tagged with its fiscal year, quarter, and period (Priority: P1)

Every ledger entry is automatically labelled with the Ethiopian fiscal year, fiscal quarter, and accounting period it belongs to (Hamle 1 – Sene 30), with Pagumē appearing as a distinct period 13, never merged into an adjacent period. All tags come from the fiscal primitive.

**Why this priority**: Fiscal grouping is the ledger's primary organizing dimension and the clearest demonstration of the fiscal module and its Pagumē handling.

**Independent Test**: Add entries spanning a Hamle-1 boundary and at least one Pagumē date; confirm the fiscal-year label increments exactly at Hamle 1, quarters read 1–4, periods read 1–13, and the Pagumē entry shows period 13 distinct from any 30-day month's period.

**Acceptance Scenarios**:

1. **Given** an entry's Ethiopian date, **When** it is listed, **Then** it shows a fiscal year, a quarter (1–4), and a period (1–13) from the fiscal primitive.
2. **Given** an entry dated in Pagumē, **When** its period is shown, **Then** it is period 13, visibly distinct from any 30-day month's period.
3. **Given** entries grouped by fiscal period, **When** the ledger is viewed grouped, **Then** each entry appears under exactly one period.

---

### User Story 3 - Ge'ez numerals for counts and fiscal years; money stays Arabic (Priority: P2)

The user can toggle a "Ge'ez numerals" display mode that renders whole-number counts and fiscal-year labels in Ge'ez numerals, while monetary amounts remain in Arabic numerals by default. The numeral primitive performs all rendering; a count of zero is shown as Arabic "0" and `to_geez` is never handed 0.

**Why this priority**: It showcases the numeral module and its domain rules (Arabic-default money, no zero) but is a display enhancement layered on the ledger, not a prerequisite for it.

**Independent Test**: Toggle Ge'ez mode with a ledger that includes an empty group (count 0) and several fiscal years; confirm counts and fiscal years render in Ge'ez, money stays Arabic, and the zero count shows as Arabic "0" with no error.

**Acceptance Scenarios**:

1. **Given** Ge'ez numeral mode is on, **When** counts and fiscal years are shown, **Then** they render in Ge'ez numerals via the numeral primitive.
2. **Given** Ge'ez numeral mode is on, **When** a monetary amount is shown, **Then** it remains in Arabic numerals by default.
3. **Given** a group whose count is 0, **When** it is displayed in Ge'ez mode, **Then** it shows Arabic "0" and the app does not call the numeral renderer with 0.

---

### User Story 4 - Search descriptions with homophone folding, highlighted in the raw text (Priority: P1)

The user searches entry descriptions and matches are found even when the query and the stored description use different but interchangeable Ge'ez homophone spellings. A scheme toggle (`H_ONLY` / `HSL`) and a language selector control folding: Amharic folds; Tigrinya folds only after the user turns on an explicit "allow lossy Tigrinya folding" acknowledgement; Ge'ez cannot fold and the app offers only non-lossy exact matching for it. Matches are highlighted in the **raw, unmodified** description using the offset map, never in a folded rewrite.

**Why this priority**: This is the headline demonstration of the equivalence module and the one seam — folding plus offset-map projection over real Amharic text — that unit tests cannot show. It is core to the app's purpose.

**Independent Test**: Store descriptions containing homophone variants; search with a query using a different variant under `HSL`/Amharic and confirm the entry matches and the matching span is highlighted in the original text; switch to Ge'ez and confirm folding is unavailable and only exact matches are offered; select Tigrinya without acknowledgement and confirm folding is blocked until acknowledged.

**Acceptance Scenarios**:

1. **Given** an entry whose description differs from the query only by interchangeable homophones, **When** the user searches under a folding scheme and a foldable language, **Then** the entry matches and the corresponding span is highlighted in the raw description.
2. **Given** the language is set to Ge'ez, **When** the user attempts a folded search, **Then** the app does not fold (the primitive refuses) and offers non-lossy exact matching instead, with a clear message.
3. **Given** the language is Tigrinya and the lossy acknowledgement is off, **When** the user attempts a folded search, **Then** folding is blocked and the app explains that Tigrinya folding requires explicit acknowledgement; turning it on enables the folded search.
4. **Given** any search, **When** results are shown, **Then** the stored descriptions remain unmodified (folding is used only to match and locate, never to replace the source).

---

### User Story 5 - Age receivables across the Pagumē boundary (Priority: P2)

The user picks an "as-of" date and sees each outstanding entry placed into an aging bucket computed in **real elapsed days** across the Pagumē boundary, using the fiscal primitive's aging. Buckets reflect real days, not a 30-day-per-month approximation.

**Why this priority**: It demonstrates the calendar↔fiscal seam (real-day aging across a variable-length 13th month) but is a secondary panel rather than the core ledger.

**Independent Test**: With entries straddling a Pagumē, choose an as-of date and confirm each entry's day count equals the calendar primitive's real-day difference and the bucket reflects those real days; confirm an as-of date earlier than an entry is handled explicitly, not shown as a silently wrong bucket.

**Acceptance Scenarios**:

1. **Given** an as-of date, **When** aging is computed, **Then** each entry's day count and bucket come from the fiscal primitive's real-day aging.
2. **Given** an entry whose span crosses Pagumē, **When** it is aged, **Then** the day count reflects the real Pagumē length, not a 30-day-month estimate.
3. **Given** an as-of date earlier than an entry's date, **When** aging is computed, **Then** the app surfaces the primitive's defined behaviour rather than a silently wrong bucket.

### Edge Cases

- **Month 13 everywhere**: a Pagumē date must display, tag (period 13), render (Ge'ez), search, and age without error — the app must never present a type or view that cannot express month 13.
- **Empty ledger / empty search**: an empty ledger and a search with no matches show a clear empty state, not an error.
- **Primitive errors surfaced, not swallowed**: any error a primitive raises (invalid date, `to_geez(0)`, `geez_not_foldable`, `tigrinya_requires_ack`) is shown to the user as a clear message; the app never hides it or fabricates a result.
- **Raw text immutability**: stored descriptions are never overwritten with a folded form; highlighting operates on the original via the offset map.
- **Offline / no clock dependence**: the app functions with no network; "today" is only an editable default, never baked into a stored or computed result.
- **Mixed scripts in one description**: descriptions mixing Ge'ez script, Latin, digits, and punctuation search and highlight correctly (non-fidäl characters pass through folding unchanged).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST convert between Gregorian and Ethiopian dates in both directions using the calendar primitive only, correctly displaying month 13 (Pagumē), and MUST NOT compute any conversion itself (Principle III).
- **FR-002**: The app MUST tag each entry with a fiscal year, quarter (1–4), and period (1–13) obtained from the fiscal primitive, showing Pagumē as a distinct period 13 (Principle VI).
- **FR-003**: The app MUST offer a Ge'ez-numeral display mode that renders counts and fiscal-year labels via the numeral primitive while keeping monetary amounts in Arabic by default, and MUST NOT invoke the numeral renderer with 0 (Principle VII).
- **FR-004**: The app MUST search descriptions using the equivalence primitive's folding, with an explicit scheme (`H_ONLY`/`HSL`) and language selection; Ge'ez MUST NOT fold (exact matching offered instead) and Tigrinya folding MUST require an explicit user acknowledgement (Principle IV).
- **FR-005**: The app MUST highlight search matches in the raw, unmodified description using the offset map, and MUST NOT store or display a folded rewrite of any description (Principle V).
- **FR-006**: The app MUST age entries as of a user-chosen date using the fiscal primitive's real-day aging across the Pagumē boundary, and MUST surface the primitive's defined behaviour when the as-of date precedes an entry.
- **FR-007**: The app MUST surface any error raised by a primitive as a clear user-facing message and MUST NOT swallow it or fabricate a result in its place.
- **FR-008**: The app MUST run entirely client-side from static files with no network, backend, model, or persistence, and MUST NOT depend on ambient locale, timezone, or the system clock for any computed result (Principle VIII); "today" MAY be offered only as an editable default.
- **FR-009**: The app MUST consume the built `@ethiopic-primitives` package as its single source of Layer-0 behaviour and MUST NOT reimplement any calendar, fiscal, numeral, or folding logic (Principle III).
- **FR-010**: The app's own automated checks MUST NOT assert any hand-authored calendar, fiscal, numeral, or folding value (Principle I); they may assert UI wiring, state transitions, error surfacing, and that a rendered value equals what the primitive returned for the same input.
- **FR-011**: The app MUST be deployable as static files to a public static host (e.g. GitHub Pages) via CI, and MUST ship under `examples/` as a demo, never on the published package surface.

### Key Entities

- **Ledger entry**: a demo record with a date (enterable in either calendar), a free-text description (may contain Ge'ez script), and a monetary amount. Held only in memory for the session (no persistence).
- **Calendar view of an entry**: the entry's date shown in both calendars, month-13-capable, produced by the calendar primitive.
- **Fiscal tags**: the fiscal year, quarter, and period (1–13) of an entry, from the fiscal primitive.
- **Display mode**: a user toggle selecting Arabic or Ge'ez rendering for counts/fiscal years (money stays Arabic), backed by the numeral primitive.
- **Search state**: the current query, selected language, selected scheme, and Tigrinya lossy-acknowledgement flag, driving the equivalence primitive.
- **Aging view**: an as-of date plus each entry's real-day count and bucket, from the fiscal primitive.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the four Layer-0 modules (calendar, fiscal, numerals, equivalence) are exercised by at least one interactive control in the running app.
- **SC-002**: A user can add an entry and see its dual-calendar dates and fiscal tags in under 30 seconds, with month-13 dates handled with zero errors.
- **SC-003**: For a description/query pair differing only by interchangeable homophones, a folded search returns the entry and highlights the match in the raw text in 100% of the demo's prepared cases.
- **SC-004**: Ge'ez-numeral mode renders counts and fiscal years in Ge'ez while keeping 100% of monetary amounts in Arabic, with 0 calls to the numeral renderer for a zero count.
- **SC-005**: Every primitive error path reachable from the UI (invalid date, Ge'ez fold, unacknowledged Tigrinya fold, backwards aging) shows a clear message in 100% of cases and never a blank or fabricated result.
- **SC-006**: The app loads and runs with the network disabled (0 network requests) and produces identical results regardless of the machine's timezone or locale.
- **SC-007**: The app contains 0 lines that reimplement a Layer-0 conversion/fiscal/numeral/folding rule and 0 automated assertions of a hand-authored Layer-0 value (verifiable by inspection).
- **SC-008**: The static build deploys successfully to the public host via CI, reachable at a public URL.

## Assumptions

- The app is a **demo/example**, explicitly out of the constitution's Layer-0 library scope; it is a consumer that imports the primitives. It never gates a Layer-0 release and adds nothing to the published package surface.
- Entries live in memory for the session only; no persistence, accounts, or backend (out of scope). A small set of seed entries (including a Pagumē date and homophone-variant descriptions) is provided so the demo is meaningful on first load.
- Seed descriptions containing Ge'ez script are illustrative content, not conformance vectors; the app asserts no folded/collated result as truth (Principle I) — correctness of the primitives remains the job of their external fixtures.
- "Today" is offered as an editable default only; no computed or stored result depends on the clock (Principle VIII).
- The public host is GitHub Pages via CI, consistent with the already-public repository; any equivalent static host is acceptable.
- The numeral display mode applies to counts and fiscal-year labels; monetary formatting stays Arabic by default per Principle VII (a per-amount opt-in to Ge'ez is out of scope for the demo).
- **Settled (2026-08-31, in lieu of formal clarify — minor points):** (a) search highlights **all** matching spans within a description, not just the first; (b) the app loads a **fixed seed set** on start and supports adding/removing entries in-session plus a "reset to seed" action (still no persistence across reloads).
