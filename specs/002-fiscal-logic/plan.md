# Implementation Plan: Fiscal Logic

**Branch**: `002-fiscal-logic` | **Date**: 2026-08-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-fiscal-logic/spec.md`

## Summary

Fiscal derivations layered purely on top of the verified calendar core (feature 001): fiscal year, quarter, accounting period (with Pagumē as a distinct period 13), fiscal-year bounds, and aging in real days across the Pagumē boundary. No new calendar-conversion path (Principle III) — every function reduces to a date's `(year, month, day)` from the calendar module or to its day arithmetic. Both languages expose the identical surface and run one shared fiscal fixture. Because no `fiscal.json` exists yet and Principle I forbids the agent authoring fiscal values, this feature ships the implementation from the spec's definitions with **error-contract and self-consistency tests only**, plus a cross-language sweep; the externally authored fixture gates it later. The three domain conventions (label, period numbering, Pagumē's quarter) are isolated behind a single, swappable convention layer so validation can flip one without a rewrite.

## Technical Context

**Language/Version**: TypeScript 5.7+ on Node.js ≥ 22; Python ≥ 3.9 (CI 3.12, local 3.14). Same toolchain as feature 001.

**Primary Dependencies**: JS — none at runtime; imports the local calendar module (`javascript/src/calendar.ts`). Python — the calendar wrapper from feature 001, which itself wraps `py-ethiopian-date-converter`. No new third-party dependency.

**Storage**: N/A — pure functions.

**Testing**: JS `node:test` + standalone runners; Python `unittest` + standalone runners. Shared fixture slot: `tests/vectors/fiscal.json` (authored externally, not yet present). Cross-language: extend `tools/cross_runner.py`. Self-consistency + JS↔PY parity sweep stand in until the fixture arrives.

**Target Platform**: Anywhere the runtimes run; offline, no locale/tz/clock dependence (Principle VIII).

**Project Type**: Multi-language library — a second module in the existing `javascript/` and `python/` packages.

**Performance Goals**: O(1) per query (a handful of integer comparisons over calendar-core output); a decade sweep completes in well under a second per language.

**Constraints**: Pagumē is a first-class period (Principle VI). No agent-authored fiscal assertions (Principle I). All fiscal math flows through the calendar core (Principle III). The three conventions (A1/A2/A3) must be swappable in one place.

**Scale/Scope**: Five functions × two languages, plus runners and the convention layer. Small.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I — Fixtures authored, never generated | No fiscal value is asserted in code/tests; runners consume `tests/vectors/fiscal.json` when it exists. Interim tests are error-contract + self-consistency only. | ✅ Pass |
| II — Anchor provenance | This feature adds no vectors. MoFED is named as the Tier-1 authority to be added to provenance before release; release stays blocked by II globally. | ✅ Pass (release blocked by II) |
| III — Measure before reimplementing | All conversion/day-arithmetic is delegated to the feature-001 calendar core; no second calendar path is introduced. | ✅ Pass |
| IV / V / VII | N/A — no script equivalence, folding, or numerals here. | ✅ N/A |
| VI — Pagumē first-class | Period 13 = Pagumē is a distinct accounting period; aging computes in real days across Pagumē. | ✅ Pass |
| VIII — Deterministic | Pure derivation over calendar-core output; no network/locale/tz/clock. | ✅ Pass |
| IX — Green suite is not evidence | Acceptance requires the authored fiscal fixture AND a full-decade sweep with zero exceptions; interim self-consistency is explicitly not treated as final acceptance. | ✅ Pass (final acceptance pending fixture) |
| X — Cross-language agreement | Both languages expose the same surface and will run the same `fiscal.json`; the cross-runner is extended to fail on divergence. | ✅ Pass |

**Gate result**: PASS. No unjustified deviations; Complexity Tracking records the one intentional design choice (the convention layer).

## Project Structure

### Documentation (this feature)

```text
specs/002-fiscal-logic/
├── plan.md              # This file
├── research.md          # Phase 0 output — resolves the three conventions to informed defaults
├── data-model.md        # Phase 1 output — fiscal entities + validation rules
├── quickstart.md        # Phase 1 output — how to validate (incl. what to do once fiscal.json lands)
├── contracts/
│   └── fiscal-api.md     # Phase 1 output — language-agnostic fiscal surface
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
tests/vectors/
├── calendar.json                     # feature 001 (read-only)
└── fiscal.json                       # THIS feature — authored externally, NOT by the agent (Principle I); not yet present

javascript/
├── src/
│   ├── calendar.ts                    # feature 001 — the sole calendar engine
│   ├── fiscal.ts                      # NEW — fiscal_year_for, bounds, quarter, period, aging
│   ├── fiscal-convention.ts           # NEW — A1/A2/A3 isolated here; one swap point
│   └── index.ts                       # extend exports with the fiscal surface
├── test/
│   ├── run_fiscal_vectors.ts          # NEW — runs fiscal.json when present (skips cleanly if absent)
│   └── fiscal.test.ts                 # NEW — error contracts + self-consistency (no authored values)

python/
├── src/ethiopic_primitives/
│   ├── calendar.py                    # feature 001
│   ├── fiscal.py                      # NEW — mirror surface, same convention layer
│   └── __init__.py                    # extend exports
├── tests/
│   ├── run_fiscal_vectors.py          # NEW — runs fiscal.json when present
│   └── test_fiscal.py                 # NEW — error contracts + self-consistency

tools/
├── cross_runner.py                    # extend: add fiscal runners + a JS↔PY fiscal parity sweep
└── fiscal_parity.py                   # NEW — generates a date sweep, compares JS vs PY fiscal outputs
```

**Structure Decision**: Fiscal logic is added as a second module inside the two existing packages, not a new package — it shares the calendar core and the same fixture directory. The three domain conventions live in a dedicated `fiscal-convention` unit in each language so that validating A1/A2/A3 against `fiscal.json` changes exactly one small file per language, never the fiscal functions themselves.

## Complexity Tracking

| Design choice | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| A dedicated convention layer (`fiscal-convention.*`) isolating A1/A2/A3 | The label, period-numbering, and Pagumē-quarter conventions are unverified and will be confirmed/corrected by an external Tier-1 fixture. Isolating them makes validation a one-file change and keeps the fiscal functions convention-agnostic. | Inlining the conventions into each fiscal function (simpler now) would scatter three unverified assumptions across ten functions in two languages, so a single correction from `fiscal.json` would mean a multi-file rewrite and risk divergence — the opposite of Principle X. |
| A JS↔PY fiscal parity sweep (`fiscal_parity.py`) in addition to the shared fixture | The fixture does not exist yet, but cross-language agreement (Principle X) must still be demonstrable now. A generated sweep comparing both languages provides interim agreement evidence without authoring fiscal truth. | Waiting for `fiscal.json` to test agreement (simpler) would leave Principle X unverified for an unknown period; the parity sweep asserts only "the two languages match", never a specific fiscal value. |
