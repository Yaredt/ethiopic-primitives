# Ethiopic Primitives

[![conformance](https://github.com/Yaredt/ethiopic-primitives/actions/workflows/conformance.yml/badge.svg)](https://github.com/Yaredt/ethiopic-primitives/actions/workflows/conformance.yml)

Deterministic, model-free primitives for the Ethiopian calendar, fiscal periods,
Ge'ez numerals, and Ge'ez-script equivalence.

## Status

**Pre-1.0 — work in progress, not yet released.** Three Layer-0 modules are
implemented and cross-language-verified, but the conformance fixtures and a Tier-1
provenance source are still outstanding, so **nothing is published to npm or PyPI
yet** and no version is tagged (Principle II). The code is public to invite review
and — importantly — external authorship of the conformance vectors (Principle I
forbids the maintainers authoring them).

**Correctness core landed.** The calendar layer is implemented in both languages
and passes all 181 gating vectors plus the 1990–2035 sweep, both directions, with
zero mismatches — in JavaScript, in the Python wrapper, and across both together.

- `javascript/` — TypeScript calendar conversion (the primary deliverable; the
  maintained JS option surveyed is 48.9% wrong). Ships `dist/` + `.d.ts`.
- `python/` — thin wrapper over `py-ethiopian-date-converter` (Principle III),
  not a reimplementation.
- **Fiscal logic** (feature 002) is implemented in both languages — fiscal year,
  quarter, period (Pagumē = period 13), bounds, and aging across Pagumē. It builds
  purely on the calendar core and passes cross-language parity. Three conventions
  (label / period numbering / Pagumē's quarter) are informed defaults awaiting a
  Tier-1 source; acceptance is gated by an externally authored
  `tests/vectors/fiscal.json` that does not exist yet.
- **Ge'ez numerals** (feature 003) are implemented in both languages —
  bidirectional Arabic↔Ge'ez over 1–99,999,999, canonical rendering (leading-1
  omission), strict round-trip parse, and Arabic-default money, byte-identical
  across JS and Python. The closed domain is enforced: no zero, negative, or
  fraction (Principle VII). Acceptance is gated by an externally authored
  `tests/vectors/numerals.json` (not yet present) plus a package-measurement
  step (Principle III).
- The **Ge'ez-script equivalence engine** (folding) is **not yet built**.

Public release remains blocked by Principle II until a Tier-1 source is added
(see below).

## Why this exists

A prior-art survey found calendar conversion is implemented many times over, but:

| Library | Accuracy (measured) | Pagumē | Maintained |
|---|---|---|---|
| `py-ethiopian-date-converter` 0.1.1 | 16,801 / 16,801 days | correct | Mar 2025 |
| `ethiopian-date` 1.0 | arithmetic correct | **crashes** (322 days) | 2017 |
| Ethio-Intl (TS) | **48.9% of days wrong** | incorrect | dead 8 months |

Python is solved — depend on it, do not rebuild (Principle III). The gaps this project
fills — all now implemented here in both languages — are JS/TS calendar conversion,
**fiscal logic**, **Ge'ez numerals**, and the **script-equivalence engine**, the last
three absent from the surveyed ecosystem. An offline [demo](examples/ethiopic-ledger/)
exercises all four together, and an [Ethiopian calendar UI](examples/ethiopic-calendar/)
shows the calendar, numerals and fiscal modules in a month/year view.

## Repo layout

```
.specify/memory/constitution.md   governance — read this first
tests/vectors/calendar.json       182 vectors; 181 gating, ICU-corroborated
tests/vectors/fiscal.json         (pending) authored fiscal vectors — gates feature 002
tests/vectors/numerals.json       (pending) authored numeral vectors — gates feature 003
tests/vectors/folding.json        (pending) authored folding vectors — gates feature 004
javascript/                       TypeScript calendar + fiscal + numerals + equivalence + runners
python/                           thin wrapper (calendar) + fiscal + numerals + equivalence
examples/ethiopic-ledger/         offline demo SPA consuming all four modules (feature 005)
examples/ethiopic-calendar/       offline Ethiopian calendar UI (month/year views, holidays, converter)
tools/reference_ethiopic.py       reference implementation
tools/full_sweep.py               Principle IX gate (reference oracle)
tools/fiscal_parity.py            Principle X — JS vs Python fiscal agreement (pre-fixture)
tools/numerals_parity.py          Principle X — JS vs Python numeral agreement (pre-fixture)
tools/equivalence_parity.py       Principle X — JS vs Python folding agreement (pre-fixture)
tools/check_no_authored_numerals.py  Principle I / SC-006 — no authored numeral glyphs in tests
tools/check_no_authored_glyphs.py    Principle I / SC-007 — no authored fidäl glyphs in tests
tools/cross_runner.py             Principle X — runs both languages, checks agreement
specs/00{1..5}-*/                  per-feature spec, plan, tasks, design docs
```

## Working on this

Run everything — both languages, the reference oracle, provenance, and the
cross-language agreement check — with one command:

```bash
python tools/cross_runner.py
```

Or each piece on its own:

```bash
python tools/check_provenance.py                     # Principle II
python tools/full_sweep.py --from 1990 --to 2035     # Principle IX (reference)
```

```bash
cd javascript && npm install && npm run vectors && npm run sweep && npm test
```

```bash
pip install py-ethiopian-date-converter==0.1.1
python python/tests/run_vectors.py
python python/tests/run_sweep.py --from 1990 --to 2035
```

Then in your agent, to extend the remaining modules: `/speckit-plan`,
`/speckit-tasks`, `/speckit-implement`.

## Known blocker

No Tier-1 (Ethiopian government) source has been verified yet. ICU corroborates
181 vectors, but ICU shares a tabular-algorithm lineage with the reference — so
agreement is corroboration, not independence. **Principle II blocks public
release until a Tier-1 source is added.** Most tractable path: Negarit Gazeta
public-holiday proclamations giving Meskerem 1 across a decade.
