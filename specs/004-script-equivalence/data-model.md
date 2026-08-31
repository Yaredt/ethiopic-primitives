# Phase 1 Data Model: Ge'ez-Script Equivalence & Folding

No persistent state. The "data model" is the language/scheme vocabulary, the folded-result shape, the class tables, the error shape, and the (external) vector record. Validation rules trace to the spec's functional requirements and Constitution Principles IV & V.

## Entities

### Language

- **Definition**: an explicit member of `{ AMHARIC, TIGRINYA, GE_EZ }`.
- **Rules** (FR-001, Principle IV):
  - Mandatory on every fold/compare call — no default, no inference, no "auto".
  - Missing → raise (`missing_language`); unknown value → raise (`unknown_language`).
  - `GE_EZ`: valid for `equal` (non-lossy); any `fold`/`foldedEqual` raises (`geez_not_foldable`).
  - `TIGRINYA`: `fold`/`foldedEqual` raises (`tigrinya_requires_ack`) unless the caller sets the lossy acknowledgement.
  - `AMHARIC`: folds under either scheme with no acknowledgement required.

### FoldScheme

- **Definition**: one of `{ H_ONLY, HSL }`. **No `DEFAULT`** (FR-005, Principle V).
- **Rules**:
  - Mandatory and explicit on every fold call — missing → raise (`missing_scheme`); unknown → raise (`unknown_scheme`).
  - `H_ONLY` ⊆ `HSL` (HSL folds a superset of families); the two produce distinguishable keys where their families differ.
  - Every folded result records the scheme that produced it.

### Lossy-operation acknowledgement

- **Definition**: an explicit named option (`acknowledgeLossy: true`) authorizing a fold that discards phonemic distinctions.
- **Rules** (FR-003, Principle IV): required for `TIGRINYA` folds; absent → raise. Ignored (harmless) for `AMHARIC`. Never bypasses the `GE_EZ` prohibition.

### FoldResult

- **Fields**:
  - `folded`: the folded representation (same length as input — 1:1).
  - `offsets`: a per-position index map, `offsets[i]` = source index of folded character `i` (identity in v1).
  - `scheme`: the `FoldScheme` that produced it (never defaulted).
  - `language`: the `Language` it was folded under.
- **Rules** (FR-004, FR-012, Principle V): never a bare string; `folded.length === input.length === offsets.length`; the original input is returned/left unchanged; every folded position maps to a valid source position and every source position is represented (offset-map fidelity, SC-004).

### Equivalence-class table (internal, provenance-derived)

- **Definition**: per-scheme maps from a fidäl code point to its class representative, derived from documented Amharic/Tigrinya orthographic homophone data (R1 — not ICU/CLDR collation) and living in one module per language.
- **Rules** (FR-013, Principles II & III): derived from a cited Tier-2 authority, not invented; single swap point; not asserted by any test (Principle I). Non-fidäl characters (ASCII, digits, punctuation, whitespace, Ge'ez numerals U+1369–U+137C) are absent from the tables and fold to themselves (R6).

### EquivalenceError

- **Definition**: the single typed error the module raises.
- **Fields**: `reason` ∈ {`missing_language`, `unknown_language`, `missing_scheme`, `unknown_scheme`, `geez_not_foldable`, `tigrinya_requires_ack`, `scheme_mismatch`}; human-readable `message`.
- **Type**: JS `extends Error`; Python `subclass of ValueError`.
- **Purpose**: lets tests assert *why* a call was rejected without asserting class membership or a folded value (Principle I).

### Folding vector (external, read-only)

- **Definition**: a provenance-tagged record pairing an input (`text` + `language` + `scheme` + acknowledgement) with its expected outcome (folded key, offset map, or a specified error `reason`), in `tests/vectors/folding.json`.
- **Ownership**: authored externally, never by the implementation (Principle I); must carry `source` (a cited orthographic/Unicode-Ethiopic authority) and `gating` per Principle II before release.
- **Status**: not yet present; runners skip cleanly until it exists.

## Operations & relationships

- `fold` → validates Language + FoldScheme + acknowledgement, then per-character table lookup → FoldResult.
- `equal(a, b, language)` → validates language, returns non-lossy code-point equality (no fold; valid for `GE_EZ`).
- `foldedEqual(a, b, language, scheme, options?)` → `fold(a,…)` and `fold(b,…)` then compares `folded`.
- `keysEqual(x, y)` → raises `scheme_mismatch` if `x.scheme !== y.scheme`, else compares `folded` (FR-008).

## State & lifecycle

None. All functions are pure and stateless (Principle VIII): identical inputs yield identical outputs with no dependence on network, locale, timezone, or clock. Folding is permitted only at index-key construction and metric computation; ingestion retains raw text and never stores a folded form (FR-006, Principle V).
