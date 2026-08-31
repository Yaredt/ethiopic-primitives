# Ethiopic Ledger — Layer-0 demo

A small, **offline** single-page app that consumes the `@ethiopic-primitives` package to exercise all four Layer-0 modules together. It is a **demo/example** — not part of the published library — that reimplements nothing, runs entirely client-side, and only *displays* what the primitives return.

## What it shows (and which module / seam)

| In the app | Module | The cross-module seam it stresses |
|---|---|---|
| Enter a date in either calendar → see the other | calendar | Pagumē / month-13 round-trips |
| Each entry tagged with fiscal year / quarter / period | fiscal → calendar | Pagumē as a distinct period 13; Hamle-1 boundary |
| "Ge'ez numerals" toggle for counts & fiscal years (money stays Arabic) | numerals → fiscal | `to_geez(0)` never happens; Arabic-default money |
| Search descriptions with homophone folding, highlighted in the raw text | equivalence | fold + offset-map projection onto the original |
| Receivables aging as of a date | fiscal → calendar | real-day aging across Pagumē |

The search box is the headline: try the query `ሀኪም` under **HSL / Amharic** and it matches the seeded entry spelled `ሐኪም`, highlighting the match in the *unmodified* description. Switch the language to **Ge'ez** (folding refused — exact match only) or **Tigrinya** (folding blocked until you tick "allow lossy Tigrinya folding") to see Principle IV in action.

## Run it locally

```bash
cd javascript && npm run build && npm run demo:lib && cd ..
npx --yes http-server examples/ethiopic-ledger -p 8080 -c-1
# open http://localhost:8080
```

`lib/` is generated (copied from `javascript/dist`, git-ignored) — regenerate with `npm run demo:lib` whenever the package changes.

## Tests

```bash
node --test examples/ethiopic-ledger/test/*.test.js
```

They assert wiring, state transitions, error surfacing, and "rendered == primitive(input)" — never a hand-authored Layer-0 value (Principle I), and never a homophone-equivalence claim (that is the folding fixture's job).

## Deploy

`.github/workflows/pages.yml` builds the package, stages `lib/`, runs the helper tests, and publishes this folder to GitHub Pages.

## Constitution note

This app is explicitly **outside** the Layer-0 library scope. It imports the primitives (Principle III — no reimplementation), is fully offline/deterministic (Principle VIII — no network, no clock/locale in any computed result; "today" is an editable default only), keeps source descriptions immutable (Principle V — folding is used to match/locate, never to rewrite), and asserts no hand-authored Layer-0 value (Principle I). It never gates a Layer-0 release.
