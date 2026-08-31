# Contract: Ge'ez-Script Equivalence Surface (language-agnostic)

The identical surface ships in TypeScript and Python and runs the same `tests/vectors/folding.json`. Semantics are identical; names are given per language. No function depends on network, locale, timezone, or clock (Principle VIII). No example below is a conformance vector — expected folded values and class membership live only in the external fixture (Principle I). `⟨fidäl⟩` denotes an Ethiopic syllable built in code, never a literal in tests.

## Types

- **Language**: `AMHARIC` | `TIGRINYA` | `GE_EZ` (no default, no "auto").
- **FoldScheme**: `H_ONLY` | `HSL` (no `DEFAULT`).
- **FoldResult**: `{ folded: string; offsets: number[]; scheme: FoldScheme; language: Language }`.
- **EquivalenceError**: JS `extends Error`, Python `subclass of ValueError`; carries `reason`.

## `fold` — fold text under an explicit language + scheme

- **JS**: `fold(text: string, language: Language, scheme: FoldScheme, options?: { acknowledgeLossy?: boolean }): FoldResult`
- **Python**: `fold(text: str, language: Language, scheme: FoldScheme, *, acknowledge_lossy: bool = False) -> FoldResult`

**Preconditions**: `language` and `scheme` are explicit, known members.
**Output**: a `FoldResult` whose `folded` has the same length as `text`, `offsets` is the per-position source-index map (identity in v1), and `scheme`/`language` record the call. The input `text` is returned unchanged by the caller's reference (never mutated).
**Errors** (`EquivalenceError`):

| Condition | `reason` |
|---|---|
| `language` missing/undefined/null | `missing_language` |
| `language` not a known member | `unknown_language` |
| `scheme` missing/undefined/null | `missing_scheme` |
| `scheme` not a known member | `unknown_scheme` |
| `language === GE_EZ` | `geez_not_foldable` |
| `language === TIGRINYA` and acknowledgement not set | `tigrinya_requires_ack` |

**Guarantees**: length-preserving 1:1; non-fidäl characters (ASCII, digits, punctuation, whitespace, Ge'ez numerals U+1369–U+137C) fold to themselves; deterministic; the original string is never mutated.

## `equal` — non-lossy comparison (valid for every language)

- **JS**: `equal(a: string, b: string, language: Language): boolean`
- **Python**: `equal(a: str, b: str, language: Language) -> bool`

**Precondition**: `language` is an explicit known member (including `GE_EZ`).
**Output**: `true` iff `a` and `b` are equal at the code-point level (no folding — non-lossy).
**Errors**: `missing_language` / `unknown_language` as above. Never raises for `GE_EZ` (this is the non-lossy path).
**Guarantees**: discards no phonemic information; language-independent result but language is required as a Principle IV guard.

## `foldedEqual` — lossy comparison under a scheme

- **JS**: `foldedEqual(a: string, b: string, language: Language, scheme: FoldScheme, options?: { acknowledgeLossy?: boolean }): boolean`
- **Python**: `folded_equal(a, b, language, scheme, *, acknowledge_lossy=False) -> bool`

**Output**: `true` iff `fold(a, …).folded === fold(b, …).folded`.
**Errors**: the same set as `fold` (including `geez_not_foldable` and `tigrinya_requires_ack`).
**Guarantees**: two strings differing only by their language's interchangeable homophones under the chosen scheme compare equal; genuinely distinct words do not collide (FR-007).

## `keysEqual` — compare two already-folded results

- **JS**: `keysEqual(x: FoldResult, y: FoldResult): boolean`
- **Python**: `keys_equal(x: FoldResult, y: FoldResult) -> bool`

**Output**: `true` iff `x.folded === y.folded`.
**Errors** (`EquivalenceError`): `x.scheme !== y.scheme` → `scheme_mismatch` (a cross-scheme comparison is surfaced, never silently answered — FR-008).

## Error type

- **JS**: `class EquivalenceError extends Error { reason: string }`
- **Python**: `class EquivalenceError(ValueError)` with a `reason: str` attribute.
- Exported from each package's public surface.

## Cross-language conformance

- Both implementations expose the four functions, the two enums, and the error type.
- A vector runner per language consumes `tests/vectors/folding.json` when present and **skips cleanly (exit 0)** when absent.
- `tools/cross_runner.py` fails the build on any gating-vector failure or JS↔PY divergence; `tools/equivalence_parity.py` proves JS==PY over the input sweep (every language × scheme, plus the raise/acknowledge paths) in the interim (Principle X); `tools/check_no_authored_glyphs.py` fails if a raw fidäl literal appears in the equivalence test files (SC-007 / Principle I).
