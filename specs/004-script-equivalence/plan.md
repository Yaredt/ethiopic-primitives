# Implementation Plan: Ge'ez-Script Equivalence & Folding

**Branch**: `004-script-equivalence` | **Date**: 2026-08-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-script-equivalence/spec.md`

## Summary

A standalone Layer-0 module for per-language Ge'ez-script equivalence. It exposes an explicit-language surface — `fold`, `equal` (non-lossy), `foldedEqual`, and `keysEqual` — over three languages (`AMHARIC`, `TIGRINYA`, `GE_EZ`) and two folding schemes (`H_ONLY`, `HSL`). Folding is **length-preserving 1:1**: each input character maps to exactly one folded character, so the required offset map (Principle V) is a per-position index map (identity when nothing folds), and the original input is never mutated. The non-negotiable Principle IV rules are enforced at the surface: language is mandatory with no default/inference (`missing_language`/`unknown_language` raise), `GE_EZ` raises on any fold, and `TIGRINYA` raises on a fold unless the caller passes an explicit lossy acknowledgement. There is no `DEFAULT` scheme; every folded result carries its scheme, and comparing keys across schemes is surfaced as a `scheme_mismatch` (Principle V).

The `H_ONLY`/`HSL` equivalence-class tables are **derived from documented Amharic/Tigrinya orthographic homophone data** (a cited linguistic reference and/or the Unicode Ethiopic block documentation — **not** ICU/CLDR collation, which keeps homophone letters distinct) and live in one place per language, so v1 ships working folding with cited provenance while the external `tests/vectors/folding.json` independently validates exact class membership. Per Principle I the agent authors no class membership or folded value in tests; interim tests are structural invariants (offset-map fidelity, scheme tagging, 1:1 length), error/acknowledge contracts, and a JS↔PY parity sweep. This module has **no dependency** on calendar/fiscal/numerals — it is a fourth independent module in the existing packages.

## Technical Context

**Language/Version**: TypeScript 5.7+ on Node.js ≥ 22 (`--experimental-strip-types`); Python ≥ 3.9 (CI 3.12, local 3.14). Same toolchain as features 001–003.

**Primary Dependencies**: None at runtime, in either language. The class tables are compiled-in constants derived from documented orthographic homophone data (no runtime ICU dependency; see [research.md](research.md) R1).

**Storage**: N/A — pure functions.

**Testing**: JS `node:test` + standalone runners; Python `unittest` + standalone runners. Shared fixture slot: `tests/vectors/folding.json` (authored externally, not yet present). Cross-language: extend `tools/cross_runner.py` and add `tools/equivalence_parity.py`. Structural + error/acknowledge + a JS↔PY parity sweep stand in until the fixture arrives; a guard forbids raw Ethiopic fidäl literals in the equivalence test files (SC-007).

**Target Platform**: Anywhere the runtimes run; offline, no locale/tz/clock dependence (Principle VIII).

**Project Type**: Multi-language library — a fourth module alongside `calendar`, `fiscal`, and `numerals` in the existing `javascript/` and `python/` packages.

**Performance Goals**: O(n) per fold/compare — one table lookup per character. A wide input sweep completes in well under a second per language.

**Constraints**: Explicit language, no default (Principle IV). `GE_EZ` never folds; `TIGRINYA` fold needs acknowledgement. Parallel representation + offset map, never a bare string; no `DEFAULT` scheme; folding prohibited at ingestion (Principle V). No agent-authored class membership or folded values (Principle I). Pure/deterministic (Principle VIII). Length-preserving 1:1 (spec clarification).

**Scale/Scope**: Four functions + two enums + one error type × two languages, plus the orthography-derived class tables, vector runners, a parity sweep, the SC-007 guard, and cross-runner wiring. Moderate.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I — Fixtures authored, never generated | No class membership or folded value is asserted in code/tests; runners consume `tests/vectors/folding.json` when it exists. Interim tests are structural + error/acknowledge + parity. An SC-007 guard forbids raw fidäl literals in the test files. | ✅ Pass |
| II — Anchor provenance | Adds no vectors. Documented Amharic/Tigrinya orthographic homophone data (a cited linguistic reference and/or the Unicode Ethiopic block documentation) is named as the authority for the class tables and is to be recorded in `folding.json` provenance before release; release stays blocked by II globally. NOTE: ICU/CLDR *collation* is explicitly not the source — it encodes sort order and keeps homophone letters distinct. | ✅ Pass (release blocked by II) |
| III — Measure before reimplementing | The equivalence engine is a **novel capability** — absent from the surveyed ecosystem — so there is no existing package to measure a failure against; reimplementation is justified by absence, and the classes are derived from a cited orthographic authority rather than invented. | ✅ Pass |
| IV — Language required, never defaulted | Central. Every function takes an explicit `language`; missing/unknown raises; `GE_EZ` raises on fold; `TIGRINYA` fold requires an explicit lossy acknowledgement. | ✅ Pass |
| V — Source text is immutable | Central. `fold` returns a parallel representation + per-position offset map (never a bare string); input is unchanged; every result carries an explicit `H_ONLY`/`HSL` scheme (no `DEFAULT`); ingestion is documented as raw-retaining; cross-scheme key comparison raises `scheme_mismatch`. | ✅ Pass |
| VI / VII | N/A — no calendar/Pagumē or numeral logic. Ge'ez numeral glyphs pass through folding unchanged (non-fidäl). | ✅ N/A |
| VIII — Deterministic | Pure code-point table lookups; no network/locale/tz/clock. | ✅ Pass |
| IX — Green suite is not evidence | Acceptance requires the authored `folding.json` AND a cross-language sweep with zero divergence; interim structural/contract tests are explicitly not final acceptance. | ✅ Pass (final acceptance pending fixture) |
| X — Cross-language agreement | Both languages expose the same surface and will run the same `folding.json`; the cross-runner fails on divergence, with a parity sweep proving JS==PY now. | ✅ Pass |

**Gate result**: PASS. No unjustified deviations. Complexity Tracking records the two intentional choices (the single-location class table and the interim parity sweep).

**Post-Design re-check (after Phase 1)**: PASS — unchanged. The contract, data model, and quickstart introduce no default language or scheme, no inference, no bare replacement string, and no agent-authored class membership. `equal` keeps a non-lossy path for `GE_EZ` while `fold` raises for it; `keysEqual` surfaces `scheme_mismatch`; the offset map is returned even though it is identity in v1 (Principle V). The class tables stay isolated and derived from a cited orthographic authority (not collation), and the SC-007 guard keeps the tests fidäl-literal-free (Principle I).

## Project Structure

### Documentation (this feature)

```text
specs/004-script-equivalence/
├── plan.md              # This file
├── research.md          # Phase 0 — class-table source, offset-map model, error taxonomy, API shape
├── data-model.md        # Phase 1 — entities + validation rules
├── quickstart.md        # Phase 1 — how to validate (incl. what to do once folding.json lands)
├── contracts/
│   └── equivalence-api.md   # Phase 1 — language-agnostic equivalence surface
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
tests/vectors/
├── calendar.json                     # feature 001 (read-only)
└── folding.json                      # THIS feature — authored externally, NOT by the agent (Principle I); not yet present

