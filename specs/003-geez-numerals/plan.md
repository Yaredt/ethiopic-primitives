# Implementation Plan: Ge'ez Numerals

**Branch**: `003-geez-numerals` | **Date**: 2026-08-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-geez-numerals/spec.md`

## Summary

A standalone Layer-0 numeral primitive — bidirectional conversion between Arabic integers and Ge'ez numerals over the range **1–99,999,999**, plus a money formatter that defaults to Arabic. Rendering follows CLDR/Unicode's Ethiopic rules: pair-wise myriad grouping with ፻ (100) and ፼ (10,000) as separators, and the leading ፩ omitted when a group's multiplier is 1 (100 → ፻). Parsing is **canonical-only** — the exact inverse of rendering, a strict bijection — so anything that is not the renderer's output (including well-formed-but-non-canonical spellings like ፩፻, and any value implying more than 99,999,999) is rejected. The domain is closed: `to_geez(0)`, negatives, and non-integers raise (Principle VII); money is Arabic unless Ge'ez is explicitly requested for the whole-number part.

This feature has **no calendar dependency** — it is a third, independent module in the existing `javascript/` and `python/` packages. Because no `tests/vectors/numerals.json` exists yet and Principle I forbids the agent authoring numeral values, the feature ships the implementation from the spec's definitions with **error-contract and round-trip self-consistency tests only**, plus a cross-language parity sweep; the externally authored fixture (anchored on CLDR/Unicode, Tier 2) gates it later. Per Principle III, whether to reimplement or adopt an existing numeral package is deferred to a measured comparison run once that fixture exists.

## Technical Context

**Language/Version**: TypeScript 5.7+ on Node.js ≥ 22 (`--experimental-strip-types`); Python ≥ 3.9 (CI 3.12, local 3.14). Same toolchain as features 001–002.

**Primary Dependencies**: None at runtime, in either language. Numerals are pure integer/string arithmetic — no calendar core, no third-party package adopted in v1 (see Principle III note below and [research.md](research.md)).

**Storage**: N/A — pure functions.

**Testing**: JS `node:test` + standalone runners; Python `unittest` + standalone runners. Shared fixture slot: `tests/vectors/numerals.json` (authored externally, not yet present). Cross-language: extend `tools/cross_runner.py` and add `tools/numerals_parity.py`. Round-trip self-consistency + a JS↔PY parity sweep stand in until the fixture arrives.

**Target Platform**: Anywhere the runtimes run; offline, no locale/tz/clock dependence (Principle VIII).

**Project Type**: Multi-language library — a third module alongside `calendar` and `fiscal` in the existing `javascript/` and `python/` packages.

**Performance Goals**: O(number of digits) per conversion — a handful of integer divisions and string joins. An exhaustive round-trip over the full domain is bounded by 10⁸ cheap iterations per language.

**Constraints**: Closed numeral domain — no zero, negatives, or fractions (Principle VII). Single canonical rendering per integer; strict-bijection parse. No agent-authored numeral assertions (Principle I). Pure and deterministic (Principle VIII).

**Scale/Scope**: Three functions (`to_geez`, `from_geez`, `format_money`) × two languages, plus vector runners, a parity sweep, and the cross-runner wiring. Small.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I — Fixtures authored, never generated | No numeral value is asserted in code/tests; runners consume `tests/vectors/numerals.json` when it exists. Interim tests are error-contract + round-trip only. Design docs use one Wikipedia-sourced illustration, never a test assertion. | ✅ Pass |
| II — Anchor provenance | This feature adds no vectors. CLDR/Unicode (and Reingold & Dershowitz) are named as the Tier-2 authority to be added to `numerals.json` provenance before release; release stays blocked by II globally. | ✅ Pass (release blocked by II) |
| III — Measure before reimplementing | v1 reimplements numeral conversion because it cannot yet *measure* any existing package (no fixture exists to measure against). **This is a sequenced-compliance, not a waiver**: the R5 measurement is a hard **release-blocker** — public release is prohibited until, with `numerals.json` in place, each candidate package is measured and either adopted or its failure cited to justify the reimplementation. Until then the reimplementation ships behind that open gate, exactly as release is already blocked by Principle II. | ✅ Pass (measurement is a release-blocker, tracked in T029) |
| IV / V — Language / immutability | N/A — no script equivalence or folding here. | ✅ N/A |
| VI — Pagumē first-class | N/A — no calendar/period logic. | ✅ N/A |
| VII — Numeral domain constraints | Central. `to_geez(0)` raises (never ፩/empty); negatives and non-integers raise; money defaults to Arabic. | ✅ Pass |
| VIII — Deterministic | Pure integer/string functions; no network/locale/tz/clock. | ✅ Pass |
| IX — Green suite is not evidence | Acceptance requires the authored `numerals.json` AND an exhaustive round-trip sweep over 1–99,999,999 in both directions with zero exceptions; interim round-trip is explicitly not final acceptance. | ✅ Pass (final acceptance pending fixture) |
| X — Cross-language agreement | Both languages expose the same surface and will run the same `numerals.json`; the cross-runner is extended to fail on divergence, with a parity sweep proving JS==PY now. | ✅ Pass |

**Gate result**: PASS. No unjustified deviations. Complexity Tracking records the two intentional choices (v1 reimplementation deferred-to-measurement, and the interim parity sweep).

**Post-Design re-check (after Phase 1)**: PASS — unchanged. The contract, data model, and quickstart introduce no new dependency, no calendar path, no agent-authored numeral assertion, and no default-language or default-numeral coercion. `format_money` keeps Arabic as the default and never calls `to_geez(0)` (Principle VII). The strict-bijection parse and typed `GeezNumeralError.reason` keep interim tests value-free (Principle I).

## Project Structure

### Documentation (this feature)

```text
specs/003-geez-numerals/
├── plan.md              # This file
├── research.md          # Phase 0 output — algorithm source, error taxonomy, money shape, Principle III plan
├── data-model.md        # Phase 1 output — numeral entities + validation rules
├── quickstart.md        # Phase 1 output — how to validate (incl. what to do once numerals.json lands)
├── contracts/
│   └── numerals-api.md   # Phase 1 output — language-agnostic numeral surface
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
tests/vectors/
├── calendar.json                     # feature 001 (read-only)
└── numerals.json                     # THIS feature — authored externally, NOT by the agent (Principle I); not yet present

