# Phase 1 Data Model: Ethiopic Ledger

All state is in-memory for the session (no persistence). Every Layer-0 value is obtained from the package; the model holds display state and raw inputs only.

## Entities

### LedgerEntry

- **Fields**:
  - `id`: session-unique id (for list keys/removal).
  - `date`: the entry's Ethiopian date, held as an `EthiopianDate` from the package (month-13-capable). Entered in either calendar; the Gregorian form is derived on demand via the primitive, never stored as the source of truth.
  - `description`: raw free text (may contain Ge'ez script). **Immutable** — never overwritten with a folded form (Principle V).
  - `amount`: a monetary number (minor-unit precision), displayed via the numeral primitive's money formatting (Arabic by default).
- **Rules**: an entry always carries a valid `EthiopianDate` (an invalid date is rejected at entry with the primitive's error, never stored). Amount and description may be empty in the UI but a stored entry has both.

### FiscalTags (derived, not stored)

- `year` / `quarter` (1–4) / `period` (1–13) computed for an entry via `fiscalYearFor` / `fiscalQuarter` / `fiscalPeriod`. Pagumē → period 13, distinct (Principle VI). Never cached as authored values; recomputed from the entry's date.

### DisplayMode

- `numerals`: `"arabic"` (default) or `"geez"` — selects rendering of **counts and fiscal-year labels** only. Money stays Arabic regardless (Principle VII). A zero count renders Arabic "0"; the numeral renderer is never called with 0.

### SearchState

- `query`: raw query text.
- `language`: explicit `Language` — `AMHARIC` | `TIGRINYA` | `GE_EZ` (no default in the primitive; the UI has a visible selection).
- `scheme`: explicit `FoldScheme` — `H_ONLY` | `HSL`.
- `acknowledgeLossy`: boolean, off by default; required before a `TIGRINYA` fold (Principle IV). Ignored for other languages.
- **Derived**: for `GE_EZ`, folding is unavailable — the UI offers non-lossy exact match (`equal`) and explains why. For `TIGRINYA` with `acknowledgeLossy` off, a folded search is blocked with the primitive's `tigrinya_requires_ack` message.

### MatchHighlight (derived, not stored)

- For a matching entry: one or more `[startRaw, endRaw)` spans in the **raw** description, obtained by locating the folded query in the folded description and mapping folded indices back through `FoldResult.offsets`. All matches highlighted (spec decision). The description text itself is unchanged.

### AgingView (derived, not stored)

- `asOf`: an editable Ethiopian date (defaults to "today" as a convenience only).
- Per entry: `days` and `bucket` from `agingBucket(entryDate, asOf)` — real elapsed days across Pagumē. A backwards case (as-of before entry) surfaces the primitive's defined behaviour (FR-006), not a silent bucket.

### Seed dataset (fixed)

- A small fixed array of `LedgerEntry` loaded on start — includes at least one Pagumē (month 13) date and descriptions containing homophone variants so search is meaningful immediately. Illustrative content, **not** a conformance vector; no folded/collated result is asserted as truth (Principle I). "Reset to seed" restores it; add/remove edit the in-session list.

## State transitions

- **Add entry**: validate date via the primitive → on success append; on failure show the primitive's error, add nothing.
- **Remove entry**: drop by `id`.
- **Reset**: replace the list with a fresh copy of the seed.
- **Toggle numerals mode**: re-render counts/fiscal years; money unaffected.
- **Edit search state**: re-derive matches/highlights; descriptions unchanged.
- **Change as-of date**: re-derive aging.

All transitions are pure over in-memory state; no persistence, no network, no clock in any stored/computed result (Principle VIII).

## Relationships

`app.js` (DOM) holds the entry list + display/search/aging state and calls the pure helpers, which call the package. No entity stores a Layer-0-derived value as its source of truth — dates, tags, numerals, folds, and aging are recomputed from raw inputs via the primitives.
