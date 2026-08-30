# Contract: Calendar Public API

Language-agnostic contract for the calendar conversion surface. Both the TypeScript and Python packages MUST satisfy it; the shared fixture (`tests/vectors/calendar.json`) is the executable form of this contract.

## Construction

| Contract | TypeScript | Python |
|---|---|---|
| Build from parts | `new EthiopianDate(year, month, day, era?)` | `EthiopianDate(year, month, day, era=Era.AMETE_MIHRET)` |
| Invalid parts raise | `RangeError` | `ValueError` / `TypeError` |
| From Gregorian | `EthiopianDate.fromGregorian(g, era?)` | `EthiopianDate.from_gregorian(d, era=...)` |
| From JDN | `EthiopianDate.fromJdn(jdn, era?)` | *(internal; delegated)* |

- `month` outside 1–13 → raise. `day` outside the month's real length → raise. Non-integer component → raise.
- Construction MUST NOT coerce an out-of-range value into an adjacent valid one.

## Conversion

| Contract | TypeScript | Python |
|---|---|---|
| To Gregorian | `d.toGregorian(): {year,month,day}` | `d.to_gregorian(): datetime.date` |
| To JDN | `d.toJdn(): number` | *(internal)* |

- Conversion MUST be exact and reversible within the supported range: converting out and back yields the original value.
- The Gregorian result is proleptic Gregorian.

## Arithmetic & predicates

| Contract | TypeScript | Python |
|---|---|---|
| Add days | `d.addDays(n)` | `d.add_days(n)` |
| Add months (day-clamping) | `d.addMonths(n)` | `d.add_months(n)` |
| Day difference | `d.daysUntil(other)` | `d.days_until(other)` |
| Leap year | `d.isLeapYear()` | `d.is_leap_year()` |
| Weekday (0=Mon…6=Sun) | `d.weekday()` | `d.weekday()` |
| Change era | `d.toEra(era)` | `d.to_era(era)` |
| String form | `d.toString()` → `YYYY-MM-DD` | `str(d)` → `YYYY-MM-DD` |

- `addDays(n)` then `addDays(-n)` MUST return the original date.
- `addMonths` MUST clamp the resulting day into the target month's real length (never overflow into the next month).
- `toEra` MUST preserve the underlying instant (the JDN is unchanged).

## Era

- Values: Amete Mihret (civil, default) and Amete Alem (liturgical). Amete Alem = Amete Mihret + 5500 years.
- There is no `DEFAULT` sentinel; the default is Amete Mihret, fixed in each signature.

## Immutability & purity

- Instances are immutable; every mutator returns a new instance and leaves the receiver unchanged.
- Every operation is pure: no network, no ambient locale/timezone/system-clock dependence. Identical inputs → identical outputs everywhere (Principle VIII).

## Conformance obligations

- All 181 gating vectors MUST pass in both directions in every language (Principle I, X).
- A day-by-day 1990–2035 sweep MUST complete both directions with zero mismatches and zero exceptions (Principle IX).
- No automated test may assert a hand-authored conversion result (Principle I).

## Known boundary

- The epoch vector (`eth 1-1-1`) is **non-gating**. The Python path rejects Ethiopian years below ~8 (a limit of the wrapped dependency); the TypeScript path converts it. Divergence is confined to this non-gating boundary and is documented, not silently absorbed.
