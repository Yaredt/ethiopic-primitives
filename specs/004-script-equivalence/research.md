# Phase 0 Research: Ge'ez-Script Equivalence & Folding

All Technical-Context unknowns are resolved below. No character is presented as an authored equivalence-class value or expected folded output — those live only in the external fixture (Principle I). Where families are named, they are described by their phonetic role and cited to the authority, not enumerated as test expectations.

## R1 — Equivalence-class source & the class tables

**Decision**: Derive the `H_ONLY`/`HSL` class tables from **CLDR/ICU Ethiopic collation** (Tier-2), compiled into a per-language `equivalence-classes` module as plain code-point constants. No runtime ICU dependency; the derivation is a build-time/authoring step recorded with a provenance comment citing the CLDR/ICU data version.

**Class model**: Ethiopic fidäl are precomposed syllables — a base consonant × one of seven vowel *orders*. Homophone folding maps a syllable to a canonical representative of its base-consonant equivalence class **while preserving the vowel order** (so "há" folds toward the class-representative "h" base but keeps the "-á" order). The families:
- `H_ONLY`: the "h"-homophone base family (the several Ge'ez h-series that are homophonous in Amharic).
- `HSL`: `H_ONLY` plus the "s"-homophone family, the "l"/labialized overlaps, and the Amharic glottal set folded in Amharic.

**Rationale**: CLDR/ICU is a constitution Tier-2 authority (Principle II) and the project's chosen anchor for this ecosystem (consistent with numerals). Deriving — not inventing — the classes keeps the implementation aligned with the eventual external fixture, which independently validates exact membership.

**Alternatives considered**: Hand-encoding from a single orthography paper (rejected as less reproducible than CLDR/ICU, though a cited orthography source may corroborate). A runtime ICU dependency (rejected — Principle VIII forbids ambient dependencies and Layer 0 must run offline in a browser).

## R2 — Offset-map model (spec clarification A4)

**Decision**: Folding is **length-preserving 1:1**. `fold` returns `{ folded, offsets, scheme, language }` where `offsets[i]` is the source index of folded character `i`. In v1 this is always the identity (`offsets[i] === i`), because each input character maps to exactly one folded character at the same position.

**Rationale**: Ethiopic fidäl are single precomposed code points, so homophone folding is a per-character substitution with no length change. Returning the (identity) offset map — rather than a bare folded string — satisfies Principle V, documents the 1:1 contract, lets a folded-key match project onto the source exactly, and future-proofs the shape if length-changing normalization is ever added. Normalization of differently-composed input is the caller's responsibility, done before folding (out of scope for v1).

**Alternatives considered**: Omitting the map because it is identity (rejected — Principle V forbids a bare replacement string). Byte-level offsets (rejected — must be code-point level to stay identical across JS/PY, Principle X).

## R3 — API surface

**Decision**: Four functions, two enums, one error type; every function takes an explicit `language`.
- `fold(text, language, scheme, options?) -> FoldResult` — folds under an explicit scheme. `GE_EZ` raises; `TIGRINYA` raises unless `options.acknowledgeLossy` is set.
- `equal(a, b, language) -> boolean` — **non-lossy** exact code-point equality; valid for all languages including `GE_EZ`; does not fold. Requires explicit language (Principle IV) as a guard, though the result is language-independent.
- `foldedEqual(a, b, language, scheme, options?) -> boolean` — folds both under one scheme (subject to the `GE_EZ`/`TIGRINYA` rules) and compares the folded keys.
- `keysEqual(x: FoldResult, y: FoldResult) -> boolean` — compares two previously-folded results; raises `scheme_mismatch` if their schemes differ (Principle V / FR-008).

**Rationale**: Separating non-lossy `equal` from lossy `foldedEqual` makes the safe operation available for every language (including Ge'ez) while confining the guarded, lossy path to explicit fold calls. `keysEqual` gives FR-008 a concrete home.

**Alternatives considered**: A single `compare(..., fold=bool)` flag (rejected — hides the lossy/non-lossy distinction behind a boolean, the kind of silent default Principle IV resists). Returning the folded key as a bare string from `fold` (rejected — Principle V).

## R4 — Error taxonomy

**Decision**: One typed error per language carrying a machine-readable `reason`:
- JS: `class EquivalenceError extends Error` with `reason` ∈ {`missing_language`, `unknown_language`, `missing_scheme`, `unknown_scheme`, `geez_not_foldable`, `tigrinya_requires_ack`, `scheme_mismatch`}.
- Python: `class EquivalenceError(ValueError)` with the same `reason` values.

`fold` raises `missing_language`/`unknown_language`/`missing_scheme`/`unknown_scheme` on bad arguments, `geez_not_foldable` for `GE_EZ`, `tigrinya_requires_ack` for unacknowledged Tigrinya. `keysEqual` raises `scheme_mismatch`.

**Rationale**: One typed error keeps caller handling simple while `reason` lets tests assert *why* a call was rejected without asserting any class membership or folded value (Principle I).

**Alternatives considered**: Returning `null`/sentinel for the guarded cases (rejected — silent lossy folding is exactly the Principle IV/V harm). Distinct exception classes per reason (rejected as heavier than a `reason` field warrants).

## R5 — Language & scheme representation

**Decision**: `Language` and `FoldScheme` are explicit enums/const objects with **no default member and no "auto"**. Passing `undefined`/`null`/an unknown value raises rather than resolving a default. `TIGRINYA` acknowledgement is an explicit `options.acknowledgeLossy: true` (a named boolean), not a positional flag, so the call site reads as a conscious decision.

**Rationale**: Directly encodes Principle IV (non-negotiable): no default, no inference, no auto. A named acknowledgement option turns silent Tigrinya loss into an auditable choice.

**Alternatives considered**: A string parameter with a default (prohibited). Inferring language from the text's code-point ranges (prohibited — "no inference").

## R6 — Non-fidäl pass-through & normalization boundary

**Decision**: Characters outside the fold classes — ASCII, digits, punctuation, whitespace, and Ge'ez **numeral** glyphs (U+1369–U+137C) — pass through folding unchanged at their original positions. The module operates at the abstract code-point level and does **not** apply Unicode NFC/NFD; callers normalize before folding if needed.

**Rationale**: Folding targets fidäl homophones only; everything else is identity, keeping the offset map faithful and the operation total. Numeral glyphs are a separate domain (feature 003) and must not be touched here.

**Alternatives considered**: Internal NFC normalization (rejected for v1 — it can change length, violating the length-preserving decision, and belongs to the caller).

## R7 — Acceptance & parity strategy (Principles IX, X)

**Decision**: Final acceptance = the authored `folding.json` gating set passes in both languages **and** a JS↔PY parity sweep over a generated input set — covering every (language × scheme) combination, the `GE_EZ` and unacknowledged-`TIGRINYA` raise paths, the acknowledged-Tigrinya path, mixed/pass-through content, and empty input — reports zero divergence in folded key, offset map, scheme tag, and raise/acknowledge outcome. An SC-007 guard fails the build if any raw fidäl (U+1200–U+137F) literal appears in the equivalence test files.

**Rationale**: Round-trip is not meaningful for a lossy fold, so cross-language parity + structural invariants (offset identity/1:1, scheme tagging) are the strongest self-consistency guarantees before the fixture exists (Principle IX interim). The SC-007 guard makes Principle I machine-checked.

**Alternatives considered**: Spot-checking specific folded outputs (prohibited by Principles I and IX). Random-only inputs (rejected — the sweep enumerates the guard paths and every language×scheme deterministically).

## Resolved unknowns

- Language/Version, Testing, Platform: inherited from features 001–003. ✅
- Fold model (length-preserving 1:1), `GE_EZ` compare validity, class-table source: settled in spec Clarifications. ✅
- API shape, error taxonomy, enum representation, pass-through boundary, parity strategy: R3–R7. ✅

No NEEDS CLARIFICATION remain. Two items stay owned by the external fixture (not blockers): exact per-scheme character membership (A1) and Tigrinya's distinct glottal set (A2).
