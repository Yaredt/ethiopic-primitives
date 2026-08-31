---
description: "Task list for the Ethiopic Ledger demo implementation"
---

# Tasks: Ethiopic Ledger (Layer-0 demo)

**Input**: Design documents from `specs/005-ethiopic-ledger/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-contract.md](contracts/ui-contract.md)

**Tests**: A small `node:test` suite over the pure helpers — asserting wiring, state transitions, error surfacing, and "rendered == primitive(input)"; never a hand-authored Layer-0 value (FR-010, Principle I).

**Organization**: By user story, P1 first (US1 date, US2 fiscal tags, US4 search) then P2 (US3 numerals, US5 aging). A framework-free static app under `examples/ethiopic-ledger/` consuming `@ethiopic-primitives` via copied ESM in `lib/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5 (setup/foundational/polish carry no story label)

## Path Conventions

App at `examples/ethiopic-ledger/` (`index.html`, `styles.css`, `src/*.js`, `test/*.js`, generated `lib/`). Package at `javascript/`. CI at `.github/workflows/`. Run from repo root; Node ≥ 22.

---

## Phase 1: Setup

- [ ] T001 Create the app skeleton: `examples/ethiopic-ledger/index.html` (single page, `<script type="module" src="./src/app.js">`), `examples/ethiopic-ledger/styles.css`, and empty `examples/ethiopic-ledger/src/app.js`
- [ ] T002 [P] Add `examples/ethiopic-ledger/lib/` to root `.gitignore` (build artifact — copied from `javascript/dist`, never committed)
- [ ] T003 [P] Add a `"demo:lib"` script to `javascript/package.json` that copies `dist/*.js` → `../examples/ethiopic-ledger/lib/` (cross-platform Node one-liner using `node:fs`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user-story panel can render until the lib is importable and the shared helpers/state exist.

- [ ] T004 Build the package and stage the lib: run `npm run build` then `npm run demo:lib` so `examples/ethiopic-ledger/lib/index.js` exists for import
- [ ] T005 Create `examples/ethiopic-ledger/src/format.js` — pure helpers importing `../lib/index.js`: Arabic/Ge'ez rendering of a count and a fiscal-year label (Ge'ez via `toGeez`, but NEVER call `toGeez(0)` — a 0 count returns Arabic "0"), money via `formatMoney`, and a `messageFor(error)` mapping a primitive's `reason`/message to a user string
- [ ] T006 [P] Create `examples/ethiopic-ledger/src/seed.js` — a fixed array of seed entries (EthiopianDate + description + amount) including at least one Pagumē (month 13) date and descriptions containing homophone variants (built as raw strings — illustrative content, not a vector)
- [ ] T007 Create `examples/ethiopic-ledger/src/ledger.js` — pure helpers: `createEntry`, `addEntry`, `removeEntry`, `resetToSeed`, and `fiscalTags(entry)` (via `fiscalYearFor`/`fiscalQuarter`/`fiscalPeriod`); no Layer-0 re-derivation
- [ ] T008 Establish the app state + render loop in `examples/ethiopic-ledger/src/app.js` — in-memory entry list + display/search/aging state, a `render()` that redraws from state, and event wiring scaffolding (after T005–T007)

**Checkpoint**: The page loads, imports the package, and renders the seeded ledger.

---

## Phase 3: User Story 1 - Dual-calendar date entry, Pagumē-safe (Priority: P1) 🎯 MVP

**Independent Test**: Enter a Gregorian date and an Ethiopian Pagumē date; both show the other-calendar equivalent; an invalid date shows the primitive's error and stores nothing.

- [ ] T009 [US1] Implement the date-entry panel in `app.js` + `index.html` — accept a date in either calendar via the package (`EthiopianDate.fromGregorian` / `new EthiopianDate`), show both forms incl. month 13, and on add validate via the primitive
- [ ] T010 [US1] Surface invalid-date errors via `format.js` `messageFor` — show the thrown error inline, add nothing
- [ ] T011 [P] [US1] Tests in `test/ledger.test.js` — adding a valid entry (incl. a Pagumē date) yields an entry whose displayed dual-calendar strings equal what the primitive returns; an invalid date is rejected with the primitive's error (no authored date values)

**Checkpoint**: Dates round-trip in both calendars, month 13 included; errors surface.

---

## Phase 4: User Story 2 - Fiscal year / quarter / period tags (Priority: P1)

**Independent Test**: Entries across a Hamle-1 boundary and a Pagumē date show FY incrementing at Hamle 1, quarters 1–4, periods 1–13, Pagumē distinct as period 13.

- [ ] T012 [US2] Render fiscal tags per entry in `app.js` using `ledger.js` `fiscalTags` (FY, quarter, period), with optional grouping by period
- [ ] T013 [P] [US2] Tests in `test/ledger.test.js` — `fiscalTags(entry)` equals the fiscal primitive's outputs for the same date; a Pagumē entry's period differs from a 30-day-month entry's period (compared to primitive output, not authored values)

**Checkpoint**: Every entry is fiscally tagged; Pagumē is period 13.

---

## Phase 5: User Story 4 - Homophone search with offset-map highlighting (Priority: P1)

**Independent Test**: A homophone-variant query matches under HSL/Amharic and the span is highlighted in the raw text; Ge'ez offers exact-only; unacknowledged Tigrinya is blocked with a message.

