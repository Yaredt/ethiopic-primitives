# Phase 1 Data Model: Calendar Correctness Core

Layer 0 has no persistence. The "data model" is the set of immutable value types the two languages expose and the validation rules that guard them. Both languages implement the same shape.

## Entity: EthiopianDate

An immutable Ethiopian calendar date.

| Field | Type | Range | Notes |
|---|---|---|---|
| `year` | integer | any (era-relative) | In the date's own era. Amete Alem years are ~5500 larger. |
| `month` | integer | 1–13 | 13 is Pagumē — a real month, never an adjustment period (Principle VI). |
| `day` | integer | 1–30, or 1–5/6 for month 13 | Upper bound depends on month and leap year. |
| `era` | Era | enum value | Defaults to Amete Mihret. |

**Validation rules** (enforced at construction; violations raise, never coerce — Principle VII spirit, FR-007):

- `year`, `month`, `day` must be integers.
- `1 ≤ month ≤ 13`.
- `1 ≤ day ≤ daysInMonth(year, month, era)`.
- `daysInMonth` = 30 for months 1–12; for month 13 it is 6 when the (Amete-Mihret-normalized) year satisfies `year % 4 == 3`, else 5.
- Python note: the wrapped dependency additionally rejects Amete-Mihret years below ~8, so the epoch (year 1) is not constructible there. This is a documented non-gating boundary.

**Behavior (pure; each returns a new value or a scalar):**

| Operation | Result | Contract |
|---|---|---|
| `toGregorian()` / `to_gregorian()` | Gregorian date | Proleptic Gregorian. |
| `fromGregorian(g, era?)` / `from_gregorian(g, era?)` | EthiopianDate | Class/static constructor. |
| `toJdn()` / (internal in Python) | integer | Julian Day Number. |
| `fromJdn(jdn, era?)` | EthiopianDate | JS exposes this; Python delegates via Gregorian. |
| `addDays(n)` / `add_days(n)` | EthiopianDate | `n` integer; real-day arithmetic across Pagumē. |
| `addMonths(n)` / `add_months(n)` | EthiopianDate | Clamps day into the target month's real length; verified identical across both languages. |
| `daysUntil(other)` / `days_until(other)` | integer | `other − this`, in real days. |
| `isLeapYear()` / `is_leap_year()` | boolean | `year % 4 == 3` (era-normalized). |
| `weekday()` | integer | 0 = Monday … 6 = Sunday (ISO-8601). |
| `toEra(era)` / `to_era(era)` | EthiopianDate | Same instant, other era label. |
| `toString()` / `__str__` | string | `YYYY-MM-DD` in the date's own era. |

## Entity: GregorianDate (interchange form)

The Gregorian side of a conversion. In JavaScript a plain `{ year, month, day }` object; in Python the standard library `datetime.date`. Gregorian has no 13th month, so using `datetime.date` here does **not** violate Principle VI (which forbids `datetime.date` only for the *Ethiopian* type).

| Field | Type | Range |
|---|---|---|
| `year` | integer | any (proleptic) |
| `month` | integer | 1–12 |
| `day` | integer | 1–31 |

## Entity: Era

The year-counting system. Values: `AmeteMihret` (civil) and `AmeteAlem` (liturgical, +5500 years). No `DEFAULT` sentinel; the default parameter value is Amete Mihret, chosen explicitly at each call site's signature.

## Entity: Conformance Vector (read-only, external)

Defined by `tests/vectors/calendar.json`; owned by the fixture, never by this feature. One record pairs an Ethiopian date with a Gregorian date.

| Field | Type | Notes |
|---|---|---|
| `ethiopic` | `[year, month, day]` | |
| `gregorian` | `[year, month, day]` | |
| `gating` | boolean | Gating vectors must pass in every runner; 181 of 182 are gating. |
| `source` | array | Provenance authorities + `result` (Principle II). |
| `note` | string | Human label (e.g. "new year", "pagume last (leap)"). |

## Invariants (verified by the runners, not by authored assertions)

- **Round-trip identity**: for every JDN in range, `fromJdn(jdn).toJdn() == jdn`, and `fromGregorian(x.toGregorian()) == x`.
- **Vector agreement**: every gating vector converts correctly in both directions, in both languages.
- **Cross-language agreement**: JS and Python report identical pass/fail on the gating set.
- **Pagumē integrity**: month 13 is a legal, convertible value; it is never collapsed into month 12.
