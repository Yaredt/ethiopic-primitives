---
description: "Task list for Ge'ez Numerals implementation"
---

# Tasks: Ge'ez Numerals

**Input**: Design documents from `specs/003-geez-numerals/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/numerals-api.md](contracts/numerals-api.md)

**Tests**: Test tasks ARE included — but only the kinds the constitution permits: **error-contract**, **round-trip self-consistency**, and **cross-language parity**. No task asserts a hand-authored numeral value; conformance values come only from the external `tests/vectors/numerals.json` (Principle I). Value-gating acceptance is deferred until that fixture exists (Principle IX).

**Organization**: Grouped by the four user stories from spec.md. This is a small, self-contained module (`numerals.ts` / `numerals.py`) with no calendar dependency; render and parse are inverses, so US2 builds on US1's canonical form.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1/US2/US3/US4 (setup, foundational, and polish tasks carry no story label)

## Path Conventions

Multi-language library. JS lives in `javascript/src/` + `javascript/test/`; Python in `python/src/ethiopic_primitives/` + `python/tests/`; shared tooling in `tools/`; external vectors in `tests/vectors/`. On this machine the real Python interpreter is `C:\Python314\python.exe` (bare `python`/`python3` are broken Store stubs).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new module in each existing package and wire it into the public surface.

- [X] T001 [P] Create `javascript/src/numerals.ts` with `class GeezNumeralError extends RangeError` (carrying a `reason: string`) and empty exports for `toGeez`, `fromGeez`, `formatMoney`
- [X] T002 [P] Create `python/src/ethiopic_primitives/numerals.py` with `class GeezNumeralError(ValueError)` (with a `reason` attribute) and stub `to_geez`, `from_geez`, `format_money`
- [X] T003 [P] Add a `"numerals-vectors"` npm script to `javascript/package.json` (mirrors the existing `fiscal-vectors` script, pointing at `test/run_numerals_vectors.ts`)
- [X] T004 [P] Export the numeral surface (`toGeez`, `fromGeez`, `formatMoney`, `GeezNumeralError`) from `javascript/src/index.ts` (after T001)
- [X] T005 [P] Export the numeral surface (`to_geez`, `from_geez`, `format_money`, `GeezNumeralError`) from `python/src/ethiopic_primitives/__init__.py` and its `__all__` (after T002)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The glyph inventory and the closed-domain validator that every user story depends on.

**⚠️ CRITICAL**: No render/parse/money work can begin until this phase is complete.

- [X] T006 [P] Define the Ge'ez glyph inventory in `javascript/src/numerals.ts` — units ፩–፱ (U+1369–U+1371), tens ፲–፺ (U+1372–U+137A), hundred ፻ (U+137B), ten-thousand ፼ (U+137C) — plus the `reason` code constants (`zero`, `negative`, `non_integer`, `out_of_range`, `empty`, `invalid_char`, `non_canonical`)
- [X] T007 [P] Define the same glyph inventory tables and `reason` constants in `python/src/ethiopic_primitives/numerals.py`
- [X] T008 Implement the integer-domain validator in `javascript/src/numerals.ts` — rejects `0`→`zero`, `<0`→`negative`, non-exact-integer/NaN/±∞→`non_integer`, `>99_999_999`→`out_of_range` (after T006)
- [X] T009 [P] Implement the integer-domain validator in `python/src/ethiopic_primitives/numerals.py` with the same reason mapping (after T007)

**Checkpoint**: Both languages share the glyph tables, error type, and domain guard — user stories can begin.

---

## Phase 3: User Story 1 - Render an integer as Ge'ez numerals (Priority: P1) 🎯 MVP

**Goal**: `to_geez(n)` renders any integer 1–99,999,999 to its single canonical Ge'ez string (pair-wise myriad grouping, ፻/፼ separators, leading-1 omission).

**Independent Test**: For a boundary+dense set of in-range integers, every output is non-empty and uses only inventory glyphs; `to_geez(0)` raises `zero` and never returns ፩ or empty.

- [X] T010 [US1] Implement `toGeez` in `javascript/src/numerals.ts` — pair-wise myriad grouping with ፻ (100) and ፼ (10,000) separators and mandatory leading-1 omission (100→፻, 10,000→፼), per research R1/R2 (after T008)
- [X] T011 [P] [US1] Implement `to_geez` in `python/src/ethiopic_primitives/numerals.py` with the identical algorithm (after T009)
- [X] T012 [P] [US1] Add render error-contract + shape tests in `javascript/test/numerals.test.ts` — `toGeez(0)`→`zero` (never ፩/empty), `-5`→`negative`, `3.5`→`non_integer`, `100000000`→`out_of_range`; and every in-range sample yields a non-empty string of inventory glyphs only. No expected glyph values asserted.
- [X] T013 [P] [US1] Add the same render error-contract + shape tests in `python/tests/test_numerals.py`

**Checkpoint**: Rendering works and refuses the closed-domain violations for the render direction.

---

## Phase 4: User Story 2 - Parse Ge'ez numerals back to an integer (Priority: P1)

**Goal**: `from_geez(s)` is the exact inverse of `to_geez` (strict bijection); non-canonical/malformed input is rejected.

**Independent Test**: `from_geez(to_geez(n)) == n` across a boundary+dense sample; `from_geez("")`→`empty`, a non-glyph char→`invalid_char`, and ፩፻ (non-canonical for 100)→`non_canonical`.

- [X] T014 [US2] Implement `fromGeez` in `javascript/src/numerals.ts` — scan the canonical grouping and reject any arrangement `toGeez` would never emit; reasons `empty` / `invalid_char` / `non_canonical` / `out_of_range` (after T010)
- [X] T015 [P] [US2] Implement `from_geez` in `python/src/ethiopic_primitives/numerals.py` with identical acceptance rules (after T011)
- [X] T016 [P] [US2] Add round-trip + parse-error tests in `javascript/test/numerals.test.ts` — `fromGeez(toGeez(n)) === n` over all boundaries (powers of ten, …99→…00 transitions, interior-zero/two-group cases per R1, 1, 99,999,999, every single-glyph value) plus a fixed-stride dense sample (same stride as T024); and the parse error contracts incl. ፩፻→`non_canonical`. Round-trip only; no authored values.
- [X] T017 [P] [US2] Add the same round-trip + parse-error tests in `python/tests/test_numerals.py`

**Checkpoint**: Render and parse are mutual inverses in both languages (the core self-consistency guarantee).

---

## Phase 5: User Story 3 - Closed domain & Arabic-default money (Priority: P1)

**Goal**: The domain stays closed (no zero/negative/fraction — already guarded in Phase 2/US1) and `format_money` defaults to Arabic, with an opt-in Ge'ez whole-number mode that never calls `to_geez(0)`.

**Independent Test**: `format_money(x)` yields Arabic by default; `format_money(x, geez)` renders the whole part in Ge'ez with Arabic sub-units; a 0 whole-part stays Arabic `0`; an invalid `numerals` option raises `invalid_char`.

- [X] T018 [US3] Implement `formatMoney(amount, options?)` in `javascript/src/numerals.ts` — default `numerals:"arabic"`; `"geez"` renders only the whole-number part via `toGeez`, sub-units stay Arabic, whole-part 0 stays Arabic `0`; unknown `numerals` value → `GeezNumeralError` `invalid_char` (after T010)
- [X] T019 [P] [US3] Implement `format_money(amount, *, numerals="arabic")` in `python/src/ethiopic_primitives/numerals.py` with identical behavior (after T011)
- [X] T020 [P] [US3] Add money + closed-domain tests in `javascript/test/numerals.test.ts` — default is Arabic; geez mode renders whole part only; `to_geez(0)` never returns ፩/empty; invalid option raises. No authored numeral values.
- [X] T021 [P] [US3] Add the same money + closed-domain tests in `python/tests/test_numerals.py`

**Checkpoint**: Principle VII fully satisfied and independently demonstrable.

---

## Phase 6: User Story 4 - Same numeral answers in every language (Priority: P2)

**Goal**: Both languages run the same (future) fixture and provably agree now via a parity sweep.

**Independent Test**: The parity sweep reports zero JS↔PY mismatches both directions; the vector runners skip cleanly (exit 0) while `numerals.json` is absent and would execute it once present.

- [X] T022 [US4] Create `javascript/test/run_numerals_vectors.ts` — load `tests/vectors/numerals.json` if present and run both directions against the gating set; **skip with exit 0** (clearly logged) when the file is absent (mirror `run_fiscal_vectors.ts`)
- [X] T023 [P] [US4] Create `python/tests/run_numerals_vectors.py` with the same present/absent behavior (mirror `run_fiscal_vectors.py`)
- [X] T024 [US4] Create `tools/numerals_parity.py` — sweep the domain and compare JS vs Python outputs in **both** directions, printing `PARITY: PASS`/`FAIL` (model on `tools/fiscal_parity.py`). The boundary set MUST enumerate the interior-zero / two-group hotspots from research R1 & analysis U1: every power of ten (10 … 10⁷), each ten-thousands boundary where `low == 0` (10000, 20000, …), `high > 0` with `low` in {1, 99, 100} (e.g. 10001, 10100), hundreds-digit-zero cases, all …99→…00 transitions, and 1 / 99,999,999 — plus a fixed-stride dense sample (stride documented in the file). Deterministic and reproducible.
- [X] T025 [US4] Extend `tools/cross_runner.py` — add the JS and PY numeral vector runners and the numeral parity sweep to the `jobs` list, so the build fails on any gating failure or JS↔PY divergence (after T022, T023, T024)

**Checkpoint**: Cross-language agreement is demonstrable now; value-gating turns on automatically when the fixture lands.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T026 [P] Add an `--exhaustive` mode to `tools/numerals_parity.py` that runs the full 1–99,999,999 round-trip in each language (feasible: cheap integer ops) for the Principle IX release sweep
- [X] T027 [P] Document the numeral surface in `javascript/README.md` and `python/README.md` (functions, closed domain, Arabic-default money)
- [X] T028 Run `javascript` build (`npm run build`) then the full quickstart validation (`npm test`, `C:\Python314\python.exe -m unittest discover -s python/tests -p "test_*.py"`, `C:\Python314\python.exe tools/cross_runner.py`) and confirm numeral vector runners skip cleanly while `numerals.json` is absent — see [quickstart.md](quickstart.md)
- [X] T029 [P] Record the two open **release-blockers** in the PR description's principle checklist (Development Workflow) — release is prohibited until both clear: (a) the external `tests/vectors/numerals.json` lands with Tier-2 CLDR/Unicode provenance and passes both languages' gating set (Principles I, II, IX); (b) the Principle III package-measurement step (research R5) runs against that fixture and either adopts a passing package or cites its measured failure. Neither is "polish" — both gate public release.
- [X] T030 [P] Add an SC-006 enforcement check (test or CI script) that scans `javascript/test/numerals.test.ts` and `python/tests/test_numerals.py` for Ethiopic-numeral literals (U+1369–U+137C) inside assertions and **fails** if any are found — turning "no agent-authored numeral values" (Principle I) into an automated guarantee and closing the risk that the R1 reference illustrations migrate into tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: after Setup — BLOCKS all user stories.
- **US1 (Phase 3)**: after Foundational. The MVP.
- **US2 (Phase 4)**: after US1 (parse is the inverse of the canonical renderer).
- **US3 (Phase 5)**: after US1 (money reuses the renderer); independent of US2.
- **US4 (Phase 6)**: after US1/US2 exist to sweep; runner stubs (T022/T023) can be written any time after Setup.
- **Polish (Phase 7)**: after the stories it touches.

### Within Each Language Track

- `numerals.ts` tasks (T006→T008→T010→T014→T018) are sequential — same file.
- `numerals.py` tasks (T007→T009→T011→T015→T019) are sequential — same file.
- The two language tracks are independent of each other → the `[P]` PY task in each pair runs alongside its JS sibling.

### Parallel Opportunities

- Setup: T001–T005 all `[P]` (distinct files).
- Each story's PY implementation is `[P]` with its JS sibling; each story's two test tasks are `[P]` with each other and with the implementations once the functions exist.
- US4 runners T022/T023 are `[P]`; T024 is independent tooling; T025 depends on all three.
- Polish: T026, T027, T029, T030 are `[P]`; T028 runs last (it executes the suite the others may touch).

---

## Parallel Example: User Story 1

```bash
# The two language implementations proceed in parallel (different files):
Task: "Implement toGeez in javascript/src/numerals.ts"          # T010
Task: "Implement to_geez in python/src/ethiopic_primitives/numerals.py"  # T011 [P]