- [ ] T014 [US4] Create `examples/ethiopic-ledger/src/search.js` — pure helpers: given query + language + scheme + ack, fold query and each description via `fold` (or `equal` for `GE_EZ`), locate the folded query in the folded description, and map matched folded index ranges → raw `[start,end)` spans via `FoldResult.offsets`; return ALL spans; never mutate the description
- [ ] T015 [US4] Wire the search panel in `app.js` + `index.html` — query box, language selector, scheme toggle, Tigrinya lossy-acknowledgement toggle; render matching entries with all spans highlighted in the raw description
- [ ] T016 [US4] Handle the guarded paths in `app.js`/`search.js` — `GE_EZ` shows exact-match-only with an explanation (fold refused); `TIGRINYA` without ack shows the `tigrinya_requires_ack` message and blocks folding until the toggle is on
- [ ] T017 [P] [US4] Tests in `test/search.test.js` — highlight spans returned by `search.js` project onto the raw text and select the exact matched characters; descriptions are unchanged after search; `GE_EZ` fold path is refused; `TIGRINYA` without ack is blocked (assert behavior/spans vs primitive output, not authored collation truth)

**Checkpoint**: The headline seam works — homophone match located and highlighted in raw text; guards visible.

---

## Phase 6: User Story 3 - Ge'ez-numeral display mode (Priority: P2)

**Independent Test**: Toggle Ge'ez mode with an empty group; counts and fiscal years render in Ge'ez, money stays Arabic, a 0 count shows Arabic "0" with no renderer call.

- [ ] T018 [US3] Add the numerals-mode toggle in `app.js` + `index.html`; render counts and fiscal-year labels via `format.js` (Ge'ez when on), money via `formatMoney` (always Arabic)
- [ ] T019 [P] [US3] Tests in `test/format.test.js` — Ge'ez rendering of a count/fiscal-year equals `toGeez(n)`; a 0 count returns Arabic "0" and `toGeez` is not called with 0; money stays Arabic (compared to primitive output)

**Checkpoint**: Numeral mode demonstrates Principle VII (Arabic-default money, no zero).

---

## Phase 7: User Story 5 - Aging across Pagumē (Priority: P2)

**Independent Test**: With entries straddling a Pagumē, an as-of date yields real-day counts/buckets from the primitive; a backwards as-of surfaces the defined behaviour.

- [ ] T020 [US5] Add the aging panel in `app.js` + `index.html` — editable as-of date (defaults to today, editable), per-entry `agingBucket(entryDate, asOf)` day count + bucket
- [ ] T021 [US5] Surface the backwards-aging case (as-of before entry) via `messageFor`, never a silent bucket
- [ ] T022 [P] [US5] Tests in `test/ledger.test.js` — aging day count equals the primitive's `agingBucket().days` for the same pair (incl. a Pagumē-crossing pair); the backwards case surfaces the primitive's behaviour (no authored day values)

**Checkpoint**: Real-day aging across Pagumē is demonstrated.

---

## Phase 8: Polish & Deployment

- [ ] T023 Create `.github/workflows/pages.yml` — build the package (`npm ci && npm run build` in `javascript/`), run `npm run demo:lib`, upload `examples/ethiopic-ledger` as the Pages artifact, and deploy via the official Pages actions (on push to `main`)
- [ ] T024 [P] Style the app in `styles.css` — a clean, readable, responsive single-page layout (light/dark aware); no external fonts/CDNs (offline, Principle VIII)
- [ ] T025 [P] Add `examples/ethiopic-ledger/README.md` and link it from the root `README.md` — what the demo shows, that it is a non-shipped example consuming the package, and the local-run + Pages URL
- [ ] T026 Run the quickstart validation — `npm run build` + `demo:lib`, `node --test examples/ethiopic-ledger/test/*.js`, serve locally and walk the five user stories, and confirm 0 network requests with the network disabled (SC-006). See [quickstart.md](quickstart.md)

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2)** blocks all stories (lib import + helpers + state).
- **US1** (MVP) → **US2** and **US4** build on the entry list; **US4** needs `search.js`. **US3**/**US5** (P2) layer on after.
- **Polish**: CI (T023) after the app runs; styling/README parallel; quickstart last.

### Parallel Opportunities

- Setup T002/T003 `[P]`; foundational T006 `[P]`.
- Each story's test task is `[P]` with its sibling implementation once the helper exists.
- Polish T024/T025 `[P]`; T023 then T026 sequential-ish.

---

## Implementation Strategy

- **MVP**: Setup + Foundational + US1 → a page that converts and lists dated entries. Then US2 + US4 (the P1 seams: fiscal tagging and homophone search). Then US3 + US5 (numerals, aging). Then deploy.
- **Guardrails throughout** (verified in analyze + tests): reimplement no primitive (FR-009 / Principle III); assert no hand-authored Layer-0 value (FR-010 / Principle I); never overwrite a description with a folded form (Principle V); no network/clock-dependence (Principle VIII); surface every primitive error (FR-007).

## Notes

- `[P]` = different files, no incomplete dependency.
- `lib/` is generated (git-ignored); rebuild with `npm run demo:lib` when the package changes.
- Tests import `../lib/index.js` and assert only wiring / "render == primitive(input)" — never a hand-authored Layer-0 value.
