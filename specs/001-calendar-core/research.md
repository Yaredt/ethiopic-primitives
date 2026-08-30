# Phase 0 Research: Calendar Correctness Core

This feature is a backfill; every "unknown" was already resolved during implementation. This document records the decisions, their rationale, and the alternatives rejected, so the design is reproducible.

## Decision 1 — Convert via Julian Day Number, not month-by-month

- **Decision**: Both directions convert through an integer Julian Day Number (JDN). Ethiopic→JDN and JDN→Ethiopic are closed-form integer formulas; Gregorian↔JDN uses the standard proleptic Gregorian algorithm.
- **Rationale**: Month-by-month arithmetic accumulates error around Pagumē and at year boundaries — exactly where Ethiopic bugs hide. JDN is a single monotonic integer axis, so round-trips are exact and the leap boundary is handled by the year formula, not by special cases.
- **Alternatives considered**: Month-accumulation (rejected — error-prone at Pagumē); deriving Ethiopian leap years from Gregorian ones (rejected — the two drift; the spec explicitly forbids it).

## Decision 2 — Epoch constant `1724221`, verified against vectors, not taken on faith

- **Decision**: Use `ETHIOPIC_EPOCH_JDN = 1724221` (Meskerem 1, year 1 Amete Mihret) with leap rule `year % 4 == 3`.
- **Rationale**: The reference (`tools/reference_ethiopic.py`) uses this constant and passes every vector and the full sweep. The spec text offers a different conventional constant (`1723856`) but warns to trust the anchors over the constant. The vectors are the authority (Principle I); `1724221` reproduces all 181 gating vectors and `1723856` does not.
- **Alternatives considered**: The spec's `1723856` (rejected — fails the anchors); computing an epoch from a single anchor date (rejected — off-by-one epoch errors are the single most common bug in this domain and surface only in Pagumē/at boundaries).
- **Note for governance**: The spec §2.5 prose anchor "Mäskäräm 1, 2000 → 11 September 2007" is off by one; the gating vectors say 12 September 2007 (11 September is Pagumē 6 of 1999). This feature follows the vectors and flags the spec discrepancy rather than silently resolving it.

## Decision 3 — Python wraps a dependency; JavaScript implements from scratch

- **Decision**: Python delegates all conversion to `py-ethiopian-date-converter`; JavaScript ports the reference algorithm natively.
- **Rationale**: Principle III (measure before reimplementing). The Python library measured 16,801/16,801 days correct, so reimplementing it is prohibited. No maintained JS library is correct (the surveyed one is 48.9% wrong), so a native JS implementation is the justified gap-filler.
- **Alternatives considered**: One shared engine compiled to both languages (rejected — either reimplements the correct Python lib, violating III, or introduces a WASM/bridge runtime dependency, violating the offline-purity constraint VIII). A pure-Python reimplementation (rejected outright by III).

## Decision 4 — Amete Alem handled as a pure era offset

- **Decision**: Amete Alem is Amete Mihret + 5500 years. Convert an Amete Alem year to Amete Mihret before any JDN math; add 5500 back for display.
- **Rationale**: The two eras share the same day grid; only the year label differs by a constant. Treating it as arithmetic keeps a single conversion path and avoids a second epoch.
- **Alternatives considered**: A separate epoch/second code path for Amete Alem (rejected — duplicate logic, double the surface for an off-by-one).

## Decision 5 — `Era` as a frozen const object, not a TypeScript `enum`

- **Decision**: In TypeScript, model `Era` as `const Era = {…} as const` plus a union type.
- **Rationale**: Node's `--experimental-strip-types` cannot run TS `enum` (it emits runtime code). A const object strips cleanly, runs natively without a build step, and still compiles under `tsc` with `rewriteRelativeImportExtensions` for the published `dist/`.
- **Alternatives considered**: `enum` (rejected — breaks native execution); string literals with no namespace (rejected — loses `Era.AmeteMihret` ergonomics).

## Decision 6 — Weekday convention

- **Decision**: `weekday()` returns 0 = Monday … 6 = Sunday (ISO-8601), computed as `jdn mod 7`.
- **Rationale**: JDN 0 is a Monday, so the modulo is direct and deterministic; no vector pins a weekday, so a documented, stable convention suffices.
- **Alternatives considered**: 0 = Sunday (rejected — chose ISO-8601 for cross-language consistency; documented either way).

## Open items (tracked outside this feature)

- **Principle II Tier-1 provenance** — public release remains blocked until an Ethiopian-government source is added to the vectors. Not resolvable in code.
- **Format/parse surface** (Ge'ez names, transliteration, numeral forms, two-digit-year pivot) — deferred to a later feature.
