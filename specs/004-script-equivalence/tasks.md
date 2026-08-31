---
description: "Task list for Ge'ez-Script Equivalence & Folding implementation"
---

# Tasks: Ge'ez-Script Equivalence & Folding

**Input**: Design documents from `specs/004-script-equivalence/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/equivalence-api.md](contracts/equivalence-api.md)

**Tests**: Test tasks ARE included — but only the kinds the constitution permits: **structural invariants**, **error/acknowledge contracts**, and **cross-language parity**. No task asserts a hand-authored equivalence-class membership or folded value; conformance comes only from the external `tests/vectors/folding.json` (Principle I). Value-gating acceptance is deferred until that fixture exists (Principle IX).

**Organization**: Grouped by the five user stories from spec.md. A fourth self-contained module (`equivalence.ts` / `equivalence.py`) with no calendar/fiscal/numeral dependency. Folding is length-preserving 1:1; the orthography-derived class tables live in one unit per language.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1/US2/US3/US4/US5 (setup, foundational, and polish tasks carry no story label)

## Path Conventions

Multi-language library. JS in `javascript/src/` + `javascript/test/`; Python in `python/src/ethiopic_primitives/` + `python/tests/`; shared tooling in `tools/`; external vectors in `tests/vectors/`. On this machine the real Python interpreter is `C:\Python314\python.exe` (bare `python`/`python3` are broken Store stubs).

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] Create `javascript/src/equivalence.ts` with `class EquivalenceError extends Error` (carrying `reason: string`), `Language` and `FoldScheme` const objects (no default member), a `FoldResult` type, and empty exports for `fold`, `equal`, `foldedEqual`, `keysEqual`
- [ ] T002 [P] Create `python/src/ethiopic_primitives/equivalence.py` with `class EquivalenceError(ValueError)` (with `reason`), `Language`/`FoldScheme` enums, a `FoldResult` dataclass, and stub `fold`, `equal`, `folded_equal`, `keys_equal`
- [ ] T003 [P] Add an `"equivalence-vectors"` npm script to `javascript/package.json` (mirrors `numerals-vectors`, pointing at `test/run_equivalence_vectors.ts`)
- [ ] T004 [P] Export the equivalence surface (`fold`, `equal`, `foldedEqual`, `keysEqual`, `Language`, `FoldScheme`, `EquivalenceError`, `FoldResult`) from `javascript/src/index.ts` (after T001)
- [ ] T005 [P] Export the equivalence surface from `python/src/ethiopic_primitives/__init__.py` and its `__all__` (after T002)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The orthography-derived class tables and the language/scheme/acknowledgement guards that every user story depends on.

**⚠️ CRITICAL**: No fold/compare work can begin until this phase is complete.

- [ ] T006 Create `javascript/src/equivalence-classes.ts` — the `H_ONLY` and `HSL` maps (fidäl code point → class representative) **derived from documented Amharic/Tigrinya orthographic homophone data** (a cited linguistic reference and/or the Unicode Ethiopic block documentation — NOT ICU/CLDR collation, which keeps homophone letters distinct) with a provenance comment citing the source (research R1); the single swap point. Non-fidäl characters are absent (fold to themselves)
- [ ] T007 [P] Create `python/src/ethiopic_primitives/_equivalence_classes.py` — mirror the same tables and provenance comment
- [ ] T008 Implement the argument guards in `javascript/src/equivalence.ts` — reject missing language→`missing_language`, unknown→`unknown_language`, missing scheme→`missing_scheme`, unknown→`unknown_scheme`, `GE_EZ` fold→`geez_not_foldable`, unacknowledged `TIGRINYA` fold→`tigrinya_requires_ack` (after T001, T006)
- [ ] T009 [P] Implement the same guards in `python/src/ethiopic_primitives/equivalence.py` (after T002, T007)

**Checkpoint**: Both languages share the class tables, the error type, and the Principle IV/V guards — user stories can begin.

---

## Phase 3: User Story 1 - Fold text, keeping the original intact (Priority: P1) 🎯 MVP

**Goal**: `fold(text, AMHARIC, scheme)` returns a `FoldResult` — folded string, per-position offset map, scheme, language — length-preserving 1:1, leaving the input unchanged.

**Independent Test**: For Amharic inputs, `folded.length == input.length == offsets.length`, the offset map traces every folded position back to its source, the input is unmodified, homophone variants fold to equal keys, and distinct words do not collide.

- [ ] T010 [US1] Implement `fold` in `javascript/src/equivalence.ts` — per-character class lookup (length-preserving), build `FoldResult` with an identity offset map, non-fidäl pass-through (incl. Ge'ez numerals U+1369–U+137C), input never mutated (after T008)
- [ ] T011 [P] [US1] Implement `fold` in `python/src/ethiopic_primitives/equivalence.py` with the identical algorithm (after T009)
- [ ] T012 [P] [US1] Add **membership-free** structural tests in `javascript/test/equivalence.test.ts` — length invariants (`folded.length === input.length === offsets.length`), offset-map fidelity (identity in v1), input-unchanged, **determinism** (same input → same output), **idempotence** (`fold(fold(x)).folded === fold(x).folded`), and non-fidäl pass-through (a string of only ASCII/digits/punctuation/Ge'ez numerals, built from code points, folds to itself with an identity map). Do NOT assert that two **distinct** inputs fold equal — which characters collate is fixture-owned (Principle I / FR-011). No glyph literals.
- [ ] T013 [P] [US1] Add the same structural tests in `python/tests/test_equivalence.py` (fidäl inputs via `chr`)

**Checkpoint**: Folding works for Amharic and returns the immutable parallel representation (Principle V).

---

## Phase 4: User Story 2 - Language explicit; Ge'ez refuses to fold (Priority: P1)

**Goal**: No default/inference for language; `GE_EZ` raises on any fold but is valid for the non-lossy `equal`.

**Independent Test**: Omitting the language raises; `fold(..., GE_EZ, ...)` raises `geez_not_foldable` and returns nothing; `equal(a, b, GE_EZ)` returns a boolean and never raises.

- [ ] T014 [US2] Implement `equal` (non-lossy code-point equality, valid for every language incl. `GE_EZ`) in `javascript/src/equivalence.ts`, and confirm the guards from T008 fire for missing/unknown language and `GE_EZ` fold (after T010)
- [ ] T015 [P] [US2] Implement `equal` in `python/src/ethiopic_primitives/equivalence.py` (after T011)
- [ ] T016 [P] [US2] Add error-contract tests in `javascript/test/equivalence.test.ts` — missing language→`missing_language`, unknown→`unknown_language`, `fold(..., GE_EZ, ...)`→`geez_not_foldable`; `equal(a, b, GE_EZ)` returns a boolean and never raises for Ge'ez
- [ ] T017 [P] [US2] Add the same error-contract tests in `python/tests/test_equivalence.py`

**Checkpoint**: Principle IV's explicit-language and Ge'ez-refusal rules are enforced and demonstrable.

---

## Phase 5: User Story 3 - Tigrinya folding requires acknowledgement (Priority: P1)

**Goal**: A Tigrinya fold raises unless the caller passes an explicit lossy acknowledgement; with it, the fold proceeds and records the scheme.

**Independent Test**: Tigrinya fold without acknowledgement raises `tigrinya_requires_ack`; with acknowledgement it returns a `FoldResult` tagged with the scheme; two Tigrinya strings differing only by one glottal character are unequal under `equal` but equal under an acknowledged fold.

- [ ] T018 [US3] Wire the Tigrinya acknowledgement path in `javascript/src/equivalence.ts` — `fold(..., TIGRINYA, scheme, { acknowledgeLossy: true })` proceeds; without the flag it raises `tigrinya_requires_ack` (after T014)
- [ ] T019 [P] [US3] Mirror with `acknowledge_lossy=False` default in `python/src/ethiopic_primitives/equivalence.py` (after T015)
- [ ] T020 [P] [US3] Add acknowledge tests in `javascript/test/equivalence.test.ts` — unacknowledged Tigrinya→`tigrinya_requires_ack`; an acknowledged Tigrinya fold returns a `FoldResult` tagged with the scheme and length-preserving; `foldedEqual(x, x, TIGRINYA, scheme, { acknowledgeLossy: true })` is reflexively `true`. Do NOT assert that two distinct glottal characters collate under HSL — that is class membership, fixture-owned (Principle I / FR-011).
- [ ] T021 [P] [US3] Add the same acknowledge tests in `python/tests/test_equivalence.py`

**Checkpoint**: The highest-risk silent-loss case is a conscious, auditable caller decision.

---

## Phase 6: User Story 4 - Scheme always named; comparisons are scheme-safe (Priority: P2)

**Goal**: Every folded result carries an explicit `H_ONLY`/`HSL` (no `DEFAULT`); `foldedEqual` and `keysEqual` exist; cross-scheme key comparison is surfaced, not silently answered.

**Independent Test**: Every `FoldResult` carries an explicit scheme; `H_ONLY` and `HSL` produce distinguishable keys where families differ; `keysEqual` raises `scheme_mismatch` across schemes; missing/unknown scheme raises.

- [ ] T022 [US4] Implement `foldedEqual` (fold both under one scheme, compare) and `keysEqual` (raise `scheme_mismatch` if the two results' schemes differ) in `javascript/src/equivalence.ts` (after T010)
- [ ] T023 [P] [US4] Implement `folded_equal` and `keys_equal` in `python/src/ethiopic_primitives/equivalence.py` (after T011)
- [ ] T024 [P] [US4] Add scheme tests in `javascript/test/equivalence.test.ts` — every `FoldResult` carries the explicit scheme it was called with; `keysEqual` across differing schemes→`scheme_mismatch`; `foldedEqual`/`keysEqual` on identical inputs is reflexively `true`; missing scheme→`missing_scheme`, unknown→`unknown_scheme`. Do NOT assert that a given character folds differently between `H_ONLY` and `HSL` — that is class membership, fixture-owned (Principle I / FR-011).
- [ ] T025 [P] [US4] Add the same scheme tests in `python/tests/test_equivalence.py`

**Checkpoint**: Principle V's scheme-tagging and scheme-safety are demonstrable; ingestion stays raw (documented, no code path folds at ingestion).

---

## Phase 7: User Story 5 - Same answers in every language (Priority: P2)

**Goal**: Both languages run the same (future) fixture and provably agree now via a parity sweep; Principle I is machine-guarded.

**Independent Test**: The parity sweep reports zero JS↔PY divergence across every language × scheme and the raise/acknowledge paths; the vector runners skip cleanly while `folding.json` is absent; the SC-007 guard passes.

- [ ] T026 [US5] Create `javascript/test/run_equivalence_vectors.ts` — load `tests/vectors/folding.json` if present and run both directions against the gating set (folded key / offset map / error `reason`); **skip with exit 0** when absent (mirror `run_numerals_vectors.ts`)
- [ ] T027 [P] [US5] Create `python/tests/run_equivalence_vectors.py` with the same present/absent behavior
- [ ] T028 [US5] Create `javascript/test/equivalence_dump.ts` — read inputs on stdin and emit, per (input, language, scheme, ack), a row encoding the folded key + offsets + scheme, or the error `reason` (model on `numerals_dump.ts`)
- [ ] T029 [US5] Create `tools/equivalence_parity.py` — sweep a generated input set across every (language × scheme) plus the `GE_EZ` and unacknowledged/acknowledged `TIGRINYA` paths, mixed/pass-through content, and empty input; compare JS vs Python row-by-row, printing `PARITY: PASS`/`FAIL` (UTF-8 subprocess I/O, per feature 003)
- [ ] T030 [US5] Create `tools/check_no_authored_glyphs.py` — fail if any raw fidäl (U+1200–U+137F) literal appears in `javascript/test/equivalence.test.ts` or `python/tests/test_equivalence.py` (SC-007 / Principle I)
- [ ] T031 [US5] Extend `tools/cross_runner.py` — add the JS and PY equivalence vector runners, the parity sweep, and the SC-007 guard to the `jobs` list, failing the build on any gating failure or JS↔PY divergence (after T026–T030)

**Checkpoint**: Cross-language agreement is demonstrable now; value-gating turns on automatically when the fixture lands.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T032 [P] Document the equivalence surface in `javascript/README.md` and `python/README.md` (explicit language, GE_EZ refusal, Tigrinya acknowledgement, schemes, offset map), **including the ingestion rule** (FR-006, Principle V): folding is for index-key/metric use only — corpora, stored documents, and training data retain raw text and are never folded at ingestion
- [ ] T033 Run the `javascript` build (`npm run build`) then the full quickstart validation (`npm test`, `C:\Python314\python.exe -m unittest discover -s python/tests -p "test_*.py"`, `C:\Python314\python.exe tools/cross_runner.py`) and confirm equivalence vector runners skip cleanly while `folding.json` is absent — see [quickstart.md](quickstart.md)
- [ ] T034 [P] Record the release gates in the PR's principle checklist: the external `tests/vectors/folding.json` (provenance from a cited orthographic/Unicode-Ethiopic authority — NOT collation — authored externally, Principles I, II, IX) and the CC-BY-SA licence resolution for any corpus used to author it

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup — BLOCKS all user stories (class tables + guards).
- **US1 (Phase 3)**: after Foundational. The MVP (fold + offset map).
- **US2 (Phase 4)**: after US1 (`equal` + confirming guards on the fold path).
- **US3 (Phase 5)**: after US2 (Tigrinya path builds on the guard wiring).
- **US4 (Phase 6)**: after US1 (comparison layer over `fold`); independent of US2/US3.
- **US5 (Phase 7)**: after the functions exist to sweep; runner stubs (T026/T027) can be written any time after Setup.
- **Polish (Phase 8)**: after the stories it touches.

### Within Each Language Track

- `equivalence.ts` tasks (T008→T010→T014→T018→T022) are sequential — same file. `equivalence.py` (T009→T011→T015→T019→T023) likewise.
- The two language tracks are independent → each `[P]` PY task runs alongside its JS sibling.

### Parallel Opportunities

- Setup: T001–T005 all `[P]`.
- Class tables T006 `[P]` T007; guards T008 `[P]` T009 (different files).
- Each story's PY implementation is `[P]` with its JS sibling; each story's two test tasks are `[P]`.
- US5: T026/T027 `[P]`; T028, T029, T030 are independent files; T031 depends on all of them.
- Polish: T032, T034 `[P]`; T033 runs last.

---

## Parallel Example: User Story 1

```bash
# The two language implementations proceed in parallel (different files):
Task: "Implement fold in javascript/src/equivalence.ts"                    # T010
Task: "Implement fold in python/src/ethiopic_primitives/equivalence.py"     # T011 [P]

