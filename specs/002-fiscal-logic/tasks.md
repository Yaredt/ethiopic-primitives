---
description: "Task list for Fiscal Logic"
---

# Tasks: Fiscal Logic

**Input**: Design documents from `specs/002-fiscal-logic/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/fiscal-api.md, quickstart.md; feature 001 (calendar core) present.

**Tests**: Included, but constrained by Principle I — tests assert **only** error contracts and self-consistency, never a hand-authored fiscal value. The authored `tests/vectors/fiscal.json` (user-supplied, not in this feature) is the sole source of fiscal-value acceptance.

**Organization**: By user story. US1 (P1) fiscal year + bounds · US2 (P1) quarter + period · US3 (P1) aging · US4 (P2) cross-language.

**Status**: ✅ Implemented and verified (cross-runner all PASS, fiscal rows SKIP pending the fixture; JS↔PY parity clean over 1985–2035). Convention defaults A1/A2/A3 (research.md) are isolated so a later fixture can flip one in a single file. Acceptance is not final until the authored `tests/vectors/fiscal.json` gates it.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 [P] Create TS fiscal scaffolds: empty `javascript/src/fiscal.ts` and `javascript/src/fiscal-convention.ts`; add fiscal exports to `javascript/src/index.ts`
- [x] T002 [P] Create Python fiscal scaffold: empty `python/src/ethiopic_primitives/fiscal.py`; add fiscal exports to `python/src/ethiopic_primitives/__init__.py`
- [x] T003 [P] Add the `fiscal-vectors` script entry to `javascript/package.json` (parity is a Python tool, `tools/fiscal_parity.py`, not an npm script)

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: The convention layer and calendar-core wiring block every user story.

- [x] T004 [P] Implement the TS convention layer in `javascript/src/fiscal-convention.ts`: `labelForStartYear` (A1), `periodOf(month)` (A2), `quarterOf(month)` (A3, Pagumē→Q1) — the single swap point (data-model.md FiscalConvention)
- [x] T005 [P] Implement the Python convention block in `python/src/ethiopic_primitives/fiscal.py` mirroring A1/A2/A3 exactly
- [x] T006 Confirm both fiscal modules import the feature-001 calendar core and perform NO independent conversion/day-counting (Principle III) — day math uses `EthiopianDate.toJdn`/`daysUntil`
- [x] T007 [P] Fiscal-vector loading that resolves `tests/vectors/fiscal.json` and **skips cleanly when absent** — implemented inline in the runners `javascript/test/run_fiscal_vectors.ts` and `python/tests/run_fiscal_vectors.py` (no separate harness file needed)

**Checkpoint**: Conventions and calendar-core wiring ready.

---

## Phase 3: User Story 1 — Fiscal year & bounds (Priority: P1) 🎯 MVP

**Goal**: Locate any date in its Hamle 1 – Sene 30 fiscal year and return a fiscal year's bounds.

**Independent Test**: `fiscalYearFor` is stable within a year and increments only at Hamle 1; `fiscalYearBounds(fy)` returns Hamle 1 / Sene 30 that bracket every date labelled `fy` (self-consistency, no authored value).

- [x] T008 [US1] Implement `fiscalYearFor(date)` and `fiscalYearBounds(fy)` in `javascript/src/fiscal.ts` (uses convention A1; bounds = Hamle 1 of Y … Sene 30 of Y+1)
- [x] T009 [US1] Implement `fiscal_year_for(date)` and `fiscal_year_bounds(fy)` in `python/src/ethiopic_primitives/fiscal.py`
- [x] T010 [P] [US1] Self-consistency tests (round-trip: every date in `bounds(fy)` re-labels to `fy`; label changes only at Hamle 1) in `javascript/test/fiscal.test.ts` and `python/tests/test_fiscal.py`

**Checkpoint**: US1 functional and self-consistent in both languages.

---

## Phase 4: User Story 2 — Quarter & period, Pagumē distinct (Priority: P1)

**Goal**: `fiscalQuarter` (1–4) and `fiscalPeriod` (1–13) with Pagumē as its own period.

**Independent Test**: Over a full fiscal year every date maps to exactly one quarter and one period; Pagumē's period differs from every 30-day month's period.

- [x] T011 [US2] Implement `fiscalQuarter(date)` and `fiscalPeriod(date)` in `javascript/src/fiscal.ts` (conventions A3, A2)
- [x] T012 [US2] Implement `fiscal_quarter(date)` and `fiscal_period(date)` in `python/src/ethiopic_primitives/fiscal.py`
- [x] T013 [P] [US2] Self-consistency tests (total coverage 1–4 and 1–13; Pagumē period ∉ {30-day-month periods}) in `javascript/test/fiscal.test.ts` and `python/tests/test_fiscal.py`

**Checkpoint**: US2 functional; Pagumē integrity holds (SC-003).

---

## Phase 5: User Story 3 — Aging across Pagumē (Priority: P1)

**Goal**: `agingBucket(invoice, asOf, buckets=[30,60,90])` in real days; backward span raises.

**Independent Test**: `days` equals the calendar core's `daysUntil`; a span crossing Pagumē differs from a 30-day-month estimate by Pagumē's real length; `asOf < invoice` raises.

- [x] T014 [US3] Implement `agingBucket` in `javascript/src/fiscal.ts` (real days via calendar core; overflow bucket; raise on backward span — research.md Decision 5)
- [x] T015 [US3] Implement `aging_bucket` in `python/src/ethiopic_primitives/fiscal.py` (default `buckets=[30,60,90]`)
- [x] T016 [P] [US3] Self-consistency + error-contract tests (`days == daysUntil`; backward span raises; custom thresholds respected) in `javascript/test/fiscal.test.ts` and `python/tests/test_fiscal.py`

**Checkpoint**: US3 functional; aging fidelity holds (SC-004).

---

## Phase 6: User Story 4 — Cross-language agreement (Priority: P2)

**Goal**: Both languages give identical fiscal answers; enforce it in CI; run `fiscal.json` when present.

**Independent Test**: `tools/fiscal_parity.py` reports 0 mismatches across a decade; the cross-runner shows fiscal rows (SKIP without the fixture, PASS/FAIL with it).

- [x] T017 [US4] Implement `tools/fiscal_parity.py` — generate a decade of dates, call every fiscal function in both languages, assert identical outputs (asserts JS==PY only, never an authored value)
- [x] T018 [US4] Implement the fiscal-vector runners `javascript/test/run_fiscal_vectors.ts` and `python/tests/run_fiscal_vectors.py` — consume `fiscal.json`, skip cleanly if absent
- [x] T019 [US4] Extend `tools/cross_runner.py` with the two fiscal-vector runners and the parity sweep; fiscal rows report SKIP when the fixture is missing, gate when present
- [x] T020 [US4] Extend `.github/workflows/conformance.yml`: add fiscal parity + fiscal-vector steps to the `javascript`, `python`, and `cross-language` jobs

**Checkpoint**: US4 functional; Principle X demonstrable now (parity) and gating later (fixture).

---

## Phase 7: Polish & Cross-Cutting

- [x] T021 [P] Document the fiscal surface + the A1/A2/A3 conventions and how a `fiscal.json` correction flows to one file, in `javascript/README.md` and `python/README.md`
- [x] T022 [P] Update root `README.md` status/layout to add the fiscal module and the pending `tests/vectors/fiscal.json` slot
- [x] T023 Run `specs/002-fiscal-logic/quickstart.md` end-to-end: `python tools/fiscal_parity.py` clean, both contract suites green, `tools/cross_runner.py` all PASS with fiscal rows SKIP

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2, convention layer + loader)** → **US1 → US2 → US3** (each builds on the calendar core and convention layer; US2/US3 are independent of US1 but share the module) → **US4** (needs the functions to exist) → **Polish**.
- Within a story, TS and Python tracks are parallel until US4's parity/cross-runner joins them.

## Parallel Opportunities

- T001/T002/T003 (setup) and T004/T005 (conventions) parallel across languages.
- Each story's `[P]` test task runs parallel to the other language's implementation.
- The entire TS track and Python track for US1–US3 can proceed in parallel, meeting at T017/T019.

## Implementation Strategy

- **MVP** = Phases 1–3 (US1): fiscal year + bounds, both languages, self-consistent.
- **Fiscal-complete (pre-fixture)** = add US2, US3, US4 → all functions present, cross-language parity proven, ready to be gated.
- **Accepted** = user supplies `tests/vectors/fiscal.json`; fiscal rows in the cross-runner turn green (or a convention is corrected in one file and they turn green).

## Notes

- Principle I: no task authors a fiscal value; the only value-bearing acceptance is the external fixture.
- A1/A2/A3 live solely in the convention layer (T004/T005) — a fixture disagreement is a one-file fix, never a fiscal-function rewrite.
- Principle II (Tier-1 provenance) and the format/parse + numerals + equivalence modules remain outside this feature.
