# Ethiopic Primitives

Deterministic, model-free primitives for the Ethiopian calendar, fiscal periods,
Ge'ez numerals, and Ge'ez-script equivalence.

## Status

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
- Ge'ez numerals and the equivalence engine are **not yet built**.

Public release remains blocked by Principle II until a Tier-1 source is added
(see below).

## Why this exists

A prior-art survey found calendar conversion is implemented many times over, but:

| Library | Accuracy (measured) | Pagumē | Maintained |
|---|---|---|---|
| `py-ethiopian-date-converter` 0.1.1 | 16,801 / 16,801 days | correct | Mar 2025 |
| `ethiopian-date` 1.0 | arithmetic correct | **crashes** (322 days) | 2017 |
| Ethio-Intl (TS) | **48.9% of days wrong** | incorrect | dead 8 months |

Python is solved — depend on it, do not rebuild (Principle III). The gaps are
JS/TS conversion, **fiscal logic** (absent everywhere), and the **equivalence
engine** (absent everywhere).

## Repo layout

```
.specify/memory/constitution.md   governance — read this first
tests/vectors/calendar.json       182 vectors; 181 gating, ICU-corroborated
tests/vectors/fiscal.json         (pending) authored fiscal vectors — gates feature 002
javascript/                       TypeScript calendar + fiscal implementation + runners
python/                           thin wrapper (calendar) + fiscal logic
tools/reference_ethiopic.py       reference implementation
tools/check_provenance.py         Principle II gate
tools/full_sweep.py               Principle IX gate (reference oracle)
tools/fiscal_parity.py            Principle X — JS vs Python fiscal agreement (pre-fixture)
tools/cross_runner.py             Principle X — runs both languages, checks agreement
specs/001-calendar-core/          calendar feature — spec, plan, tasks, design docs
specs/002-fiscal-logic/           fiscal feature — spec, plan, tasks, design docs
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