# Then each language's structural tests, in parallel:
Task: "Structural tests in javascript/test/equivalence.test.ts"            # T012 [P]
Task: "Structural tests in python/tests/test_equivalence.py"               # T013 [P]
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 US1 (fold + offset map).
2. **STOP and VALIDATE**: `fold` under Amharic returns a length-preserving `FoldResult` with a faithful offset map and leaves the input unchanged.
3. US1 alone folds Amharic; US2/US3 add the non-negotiable Principle IV guards that make it safe for the other languages.

### Incremental Delivery

1. Setup + Foundational → class tables + guards ready.
2. US1 → fold (MVP) → validate.
3. US2 → explicit language + Ge'ez refusal + non-lossy `equal`.
4. US3 → Tigrinya acknowledgement.
5. US4 → scheme tagging + `foldedEqual`/`keysEqual` + scheme-mismatch.
6. US5 → parity + SC-007 guard + fixture-ready runners.
7. Polish → docs, quickstart validation, release-gate notes.

### Acceptance is NOT the green suite (Principle IX)

Passing these tasks yields a working, self-consistent, cross-language-agreeing module. **Final acceptance additionally requires** the externally authored `tests/vectors/folding.json` to pass in both languages with zero divergence, validating the orthography-derived class membership — plus recording the orthographic/Unicode-Ethiopic provenance and resolving the CC-BY-SA corpus licence before public release. None of that is agent-authored.

---

## Notes

- `[P]` = different files, no incomplete dependency.
- No test asserts a hand-authored class membership or folded value (Principle I); the SC-007 guard forbids raw fidäl literals in the test files — build fidäl inputs from code points.
- **Interim tests assert only membership-free properties** — determinism, idempotence, length/offset structure, scheme tagging, error/acknowledge contracts, and JS↔PY parity. Any "these collate equal" or "these fold differently" claim is validated ONLY by `folding.json` (Principle I / FR-011), never by an agent-authored test. Parity asserts JS==PY, not correctness, so it is membership-free.
- Commit after each task or logical group; keep JS and PY behavior identical (Principle X).
- Never let `fold` mutate its input or return a bare string (Principle V); never let a fold succeed for `GE_EZ` or unacknowledged `TIGRINYA` (Principle IV).
