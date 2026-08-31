# Quickstart: Ethiopic Ledger

How to run, test, and deploy the demo. It consumes the built `@ethiopic-primitives` package and asserts no hand-authored Layer-0 value (Principle I).

## Prerequisites

- Node.js ≥ 22 (to build the package and run helper tests).
- A modern browser. On this machine, real Python at `C:\Python314\python.exe` is only needed for the repo's other runners, not this demo.
- Run from the repository root.

## Build the package and stage the demo's lib

```bash
cd javascript && npm run build && cd ..
npm run --prefix javascript demo:lib   # copies javascript/dist/*.js → examples/ethiopic-ledger/lib/
```

`lib/` is a build artifact (git-ignored); regenerate it any time the package changes.

## Run the demo locally

Serve the static folder (any static server works; browsers block ES-module imports over `file://`):

```bash
npx --yes http-server examples/ethiopic-ledger -p 8080 -c-1
```

Open `http://localhost:8080`. Expected on first load: a seeded ledger including a Pagumē (month 13) entry and homophone-variant descriptions.

Manual checks (map to the user stories):
- Enter a Gregorian date and an Ethiopian Pagumē date — both show the dual-calendar equivalent (US1).
- Each entry shows fiscal year / quarter / period; the Pagumē entry shows period 13 (US2).
- Toggle Ge'ez numerals — counts and fiscal years render in Ge'ez, money stays Arabic, an empty group shows Arabic "0" (US3).
- Search a homophone variant under HSL/Amharic — the entry matches and the span is highlighted in the raw text; switch to Ge'ez (fold unavailable) and Tigrinya (needs the acknowledgement toggle) (US4).
- Pick an as-of date spanning a Pagumē — aging shows real-day counts/buckets (US5).
- Trigger an invalid date and an unacknowledged Tigrinya fold — a clear message appears, never a blank/fabricated result.

## Run the helper tests

```bash
node --test examples/ethiopic-ledger/test/*.test.js
```

These assert wiring, state transitions, error surfacing, and "rendered == primitive(input)" — never a hand-authored Layer-0 value.

## Offline / determinism check (SC-006)

Load the page with the network disabled (DevTools → Offline) and confirm it works with 0 network requests; results are identical regardless of the machine's timezone/locale.

## Deploy (GitHub Pages via CI)

The `.github/workflows/pages.yml` workflow builds the package, copies `dist` into the demo's `lib/`, and publishes `examples/ethiopic-ledger` to GitHub Pages. On success the demo is reachable at the repository's Pages URL (SC-008).
