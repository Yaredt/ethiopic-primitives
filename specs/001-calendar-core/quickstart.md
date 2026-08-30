# Quickstart: Validate the Calendar Correctness Core

This guide proves the feature works end-to-end. Every command is deterministic and offline.

## Prerequisites

- **Node.js ≥ 22** (for native TypeScript execution).
- **Python ≥ 3.9** with `py-ethiopian-date-converter==0.1.1` installed.
- On this Windows machine the real interpreter is `C:\Python314\python.exe` (the `python`/`python3` on PATH are non-functional Store stubs).

```bash
pip install py-ethiopian-date-converter==0.1.1
cd javascript && npm install && cd ..
```

## One command — validate everything

Runs provenance, the reference oracle, both language vector runners, both sweeps, and the cross-language agreement check:

```bash
python tools/cross_runner.py
```

**Expected outcome**: every row `PASS`, final line `Cross-runner: PASS — both languages agree on the gating set`. A `::warning::` about the missing Tier-1 source is expected (Principle II blocks *public release*, not the build).

## Validate each piece on its own

**Provenance (Principle II)** — every gating vector has accepted external provenance:

```bash
python tools/check_provenance.py
```

**Reference oracle sweep (Principle IX)** — the independent reference round-trips 1990–2035:

```bash
python tools/full_sweep.py --from 1990 --to 2035
```
Expected: `16801 days, 0 mismatches, 0 exceptions`.

**TypeScript** — all vectors, the sweep, the build, and the contract suite:

```bash
cd javascript
npm run vectors   # 182 vectors (181 gating), 0 gating failures
npm run sweep     # 33602 conversions, 0 mismatches, 0 exceptions
npm run build     # emits dist/ (.js + .d.ts), no type errors
npm test          # node:test contracts pass
```

**Python** — the wrapper's vectors, sweep, and contracts:

```bash
python python/tests/run_vectors.py                       # 181 gating, 0 gating failures
python python/tests/run_sweep.py --from 1990 --to 2035   # 16801 conversions, 0/0
python -m unittest discover -s python/tests -p "test_*.py"
```

## What each check maps to

| Check | Constitution principle | Success criterion |
|---|---|---|
| Vector runners (both languages) | I, X | SC-001, SC-003 |
| Sweeps (both languages + reference) | IX | SC-002 |
| Pagumē vectors within the runners | VI | SC-004 |
| Constructor rejection tests | VII (spirit), FR-007 | SC-005 |
| Absence of authored conversion assertions (by inspection) | I | SC-006 |

## Acceptance

The feature is accepted when `python tools/cross_runner.py` exits `0` with every row `PASS` and the cross-language line reading `AGREE`. A green vector run alone is **not** acceptance — the sweep must also be clean (Principle IX).
