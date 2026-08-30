# Implementation Plan: Calendar Correctness Core

**Branch**: `001-calendar-core` | **Date**: 2026-08-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-calendar-core/spec.md`

**Note**: This is a backfill plan — the implementation described here already exists in `javascript/` and `python/` and passes all gates. The plan documents the design as built.

## Summary

Deterministic Ethiopian ↔ Gregorian calendar conversion, shipped in two languages that run one shared JSON fixture. The TypeScript package implements conversion from scratch (the primary deliverable: the maintained JS option is 48.9% wrong) by porting the verified reference algorithm — conversion through Julian Day Number in both directions, epoch `1724221`, leap rule `year % 4 == 3`. The Python package is a thin wrapper over `py-ethiopian-date-converter` (Principle III: a dependency that passed 16,801/16,801 days, never reimplemented), adding only the Amete Alem era offset. A cross-language harness drives both over the identical vectors and blocks on divergence. Acceptance is fixture-driven only (Principle I) and requires all 181 gating vectors plus a zero-tolerance 1990–2035 sweep (Principle IX).

## Technical Context

**Language/Version**: TypeScript 5.7+ on Node.js ≥ 22 (native type stripping); Python ≥ 3.9 (validated on 3.12 in CI, 3.14 locally).

**Primary Dependencies**: JS — none at runtime; `typescript` as the only dev dependency. Python — `py-ethiopian-date-converter==0.1.1` (the conversion engine, per Principle III).

**Storage**: N/A — pure functions, no persistence.

**Testing**: JS — `node:test` for contracts + standalone vector/sweep runners. Python — `unittest` for contracts + standalone vector/sweep runners. Shared fixture: `tests/vectors/calendar.json`. Cross-language: `tools/cross_runner.py`. Reference oracle: `tools/full_sweep.py`.

**Target Platform**: Runs anywhere the runtimes run — browser, phone, serverless, server. No network, no ambient locale/timezone/clock dependence (Principle VIII).

**Project Type**: Multi-language library (two packages, one shared fixture).

**Performance Goals**: Not a bottleneck; each conversion is O(1) integer arithmetic. The full 1990–2035 sweep (16,801 days × both directions) completes in well under a second per language.

**Constraints**: Determinism and purity are hard constraints (Principle VIII). Month 13 must be representable in every type (Principle VI). No test may assert an authored conversion result (Principle I).

**Scale/Scope**: Calendar Module A only — the date type, bidirectional conversion, era support, and day/month arithmetic. ~2 source files per language plus runners.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance to this feature | Status |
|---|---|---|
| I — Fixtures authored, never generated | No code path or test writes/asserts a conversion result; runners only consume `tests/vectors/`. | ✅ Pass |
| II — Anchor provenance | This feature does not add vectors. Public-release gate (Tier-1 source) tracked outside the feature; `check_provenance.py` still runs and warns. | ✅ Pass (release still blocked by II globally) |
| III — Measure before reimplementing | Python wraps `py-ethiopian-date-converter` (measured 16,801/16,801). JS reimplements only because the maintained JS option is measured 48.9% wrong. | ✅ Pass (justified) |
| IV — Language required | N/A — no script-equivalence/folding in this feature. | ✅ N/A |
| V — Source text immutable | N/A — no folding in this feature. | ✅ N/A |
| VI — Pagumē first-class | `month` is `1..13` in both languages; no return type collapses month 13; `datetime.date` is never used for the Ethiopian type. | ✅ Pass |
| VII — Numeral domain | N/A — numerals are a separate feature. | ✅ N/A |
| VIII — Deterministic | Pure integer math (JS) / pure delegation (Python); no network, locale, tz, or clock. | ✅ Pass |
| IX — Green suite is not evidence | Acceptance = all gating vectors AND the 1990–2035 both-direction sweep, zero tolerance. No today-spot-check as acceptance. | ✅ Pass |
| X — Cross-language agreement | `tools/cross_runner.py` runs both over the same fixture and fails on divergence on the gating set. | ✅ Pass |

**Gate result**: PASS. The one deviation (a second, from-scratch implementation instead of a single shared one) is justified under Principle III and recorded in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-calendar-core/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (public API contracts, language-agnostic)
│   └── calendar-api.md
└── tasks.md             # /speckit-tasks output (not created by /speckit-plan)
```

### Source Code (repository root)

```text
tests/vectors/
└── calendar.json                     # shared, read-only fixture (Principle I) — 182 vectors, 181 gating

javascript/                           # primary deliverable — TypeScript, from scratch
├── src/
│   ├── jdn.ts                         # Gregorian ↔ Julian Day Number
│   ├── calendar.ts                    # EthiopianDate, Era, Ethiopic ↔ JDN
│   └── index.ts                       # public surface
├── test/
│   ├── harness.ts                     # loads the shared fixture (no authored values)
│   ├── run_vectors.ts                 # conformance runner (both directions)
│   ├── run_sweep.ts                   # Principle IX sweep runner
│   └── calendar.test.ts               # node:test contracts (wiring/errors/self-consistency)
├── package.json  tsconfig.json  README.md

python/                               # thin wrapper over py-ethiopian-date-converter (Principle III)
├── src/ethiopic_primitives/
│   ├── __init__.py
│   └── calendar.py                    # EthiopianDate, Era — delegates conversion, adds era offset
├── tests/
│   ├── run_vectors.py                 # conformance runner
│   ├── run_sweep.py                   # Principle IX sweep runner
│   └── test_calendar.py               # unittest contracts
├── pyproject.toml  README.md

tools/
├── reference_ethiopic.py              # verified reference (source of the JS algorithm)
├── full_sweep.py                      # Principle IX reference oracle
├── check_provenance.py               # Principle II gate
└── cross_runner.py                    # Principle X — runs both languages, checks agreement

.github/workflows/conformance.yml      # CI: I, II, IX, JS, Python, X
```

**Structure Decision**: Two sibling language packages (`javascript/`, `python/`) share a single read-only fixture directory (`tests/vectors/`) and a set of cross-cutting `tools/`. This is deliberate: the shared fixture is the anti-drift mechanism (Principle X), and keeping it at repo root — not inside either package — keeps neither language the "owner" of correctness.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Two independent conversion implementations (JS from scratch; Python via dependency) rather than one shared engine | The ecosystem gap is language-specific: JS has no correct maintained option (48.9% wrong), while Python already has a verified one. Principle III forbids reimplementing the Python path; the JS gap forces a native implementation. | A single shared engine (e.g., compile one to both) would either reimplement the correct Python library (violating Principle III) or ship a WASM/bridge dependency that breaks the "runs in a browser/phone/serverless offline" purity constraint (Principle VIII). The shared **fixture** — not shared code — is what prevents drift. |
