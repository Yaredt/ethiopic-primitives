# Phase 1 Data Model: Fiscal Logic

No persistence. These are the value types and rules the fiscal surface exposes; both languages implement the same shape, on top of the feature-001 `EthiopianDate`.

## Entity: FiscalYear

An accounting year running Hamle 1 (month 11 day 1) through Sene 30 (month 10 day 30) of the following Ethiopian year.

| Field | Type | Notes |
|---|---|---|
| `label` | integer | Under convention **A1**, the Ethiopian year of the Hamle 1 start. |
| `start` | EthiopianDate | Always a Hamle 1 (month 11, day 1). |
| `end` | EthiopianDate | Always a Sene 30 (month 10, day 30) of `startYear + 1`. |

**Rules**:
- Every date `d` with `start ≤ d ≤ end` satisfies `fiscal_year_for(d) == label`.
- `start.month == 11 && start.day == 1`; `end.month == 10 && end.day == 30`.
- `end` is in the Ethiopian year following `start`'s year.

## Entity: FiscalQuarter

An integer 1–4; Q1 begins Hamle 1.

**Rules (convention A3)**:
- Q1 = {Hamle, Nähase, Meskerem}, Q2 = {Tikimt, Hidar, Tahsas}, Q3 = {Tir, Yekatit, Megabit}, Q4 = {Miyazya, Ginbot, Sene} (calendar months 11,12,1 / 2,3,4 / 5,6,7 / 8,9,10).
- Pagumē (month 13) → Q1.
- Total coverage: every date maps to exactly one quarter.

## Entity: AccountingPeriod

An integer 1–13.

**Rules (convention A2)**:
- `period == date.month` — Meskerem = 1 … Nähase = 12, Pagumē = 13.
- Period 13 (Pagumē) is distinct and never equal to any 30-day month's period (Principle VI, SC-003).

## Entity: AgingResult

The outcome of aging one invoice as of a reporting date.

| Field | Type | Notes |
|---|---|---|
| `days` | integer ≥ 0 | Real elapsed days from invoice to as-of (from the calendar core). |
| `bucketIndex` | integer | 0-based index into the ordered bucket boundaries; the last index is the overflow ("90+"). |
| `label` | string | Human label, e.g. `"0-30"`, `"31-60"`, `"61-90"`, `"90+"` for default thresholds. |

**Rules (Decision 5)**:
- `days = daysUntil(invoice → as_of)` in real days across Pagumē.
- With sorted thresholds `[t1, t2, t3]`, age `a` is bucket 0 if `a ≤ t1`, bucket 1 if `a ≤ t2`, bucket 2 if `a ≤ t3`, else the overflow bucket.
- `as_of < invoice` → raise (negative age is a caller error).
- Thresholds default to `[30, 60, 90]`; callers may override with any ascending list.

## Entity: FiscalConvention (internal, single swap point)

Not a public value — the isolated home of the three unverified conventions.

| Setting | Default | Validates against |
|---|---|---|
| `labelForStartYear(y)` | `y` (A1, start-year) | one `fiscal.json` label vector |
| `periodOf(month)` | `month` (A2) | one `fiscal.json` period vector (a Pagumē + a Sene case) |
| `quarterOf(month)` | A3 mapping above, Pagumē→Q1 | one `fiscal.json` quarter vector (a Pagumē case) |

Changing any row here MUST NOT require touching the fiscal functions.

## Entity: Fiscal Vector (external, read-only) — `tests/vectors/fiscal.json` (not yet present)

Authored externally, never by the agent (Principle I). Anticipated shape (final schema owned by the fixture author):

| Field | Type | Notes |
|---|---|---|
| `kind` | string | e.g. `"fiscal_year"`, `"quarter"`, `"period"`, `"bounds"`, `"aging"`. |
| `input` | varies | a date `[y,m,d]`, a fiscal-year label, or an invoice/as-of pair + buckets. |
| `expected` | varies | the official fiscal output for that input. |
| `gating` | boolean | gating vectors must pass in every language. |
| `source` | array | provenance authorities + `result` (Principle II; MoFED = Tier-1). |

## Invariants (verified by runners / parity sweep, never by authored assertions)

- **Total coverage**: over a decade sweep, every date yields exactly one fiscal year, one quarter (1–4), one period (1–13); zero exceptions.
- **Boundary sharpness**: `fiscal_year_for` changes only at Hamle 1; `fiscal_year_bounds` round-trips (every date in bounds re-labels to the same FY).
- **Pagumē integrity**: Pagumē's period differs from every 30-day month's period.
- **Aging fidelity**: `aging.days` equals the calendar core's `daysUntil` for the same pair.
- **Cross-language parity**: JS and Python return identical results for every fiscal function across the sweep.