javascript/
├── src/
│   ├── numerals.ts                    # NEW — toGeez, fromGeez, formatMoney + GeezNumeralError
│   └── index.ts                       # extend exports with the numeral surface
├── test/
│   ├── run_numerals_vectors.ts        # NEW — runs numerals.json when present (skips cleanly if absent)
│   └── numerals.test.ts               # NEW — error contracts + round-trip (no authored values)

python/
├── src/ethiopic_primitives/
│   ├── numerals.py                    # NEW — to_geez, from_geez, format_money + GeezNumeralError
│   └── __init__.py                    # extend exports
├── tests/
│   ├── run_numerals_vectors.py        # NEW — runs numerals.json when present
│   └── test_numerals.py               # NEW — error contracts + round-trip

tools/
├── cross_runner.py                    # extend: add numeral runners + a JS↔PY numeral parity sweep
└── numerals_parity.py                 # NEW — sweeps the domain, compares JS vs PY numeral outputs both directions
```

**Structure Decision**: Numerals are added as a third module inside the two existing packages, not a new package — they ship on the same versioned surface and share the same `tests/vectors/` directory and cross-runner. Unlike fiscal logic, this module imports nothing from the calendar core; it is self-contained integer/string arithmetic. The three settled conventions (range bound, leading-1 omission, canonical-only parse) are inherent to the single render/parse pair, so no separate convention layer is warranted — the render and parse functions are exact inverses by construction.

## Complexity Tracking

| Design choice | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| v1 reimplements conversion instead of adopting an existing numeral package | Principle III requires a *measured* failure before reimplementing, but no `numerals.json` exists yet to measure any candidate against. Implementing from the CLDR spec now unblocks the two language surfaces; a recorded gate measures candidates once the fixture lands, adopting one if it passes. | Blocking all implementation until the fixture exists (stricter reading of III) would stall the feature indefinitely on an external dependency; adopting an unmeasured package now would import an unverified algorithm — exactly the duplication-of-error pathology the constitution warns against. |
| A JS↔PY numeral parity sweep (`numerals_parity.py`) in addition to the shared fixture | The fixture does not exist yet, but cross-language agreement (Principle X) must still be demonstrable now. A sweep comparing both languages both directions provides interim agreement evidence without authoring numeral truth. | Waiting for `numerals.json` to test agreement would leave Principle X unverified indefinitely; the parity sweep asserts only "the two languages match", never a specific numeral value. |

## Release Gates (paste into the PR's principle checklist)

This feature ships behind two open **release-blockers**. Both MUST clear before public release; neither is optional polish.

- [ ] **Fixture (Principles I, II, IX)** — `tests/vectors/numerals.json` is authored **externally** (never by the agent), carries `source` provenance from a Tier-2 authority (CLDR/Unicode or Reingold & Dershowitz) and a `gating` flag, and passes in **both** languages via the vector runners, plus the exhaustive round-trip sweep (`tools/numerals_parity.py --exhaustive`) with zero exceptions.
- [ ] **Principle III measurement** — with that fixture in place, each candidate numeral package (`geez-numerals-converter`, `kidusmakonnen/geez`, `geezorg/geez-lib`, …) is measured against it; the project either **adopts** the one that passes 100% of the gating set as a dependency, or **cites its measured failure** to justify keeping this reimplementation.

PR description must also state which principles were checked (Development Workflow): checked here — **I** (no authored numeral values; SC-006 guard enforces it), **VII** (closed domain; `to_geez(0)`/neg/fraction raise; Arabic-default money), **VIII** (pure/deterministic), **IX** (interim round-trip is not final acceptance; fixture + exhaustive sweep gate release), **X** (parity sweep + shared runners).