javascript/
├── src/
│   ├── equivalence.ts                 # NEW — fold, equal, foldedEqual, keysEqual, Language, FoldScheme, EquivalenceError
│   ├── equivalence-classes.ts         # NEW — orthography-derived H_ONLY/HSL class tables (the single swap point)
│   └── index.ts                       # extend exports with the equivalence surface
├── test/
│   ├── run_equivalence_vectors.ts     # NEW — runs folding.json when present (skips cleanly if absent)
│   ├── equivalence_dump.ts            # NEW — stdin→fold/compare rows for the parity sweep
│   └── equivalence.test.ts            # NEW — structural + error/acknowledge (no authored class values)

python/
├── src/ethiopic_primitives/
│   ├── equivalence.py                 # NEW — mirror surface
│   ├── _equivalence_classes.py        # NEW — mirror class tables (single swap point)
│   └── __init__.py                    # extend exports
├── tests/
│   ├── run_equivalence_vectors.py     # NEW — runs folding.json when present
│   └── test_equivalence.py            # NEW — structural + error/acknowledge

tools/
├── equivalence_parity.py             # NEW — sweeps inputs, compares JS vs PY fold/compare both languages+schemes
├── check_no_authored_glyphs.py       # NEW/extended — SC-007: no raw fidäl literals in equivalence test files
└── cross_runner.py                    # extend: add equivalence runners + parity + the SC-007 guard
```

**Structure Decision**: Equivalence is added as a fourth module inside the two existing packages, on the same versioned surface and shared `tests/vectors/` directory and cross-runner. It imports nothing from calendar/fiscal/numerals. The orthography-derived class tables live in a dedicated `equivalence-classes` unit per language — the one place a fixture correction to class membership changes — so the fold/compare functions stay membership-agnostic (mirrors how feature 002 isolated its conventions).

## Complexity Tracking

| Design choice | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| A dedicated `equivalence-classes` unit isolating the H_ONLY/HSL tables | Exact class membership is owned/validated by the external `folding.json`; isolating the orthography-derived tables makes a fixture correction a one-file change and keeps `fold`/`compare` membership-agnostic. | Inlining the classes into the fold functions would scatter unverified membership across two languages, so a single fixture correction would mean a multi-file rewrite and risk divergence — the opposite of Principle X. |
| A JS↔PY equivalence parity sweep (`equivalence_parity.py`) in addition to the shared fixture | The fixture does not exist yet, but cross-language agreement (Principle X) must still be demonstrable now. A sweep comparing fold/compare across both languages, schemes, and the raise/acknowledge paths provides interim agreement evidence without authoring class truth. | Waiting for `folding.json` to test agreement would leave Principle X unverified indefinitely; the parity sweep asserts only "the two languages match", never a specific class membership. |
