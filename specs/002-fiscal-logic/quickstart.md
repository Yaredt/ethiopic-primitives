# Quickstart: Validate Fiscal Logic

Deterministic and offline. Some checks are full acceptance only once you supply `tests/vectors/fiscal.json`; the rest are verifiable now.

## Prerequisites

- Node.js ≥ 22; Python ≥ 3.9 with `py-ethiopian-date-converter==0.1.1` (local interpreter: `C:\Python314\python.exe`).
- Feature 001 (calendar core) present — fiscal logic imports it.

## What you can validate now (no fixture required)

**Cross-language parity** — every fiscal function agrees between TS and Python across a decade sweep:

```bash
python tools/fiscal_parity.py --from 1990 --to 2000
```
Expected: `fiscal parity … 0 mismatches` (asserts JS == PY, never an authored fiscal value).

**Self-consistency + error contracts**:

```bash
cd javascript && npm test        # includes fiscal.test.ts
python -m unittest discover -s python/tests -p "test_*.py"   # includes test_fiscal.py
```
These check: every date maps to exactly one quarter/period; `fiscal_year_bounds` round-trips; Pagumē's period is distinct; `aging_bucket` days equal the calendar core's day count; `as_of < invoice` raises. No hand-authored fiscal value is asserted (Principle I).

**Full harness** (runs calendar + fiscal, both languages, agreement):

```bash
python tools/cross_runner.py
```
The fiscal vector rows report `SKIP (no fiscal.json)` until you add the fixture, then flip to `PASS`/`FAIL`.

## What requires the authored fixture

Place the externally authored `tests/vectors/fiscal.json` (MoFED-sourced) in the repo. Then:

```bash
python python/tests/run_fiscal_vectors.py
cd javascript && npm run fiscal-vectors
python tools/cross_runner.py     # fiscal rows now gate
```

This is the point where conventions **A1** (label), **A2** (period numbering), **A3** (Pagumē's quarter) are confirmed or corrected. If a vector disagrees with a default, change only `javascript/src/fiscal-convention.ts` and `python/src/ethiopic_primitives/fiscal.py`'s convention block — never the fiscal functions.

## Check → principle map

| Check | Principle | Success criterion |
|---|---|---|
| `fiscal_parity.py` sweep | X | SC-005 |
| self-consistency (quarter/period coverage) | VI, VIII | SC-002, SC-003 |
| aging days == calendar `daysUntil` | VI | SC-004 |
| `fiscal.json` runners (once present) | I, IX, X | SC-001 |
| no authored fiscal assertions (inspection) | I | SC-006 |

## Acceptance

Interim: `python tools/fiscal_parity.py` clean **and** both contract suites green. Final: the above **plus** `tools/cross_runner.py` with `fiscal.json` present, all fiscal rows `PASS` and `AGREE`, and a full-decade sweep with zero exceptions.