# Then each language's render tests, in parallel:
Task: "Render error-contract + shape tests in javascript/test/numerals.test.ts"  # T012 [P]
Task: "Render error-contract + shape tests in python/tests/test_numerals.py"     # T013 [P]
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 US1 (render).
2. **STOP and VALIDATE**: `toGeez`/`to_geez` produce inventory-only strings and refuse `0`/negatives/fractions/over-range.
3. US1 alone is a usable renderer; adding US2 (parse) completes the round-trip guarantee that makes the primitive verifiable.

### Incremental Delivery

1. Setup + Foundational → shared guard ready.
2. US1 → render (MVP) → validate.
3. US2 → parse → round-trip bijection provable.
4. US3 → Arabic-default money + closed-domain consolidation.
5. US4 → cross-language parity + fixture-ready runners.
6. Polish → exhaustive sweep, docs, release-gate notes.

### Acceptance is NOT the green suite (Principle IX)

Passing these tasks yields a working, self-consistent module. **Final acceptance additionally requires** the externally authored `tests/vectors/numerals.json` to pass in both languages AND the exhaustive round-trip sweep with zero exceptions — plus the Principle III package-measurement step (R5) before public release. None of that is agent-authored.

---

## Notes

- `[P]` = different files, no incomplete dependency.
- No test asserts a hand-authored numeral value (Principle I); tests are error-contract, round-trip, and parity only.
- Commit after each task or logical group; keep JS and PY behavior identical (Principle X).
- Never let `format_money` or any path call `to_geez(0)` (Principle VII).
