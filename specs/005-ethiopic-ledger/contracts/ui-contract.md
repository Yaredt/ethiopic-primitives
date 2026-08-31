# Contract: Ethiopic Ledger — panels ↔ primitive calls

The app's "contract" is its **consumption surface**: which primitive each panel calls. Every Layer-0 computation below is delegated to `@ethiopic-primitives` (imported from `../lib/index.js`); the app reimplements none of it (Principle III). No panel asserts a hand-authored Layer-0 value (Principle I).

## Panel A — Date entry (US1)

- **Input**: a date in Gregorian or Ethiopian.
- **Calls**: `EthiopianDate.fromGregorian(...)` / `new EthiopianDate(y, m, d)` and `.toGregorian()`; construction throws on an invalid date.
- **Shows**: both calendar forms, month 13 included.
- **Errors**: an invalid date shows the primitive's thrown error (FR-007); nothing is stored.

## Panel B — Ledger list with fiscal tags (US2)

- **Calls**: `fiscalYearFor(date)`, `fiscalQuarter(date)`, `fiscalPeriod(date)` per entry.
- **Shows**: each entry with FY, quarter (1–4), period (1–13); Pagumē entries show period 13 distinct from any 30-day month.
- **Grouping**: entries may be grouped by period; each appears under exactly one.

## Panel C — Numeral display toggle (US3)

- **Calls**: `toGeez(n)` for counts and fiscal-year labels when Ge'ez mode is on; `formatMoney(amount)` (Arabic default) for amounts.
- **Rule**: a zero count renders Arabic `"0"` — `toGeez` is **never** called with 0 (guarded in `format.js`).
- **Errors**: any `GeezNumeralError` is surfaced, not hidden.

## Panel D — Homophone search (US4)

- **Calls**:
  - Foldable languages: `fold(query, language, scheme, { acknowledgeLossy })` and `fold(description, …)`; locate the folded query in the folded description; map folded index range → raw spans via `FoldResult.offsets`.
  - `GE_EZ`: folding unavailable — use `equal(query, description, GE_EZ)` semantics for exact matching and explain that Ge'ez does not fold.
  - `TIGRINYA` without acknowledgement: attempting a fold yields `tigrinya_requires_ack`; the UI blocks and explains until the acknowledgement toggle is on.
- **Shows**: matching entries with **all** matched spans highlighted in the **raw** description.
- **Invariant**: descriptions are never replaced with a folded form (Principle V).

## Panel E — Aging (US5)

- **Calls**: `agingBucket(entryDate, asOfDate)` per outstanding entry.
- **Shows**: real-day count and bucket per entry; correct across Pagumē.
- **Errors**: an as-of date before an entry surfaces the primitive's defined behaviour (FR-006), never a silent bucket.

## Global invariants

- Imports Layer-0 behaviour only from `../lib/index.js`; contains no calendar/fiscal/numeral/folding re-derivation (FR-009).
- No network, backend, model, or persistence; no clock/locale/timezone dependence in any computed result — "today" is an editable default only (FR-008 / Principle VIII).
- Automated tests (in `test/ledger.test.js`) assert wiring, state transitions, error surfacing, and "rendered value == primitive(input)" — never a hand-authored Layer-0 value (FR-010).
