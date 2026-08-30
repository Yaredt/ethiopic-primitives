---
description: "Task list for Calendar Correctness Core"
---

# Tasks: Calendar Correctness Core

**Input**: Design documents from `specs/001-calendar-core/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/calendar-api.md, quickstart.md

**Tests**: Included. The constitution *mandates* fixture-driven conformance runners (Principles I, IX, X), so runner tasks are first-class here — but note Principle I forbids authoring conversion assertions; runner tasks only *consume* the read-only fixture and check self-consistency.

**Organization**: Grouped by user story from spec.md. Priorities: US1 (P1) conversion, US2 (P1) Pagumē, US3 (P1) cross-language, US4 (P2) everyday operations.

**Status**: ⚠️ **Backfill.** This feature was implemented before its paper trail. Every task below is already complete and verified (`python tools/cross_runner.py` → all PASS). Boxes are checked to reflect reality; the value of this file is traceability for the next features.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Establish repo layout: shared fixture at `tests/vectors/`, sibling packages `javascript/` and `python/`, cross-cutting `tools/` (per plan.md Structure Decision)
- [x] T002 [P] Initialize TypeScript package in `javascript/package.json` + `javascript/tsconfig.json` (Node ≥22 native TS, `rewriteRelativeImportExtensions` for `dist/`)
- [x] T003 [P] Initialize Python package in `python/pyproject.toml` declaring `py-ethiopian-date-converter==0.1.1` as the conversion dependency (Principle III)
- [x] T004 [P] Add `.gitignore` entries for `node_modules/`, `dist/`, `__pycache__/`

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Blocks all user stories.

- [x] T005 Confirm the read-only fixture `tests/vectors/calendar.json` is present and untouched (182 vectors, 181 gating) — never authored or modified (Principle I)
- [x] T006 [P] Implement Gregorian ↔ Julian Day Number in `javascript/src/jdn.ts` (proleptic Gregorian; integer-only; no Date/timezone — Principle VIII)
- [x] T007 [P] Implement the JS fixture loader in `javascript/test/harness.ts` (loads the shared fixture; contains no authored conversion value)
- [x] T008 Verify the reference oracle `tools/full_sweep.py` and provenance gate `tools/check_provenance.py` run green as the independent baseline

**Checkpoint**: Foundation ready — user stories can proceed.

---

## Phase 3: User Story 1 — Correct conversion, both directions (Priority: P1) 🎯 MVP

**Goal**: Bidirectional Ethiopian ↔ Gregorian conversion that matches every gating vector.

**Independent Test**: `cd javascript && npm run vectors` and `python python/tests/run_vectors.py` both report 0 gating failures.

- [x] T009 [US1] Implement `EthiopianDate`, `Era`, epoch `1724221`, Ethiopic↔JDN and Gregorian conversion in `javascript/src/calendar.ts` (ported from the verified reference — research.md Decision 1–2)
- [x] T010 [US1] Export the public surface in `javascript/src/index.ts` per `contracts/calendar-api.md`
- [x] T011 [US1] Implement the thin Python wrapper in `python/src/ethiopic_primitives/calendar.py` — delegate conversion to the dependency, never reimplement (Principle III)
- [x] T012 [US1] Export the Python surface in `python/src/ethiopic_primitives/__init__.py`
- [x] T013 [P] [US1] JS conformance runner `javascript/test/run_vectors.ts` — both directions, gating-only exit code (consumes fixture only, Principle I)
- [x] T014 [P] [US1] Python conformance runner `python/tests/run_vectors.py` — both directions, per-vector guard for the non-gating epoch boundary

**Checkpoint**: US1 functional — all 181 gating vectors pass in both languages.

---

## Phase 4: User Story 2 — Pagumē (month 13) is never lost (Priority: P1)

**Goal**: Month 13 is a first-class, convertible value in every type (Principle VI).

**Independent Test**: The Pagumē vectors (leap 6-day and non-leap 5-day) pass in both runners; constructing Pagumē 6 in a non-leap year raises.

- [x] T015 [US2] Ensure `month` accepts 1..13 and `daysInMonth` yields 5/6 for month 13 by leap rule in `javascript/src/calendar.ts` (no return type collapses month 13)
- [x] T016 [US2] Ensure the Python `EthiopianDate` carries `month: 1..13` and never returns `datetime.date` for the Ethiopian type in `python/src/ethiopic_primitives/calendar.py`
- [x] T017 [P] [US2] Contract check: month-13 constructible / non-leap Pagumē-6 rejected — `javascript/test/calendar.test.ts` and `python/tests/test_calendar.py` (error contract only, not an authored calendar value)

**Checkpoint**: US2 functional — Pagumē integrity proven by fixtures.

---

## Phase 5: User Story 3 — The same fixtures verify every language (Priority: P1)

**Goal**: Both languages run the identical fixture and agree on the gating set; divergence blocks the build (Principle X).

**Independent Test**: `python tools/cross_runner.py` prints `AGREE` and exits 0.

- [x] T018 [US3] Implement the cross-language harness `tools/cross_runner.py` — runs provenance, reference sweep, both vector runners, both sweeps; fails on any gating failure or JS↔PY divergence
- [x] T019 [US3] Add CI jobs (`javascript`, `python`, `cross-language`) to `.github/workflows/conformance.yml`, preserving the existing I/II/IX jobs
- [x] T020 [US3] Document the one known non-gating divergence (epoch year 1, Python dependency limit) in `python/README.md` and `contracts/calendar-api.md`

**Checkpoint**: US3 functional — cross-language agreement enforced in CI.

---

## Phase 6: User Story 4 — Everyday date operations (Priority: P2)

**Goal**: Day/month arithmetic, weekday, leap predicate, era conversion — self-consistent, no authored values.

**Independent Test**: `npm test` and `python -m unittest` pass; add-then-subtract returns the original; era round-trips preserve the JDN.

- [x] T021 [P] [US4] JS arithmetic/predicates in `javascript/src/calendar.ts`: `addDays`, `addMonths` (day-clamping), `daysUntil`, `weekday`, `isLeapYear`, `toEra`, `toString`
- [x] T022 [P] [US4] Python arithmetic/predicates in `python/src/ethiopic_primitives/calendar.py`: `add_days`, `add_months` (day-clamping via `ethiopian_month_length`), `days_until`, `weekday`, `is_leap_year`, `to_era`, `__str__` — `add_months` verified identical to TS across 3,990 cases
- [x] T023 [P] [US4] JS Principle IX sweep runner `javascript/test/run_sweep.ts` (both directions, zero tolerance)
- [x] T024 [P] [US4] Python Principle IX sweep runner `python/tests/run_sweep.py`
- [x] T025 [P] [US4] JS `node:test` contract suite `javascript/test/calendar.test.ts` (wiring, error contracts, self-consistency, immutability, era offset)
- [x] T026 [P] [US4] Python `unittest` contract suite `python/tests/test_calendar.py`

**Checkpoint**: US4 functional — full operation surface, both languages green.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T027 [P] Package READMEs: `javascript/README.md`, `python/README.md`
- [x] T028 [P] Permissive licence `LICENSE` (MIT, per constitution) + root `README.md` status/layout update
- [x] T029 [P] Emit and smoke-test the compiled `javascript/dist/` (`npm run build`; import from `dist/` works)
- [x] T030 Run `specs/001-calendar-core/quickstart.md` end-to-end — `python tools/cross_runner.py` all PASS, `AGREE`

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2)** → **US1/US2/US3 (all P1)** → **US4 (P2)** → **Polish**.
- US1 is the MVP. US2 and US3 build directly on US1's conversion core; US4 builds on US1's date type. US3's cross-runner depends on both language runners existing (US1, T013/T014).
- Within a language, model/conversion (T009/T011) precede runners (T013/T014) and contract tests (T017/T025/T026).

## Parallel Opportunities

- T002/T003/T004 (setup) parallel across the two packages.
- T006/T007 (JS foundation) parallel with the Python foundation.
- The two languages' implementation tracks (JS: T009/T010/T013 vs PY: T011/T012/T014) are fully parallel until the cross-runner (T018) joins them.

## Implementation Strategy

- **MVP** = Phases 1–3 (US1): correct bidirectional conversion in both languages, gating vectors green.
- **Correctness-complete** = add US2 (Pagumē) and US3 (cross-language enforcement) — this is the state the constitution treats as releasable-modulo-Principle-II.
- **Usable** = add US4 (everyday operations).

## Notes

- Principle II (Tier-1 provenance) still blocks *public release*; it is not a task in this feature — it is a human provenance-lookup tracked in the root README's "Known blocker".
- Out of scope here, becoming the next features: fiscal logic, Ge'ez numerals, script equivalence, and calendar format/parse.
