# Implementation Plan: Ethiopic Ledger (Layer-0 demo & integration harness)

**Branch**: `005-ethiopic-ledger` | **Date**: 2026-08-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-ethiopic-ledger/spec.md`

## Summary

A static, offline single-page demo — the **Ethiopic Ledger** — that consumes the built `@ethiopic-primitives` package and exercises all four Layer-0 modules together: dual-calendar date entry (Pagumē-safe), fiscal year/quarter/period tagging, optional Ge'ez-numeral display (money stays Arabic), homophone search with offset-map highlighting over the raw text, and real-day aging across Pagumē. It is a **demo consumer**, not a primitive: it imports the package, reimplements nothing (Principle III), runs entirely client-side with no network/backend/clock-dependence (Principle VIII), surfaces every primitive error rather than swallowing it, and asserts no hand-authored Layer-0 value (Principle I).

**Zero-bundler approach**: the package already compiles to browser-ready ESM (`javascript/dist/*.js` with `.js` relative imports). The app is plain HTML + CSS + a vanilla ES-module `app.js` that imports `./lib/index.js`; a build step copies `javascript/dist/*.js` into the app's `lib/`. No framework, no bundler, no runtime dependency — consistent with the project's Layer-0 ethos and trivially deployable to GitHub Pages via CI.

## Technical Context

**Language/Version**: TypeScript-built ESM package (Node ≥ 22 to build it); the app itself is vanilla ES-module JavaScript + HTML + CSS, run by any modern browser. No app-side build step beyond copying the package's `dist`.

**Primary Dependencies**: `@ethiopic-primitives` (the local built package) — the single source of Layer-0 behaviour. No framework, no bundler, no third-party runtime library.

**Storage**: None — entries live in memory for the session (Principle: no persistence, per spec).

**Testing**: A small `node:test` suite over the app's pure helper functions (state/search/highlight/formatting glue) — asserting UI wiring and "rendered == primitive output", never a hand-authored Layer-0 value (FR-010). Manual/quickstart validation for the DOM.

**Target Platform**: Modern evergreen browsers; static hosting (GitHub Pages). Offline-capable (no network requests at runtime).

**Project Type**: Static single-page web app (demo/example) consuming a local library.

**Performance Goals**: Instant, human-perceptible responses; a ledger of a few dozen entries re-renders/searches in well under a frame. Not a scale target.

**Constraints**: No network/backend/model/persistence; no clock/locale/timezone dependence for any computed result (Principle VIII) — "today" is an editable default only. Reimplement no primitive (Principle III). Surface primitive errors (FR-007). Raw descriptions never overwritten with a folded form (Principle V).

**Scale/Scope**: One HTML page, one CSS file, one app module split into a few small helper modules, a seed dataset, a copied `lib/`, a test file, and a CI deploy workflow. Small–moderate.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I — Fixtures authored, never generated | The app displays primitive output; its tests assert wiring and "render == primitive(input)", never a hand-authored calendar/fiscal/numeral/folding value. Seed Ge'ez text is illustrative content, not a vector. | ✅ Pass |
| III — Measure before reimplementing | The app imports the built package and reimplements no Layer-0 logic; it is a pure consumer. | ✅ Pass |
| IV — Language required, never defaulted | The search UI requires an explicit language + scheme; Ge'ez offers only non-lossy exact match; Tigrinya folding needs an explicit acknowledgement toggle — all delegated to the equivalence primitive. | ✅ Pass |
| V — Source text is immutable | Stored descriptions are never replaced with a folded form; highlighting uses the offset map over the raw text. | ✅ Pass |
| VI — Pagumē first-class | Every view (entry, fiscal tag, numeral, search, aging) handles month 13; the app never uses a type/view that cannot express Pagumē. | ✅ Pass |
| VII — Numeral domain | Ge'ez mode renders counts/fiscal years via the primitive; money stays Arabic; a zero count shows Arabic "0" and never calls the renderer with 0. | ✅ Pass |
| VIII — Deterministic / offline | Fully client-side, no network/model; no computed result depends on clock/locale/tz; "today" is an editable default only. | ✅ Pass |
| IX / X — Acceptance / cross-language | N/A to a demo — the app gates no Layer-0 release and ships no vectors; correctness of the primitives stays with their own fixtures and cross-runner. | ✅ N/A |

**Gate result**: PASS. The one thing to watch — that the app never re-derives Layer-0 behaviour — is enforced by FR-009 and checked in Complexity Tracking / analyze.

**Post-Design re-check (after Phase 1)**: PASS — the data model holds only display state and delegates every Layer-0 computation to the package; contracts show each panel calling a primitive, none reimplementing one.

## Project Structure

### Documentation (this feature)

```text
specs/005-ethiopic-ledger/
├── plan.md              # This file
├── research.md          # Phase 0 — packaging/consumption, offline, no-clock, deploy
├── data-model.md        # Phase 1 — in-memory demo entities + display state
├── quickstart.md        # Phase 1 — run locally, run tests, deploy
├── contracts/
│   └── ui-contract.md    # Phase 1 — panels ↔ primitive calls (the consumption surface)
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
examples/ethiopic-ledger/
├── index.html                        # NEW — the single page
├── styles.css                        # NEW — styling
├── src/
│   ├── app.js                        # NEW — wiring: state → render, event handlers
│   ├── ledger.js                     # NEW — pure helpers: entry model, add/remove/reset, fiscal grouping (via package)
│   ├── search.js                     # NEW — pure helpers: fold query + descriptions, locate match spans via offset map
│   ├── format.js                     # NEW — pure helpers: Arabic/Ge'ez display formatting (via package), error-message mapping
│   └── seed.js                       # NEW — fixed seed entries (incl. a Pagumē date + homophone-variant descriptions)
├── lib/                              # NEW — copied from javascript/dist at build time (git-ignored or committed; see research R4)
│   └── *.js
└── test/
    └── ledger.test.js                # NEW — node:test over the pure helpers (wiring only; no authored Layer-0 values)

javascript/
└── package.json                      # add a script to copy dist → examples/ethiopic-ledger/lib

.github/workflows/
└── pages.yml                         # NEW — build package, copy dist, deploy examples/ethiopic-ledger to GitHub Pages
```

**Structure Decision**: The app lives under `examples/` to make its non-shipped, demo status unmistakable (FR-011). It is deliberately framework-free vanilla ESM so it has zero runtime dependencies and imports the package's own compiled ESM directly. Pure, testable glue (ledger/search/format) is separated from DOM wiring (`app.js`) so the helpers can be unit-tested under `node:test` without a browser — and those tests assert only wiring and "render == primitive output".

## Complexity Tracking

| Design choice | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Copy `dist/*.js` into the app's `lib/` at build time | GitHub Pages serves a single folder; importing across the repo to `../../javascript/dist` is fragile on Pages. Copying keeps the app a self-contained static folder with the package's ESM graph intact (its imports are already `.js`-relative). | A bundler (Vite/esbuild) would inline everything but adds a build dependency and toolchain the project otherwise avoids; cross-repo relative imports break once deployed to a Pages subpath. |
| Vanilla ES modules, no framework | Zero runtime dependencies, trivially static and offline, and it doubles as a clean reference for how to consume the package with nothing else. | A React/Vue app would add dependencies and a build step, obscuring the "just import the package" reference value and contradicting the Layer-0 no-deps ethos. |
