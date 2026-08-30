# Quickstart: Validating Ge'ez Numerals

How to prove this feature works end-to-end. Full API semantics live in [contracts/numerals-api.md](contracts/numerals-api.md); domain rules in [data-model.md](data-model.md). No step here asserts a hand-authored numeral value (Principle I).

## Prerequisites

- Node.js ≥ 22 on PATH.
- Python ≥ 3.9. On this machine use the real interpreter at `C:\Python314\python.exe` (the bare `python`/`python3` on PATH are broken Store stubs).
- Run all commands from the repository root.

## Build (TypeScript)

```bash
cd javascript && npm run build && cd ..
```

## What passes now vs. later

- **Now**: error-contract tests, round-trip self-consistency, and the JS↔PY parity sweep. The numeral vector runners **skip cleanly** because `tests/vectors/numerals.json` does not exist yet.
- **Later (gates release)**: the externally authored `tests/vectors/numerals.json` (Tier-2 CLDR/Unicode provenance) plus the exhaustive round-trip sweep — see the last section.

## Per-language tests

TypeScript (error contracts + round-trip):

```bash
cd javascript && npm test && cd ..
```

Python (error contracts + round-trip):

```bash
C:\Python314\python.exe -m unittest discover -s python/tests -p "test_*.py"
```

## Round-trip self-consistency

Confirms `from_geez(to_geez(n)) == n` and, for accepted strings, `to_geez(from_geez(s)) == s`. Included in the per-language test runs above; the exhaustive form is the parity/sweep step below.

## Cross-language parity (Principle X, interim)

Compares JS and Python outputs in **both** directions over every boundary/carry case plus a dense sample:

```bash
C:\Python314\python.exe tools/numerals_parity.py --from 1 --to 100000
```

Expected: `PARITY: PASS` with zero mismatches. (The default range in CI covers the full domain or a documented dense sample; widen `--to 99999999` for the exhaustive run.)

## Full cross-runner

Runs provenance, both languages' vector runners (numerals skip until the fixture lands), and the parity sweep in one shot:

```bash
C:\Python314\python.exe tools/cross_runner.py
```

Expected: every job `PASS`, `AGREE cross-language gating set`, and numeral vector runners reported as skipped-not-failed until `numerals.json` exists.

## Error contracts to eyeball (optional manual check)

Each must raise `GeezNumeralError` with the noted `reason` — never return a string:

- `to_geez(0)` → `zero` (must NOT return ፩ or empty).
- `to_geez(-5)` → `negative`.
- `to_geez(3.5)` → `non_integer`.
- `to_geez(100000000)` → `out_of_range`.
- `from_geez("")` → `empty`.
- `from_geez("A1")` → `invalid_char`.
- `format_money(1234.5)` → Arabic by default; `format_money(1234.5, numerals="geez")` → Ge'ez whole part, Arabic sub-units.

## Acceptance gate (Principle IX — do this once `numerals.json` exists)

1. Drop the externally authored `tests/vectors/numerals.json` into place (provenance-tagged, `gating` set, Tier-2 source — never authored by the agent).
2. Run `python tools/cross_runner.py`; the numeral vector runners now execute and must pass in both languages with zero divergence.
3. Run the **exhaustive** round-trip sweep over 1–99,999,999 in each language with zero exceptions.
4. Per Principle III (R5), measure candidate numeral packages against the fixture; adopt one if it passes, or record its measured failure to justify the reimplementation, before public release.
