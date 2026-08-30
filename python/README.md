# ethiopic-primitives (Python)

Deterministic Ethiopian calendar primitives for Python.

Per Constitution Principle III, calendar conversion is **not reimplemented** here.
`py-ethiopian-date-converter` passed 16,801/16,801 days in the prior-art sweep and
is a dependency; this package is a thin, verified wrapper that adapts it to the
shared Layer-0 surface, adds the Amete Alem era offset, and runs the same JSON
conformance vectors as the JavaScript implementation.

## Install

```bash
pip install ethiopic-primitives
```

## Use

```python
from datetime import date
from ethiopic_primitives import EthiopianDate, Era

EthiopianDate.from_gregorian(date(2007, 9, 12))     # EthiopianDate(2000, 1, 1)
EthiopianDate(2003, 13, 6).to_gregorian()           # date(2011, 9, 11)  — Pagumē
EthiopianDate(2000, 1, 1).is_leap_year()
EthiopianDate(2000, 1, 1).to_era(Era.AMETE_ALEM).year   # 7500  (+5500)
```

Month 13 (Pagumē) is first-class: the Ethiopian type carries `month: 1..13` and
is never a `datetime.date` (Principle VI). `to_gregorian()` returns a
`datetime.date` because the Gregorian calendar has no 13th month.

## Fiscal logic

The Ethiopian fiscal year runs Hamle 1 – Sene 30 (8 July – 7 July), derived purely
from the calendar core (no second conversion path — Principle III):

```python
from ethiopic_primitives import (
    EthiopianDate, fiscal_year_for, fiscal_year_bounds,
    fiscal_quarter, fiscal_period, aging_bucket,
)

d = EthiopianDate(2016, 1, 15)
fiscal_year_for(d)             # fiscal-year label
fiscal_year_bounds(2016)       # (Hamle 1, Sene 30 of next year)
fiscal_quarter(d)              # 1..4  (Q1 begins Hamle 1)
fiscal_period(d)               # 1..13 (period 13 = Pagumē, never merged)
aging_bucket(EthiopianDate(2016, 12, 25), EthiopianDate(2017, 1, 15))  # real days across Pagumē
```

Three conventions (label, period numbering, Pagumē's quarter) are **not yet
Tier-1-verified**; they live in the `_Convention` block of
[`fiscal.py`](src/ethiopic_primitives/fiscal.py) — the single swap point. A
disagreement with the authored `tests/vectors/fiscal.json` is a one-place fix.

## Ge'ez numerals

Bidirectional conversion between Arabic integers and Ge'ez numerals over
**1–99,999,999**, plus Arabic-default money. The domain is closed (Principle VII):
no zero, sign, or fraction — those raise rather than coerce.

```python
from ethiopic_primitives import to_geez, from_geez, format_money, GeezNumeralError

to_geez(2017)                          # canonical Ge'ez numerals (leading-1 omitted)
from_geez(to_geez(2017))               # 2017  — strict round-trip bijection
format_money(1234.5)                   # "1234.50"  (Arabic by default)
format_money(1234.5, numerals="geez")  # Ge'ez whole part + Arabic ".50"

to_geez(0)                             # raises GeezNumeralError(reason="zero") — never the one-glyph, never ""
```

Parsing accepts **only** the canonical rendering (`from_geez` is the exact inverse
of `to_geez`); a valid-but-non-canonical spelling raises `reason="non_canonical"`.
Conformance values are owned by the external `tests/vectors/numerals.json`
(Principle I), not by this code.

## Runners

```bash
python python/tests/run_vectors.py                       # all shared vectors
python python/tests/run_sweep.py --from 1990 --to 2035   # Principle IX sweep
python python/tests/run_numerals_vectors.py              # numerals.json (skips cleanly until it exists)
python -m unittest discover -s python/tests -p "test_*.py"
```

## Known boundary

The upstream dependency does not support Ethiopian years below ~8, so the
non-gating epoch vector (`eth 1-1-1`, Gregorian year 8) raises rather than
converting. All 181 **gating** vectors are within range and pass. This is a
documented divergence from the JavaScript runner, which handles year 1.

Licensed MIT.
