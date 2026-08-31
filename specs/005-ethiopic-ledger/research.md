# Phase 0 Research: Ethiopic Ledger

Technical-Context unknowns for a static demo consumer. No decision here reimplements or asserts a Layer-0 value (Principles I, III).

## R1 — How the app consumes the package

**Decision**: Import the package's **already-compiled browser ESM**. `javascript/dist/index.js` re-exports from `./calendar.js`, `./fiscal.js`, `./numerals.js`, `./equivalence.js` using `.js`-relative specifiers, so a browser loads the whole graph natively. The app's `src/app.js` does `import { EthiopianDate, fiscalYearFor, toGeez, fold, … } from "../lib/index.js"`.

**Rationale**: Zero bundler, zero runtime dependency; the app is also the cleanest possible reference for "consume the package as-is." The single source of Layer-0 behaviour is the package (FR-009 / Principle III).

**Alternatives considered**: A bundler (esbuild/Vite) — rejected as an added toolchain the project avoids. `npm`-installing the published package — rejected because nothing is published yet (pre-1.0) and the demo should track the in-repo build.

## R2 — Offline & no-clock determinism (Principle VIII)

**Decision**: No network requests at runtime (no fonts/CDNs/analytics; any web font is either system or self-hosted). No computed or stored result reads the system clock, locale, or timezone; `Date.now()`/`new Date()` appear only to seed an **editable** "today" default in the date input, never inside a stored entry or a displayed computation.

**Rationale**: Matches the Layer-0 ethos and makes SC-006 (0 network requests; identical results across timezones/locales) verifiable.

**Alternatives considered**: Locale-aware `Intl` formatting — rejected; it would make output depend on ambient locale, violating the demo's determinism claim.

## R3 — Match location via the offset map (Principle V)

**Decision**: To search, fold both the query and each description under the chosen language/scheme, find the folded query as a substring of the folded description, then map the matched **folded** index range back to raw-description positions using `FoldResult.offsets` (identity-length in v1) to highlight the original text. The stored description is never replaced.

**Rationale**: This is the headline seam and the correct Principle-V usage — fold to match/locate, never to mutate. Highlighting all matches per description (spec decision).

**Alternatives considered**: Highlighting the folded string (rejected — shows a rewritten source, violating Principle V). Naive raw-substring search (rejected — misses homophone variants, defeating the demo).

## R4 — Deployment (GitHub Pages via CI)

**Decision**: A CI workflow builds the package (`npm run build` in `javascript/`), copies `dist/*.js` into `examples/ethiopic-ledger/lib/`, and deploys the `examples/ethiopic-ledger` folder to GitHub Pages via the official Pages actions. `lib/` is a **build artifact**: git-ignored, generated in CI and for local runs by an `npm run demo:lib` copy script — so the compiled package is never double-committed.

**Rationale**: Keeps the repo free of generated duplicates while giving Pages a self-contained folder. Reachable public URL satisfies SC-008.

**Alternatives considered**: Committing `lib/` (rejected — duplicates `dist` and drifts). Serving from `javascript/dist` directly on Pages (rejected — fragile subpath pathing).

## R5 — Testable glue vs DOM

**Decision**: Keep Layer-0-adjacent glue in pure modules — `ledger.js` (entry model, add/remove/reset, fiscal grouping via the package), `search.js` (fold+locate spans), `format.js` (Arabic/Ge'ez display via the package, error-message mapping) — and confine DOM/event code to `app.js`. Unit-test the pure modules under `node:test` importing `../lib/index.js`.

**Rationale**: Lets the seams be tested headlessly while honoring FR-010 — tests assert wiring, state transitions, error surfacing, and "render == primitive(input)", never a hand-authored Layer-0 value.

**Alternatives considered**: A DOM test runner (jsdom/Playwright) — rejected as dependency-heavy for a demo; quickstart covers the DOM manually.

## R6 — Error surfacing (FR-007)

**Decision**: Every primitive call site catches the primitive's typed error and maps its `reason`/message to a clear inline UI message; the app shows the message and never a blank/fabricated result. Covered cases: invalid date (calendar), `to_geez(0)` avoided by construction (numerals), `geez_not_foldable` and `tigrinya_requires_ack` (equivalence), backwards aging (fiscal).

**Rationale**: Makes the guard rails visible — the demo teaches the primitives' contracts by surfacing them. Satisfies SC-005.

## Resolved unknowns

- Consumption, offline/no-clock, match-location, deploy, test boundary, error surfacing: R1–R6. ✅
- Minor spec decisions (highlight all matches; fixed seed + in-session edit + reset): recorded in spec Assumptions. ✅

No NEEDS CLARIFICATION remain.
