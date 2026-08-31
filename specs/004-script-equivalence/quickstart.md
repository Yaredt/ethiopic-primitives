# Quickstart: Validating Ge'ez-Script Equivalence & Folding

How to prove this feature works end-to-end. Full API semantics live in [contracts/equivalence-api.md](contracts/equivalence-api.md); domain rules in [data-model.md](data-model.md). No step here asserts a hand-authored class membership or folded value (Principle I).

## Prerequisites

- Node.js ≥ 22 on PATH.
- Python ≥ 3.9. On this machine use the real interpreter at `C:\Python314\python.exe` (the bare `python`/`python3` on PATH are broken Store stubs).
- Run all commands from the repository root.

## Build (TypeScript)

```bash
cd javascript && npm run build && cd ..
```

## What passes now vs. later

- **Now**: error/acknowledge contracts, structural invariants (1:1 length, offset-map fidelity, scheme tagging), the JS↔PY parity sweep, and the SC-007 no-authored-fidäl guard. The folding vector runners **skip cleanly** because `tests/vectors/folding.json` does not exist yet.
- **Later (gates release)**: the externally authored `tests/vectors/folding.json` (Tier-2 CLDR/ICU provenance) passing in both languages with zero divergence — see the last section.

## Per-language tests

TypeScript (structural + error/acknowledge):

```bash
cd javascript && npm test && cd ..
```

Python:

```bash
C:\Python314\python.exe -m unittest discover -s python/tests -p "test_*.py"
```

## Cross-language parity (Principle X, interim)

Compares `fold`/`equal`/`foldedEqual` across both languages over a generated input set — every (language × scheme) combination plus the `GE_EZ` and unacknowledged-`TIGRINYA` raise paths, the acknowledged path, mixed/pass-through content, and empty input:

```bash
C:\Python314\python.exe tools/equivalence_parity.py
```

Expected: `PARITY: PASS` with zero divergence in folded key, offset map, scheme tag, and raise/acknowledge outcome.

## SC-007 guard (Principle I)

Fails if any raw Ethiopic fidäl (U+1200–U+137F) literal appears in the equivalence test files — inputs must be built from code points, never embedded:

```bash
C:\Python314\python.exe tools/check_no_authored_glyphs.py
```

## Full cross-runner

```bash
C:\Python314\python.exe tools/cross_runner.py
```

Expected: every job `PASS`, `AGREE cross-language gating set`, and the folding vector runners reported as skipped-not-failed until `folding.json` exists.

## Error / acknowledge contracts to eyeball (optional manual check)

Each must raise `EquivalenceError` with the noted `reason` — never return a folded value. Build any fidäl inputs from code points (`String.fromCodePoint` / `chr`), not literals:

- `fold(text, GE_EZ, H_ONLY)` → `geez_not_foldable`.
- `fold(text, TIGRINYA, HSL)` without acknowledgement → `tigrinya_requires_ack`.
- `fold(text, TIGRINYA, HSL, { acknowledgeLossy: true })` → succeeds, returns a `FoldResult` tagged `HSL`.
- `fold(text, /* missing */, H_ONLY)` → `missing_language`; an unknown language → `unknown_language`.
- `fold(text, AMHARIC /* missing scheme */)` → `missing_scheme`.
- `equal(a, b, GE_EZ)` → returns a boolean (non-lossy; never raises for Ge'ez).
- `keysEqual(foldUnderHOnly, foldUnderHsl)` → `scheme_mismatch`.

## Acceptance gate (Principle IX — do this once `folding.json` exists)

1. Drop the externally authored `tests/vectors/folding.json` into place (provenance-tagged, `gating` set, Tier-2 CLDR/ICU source — never authored by the agent).
2. Run `python tools/cross_runner.py`; the folding vector runners now execute and must pass in both languages with zero divergence.
3. Confirm the fixture validates the CLDR-derived class membership; correct the single `equivalence-classes` module if the fixture disagrees (never the fold functions, never the tests).
4. Record the CLDR/ICU provenance in `folding.json` and resolve the CC-BY-SA licence tension on any corpus used, before public release (Principles II).
