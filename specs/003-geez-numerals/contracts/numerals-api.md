# Contract: Ge'ez Numeral Surface (language-agnostic)

The identical surface ships in TypeScript and Python and runs the same `tests/vectors/numerals.json`. Names are given per language; semantics are identical. No function depends on network, locale, timezone, or clock (Principle VIII). No example below is a conformance vector — expected glyph values live only in the external fixture (Principle I).

## `to_geez` — render integer → canonical Ge'ez

- **JS**: `toGeez(n: number): string`
- **Python**: `to_geez(n: int) -> str`

**Input**: an integer `n`.
**Precondition**: `1 ≤ n ≤ 99_999_999` and `n` is an exact integer.
**Output**: the single canonical Ge'ez numeral string for `n` (leading-1 omission per R2).
**Errors** (`GeezNumeralError`):

| Condition | `reason` |
|---|---|
| `n == 0` | `zero` |
| `n < 0` | `negative` |
| `n` not an exact integer (fraction, NaN, ±∞) | `non_integer` |
| `n > 99_999_999` | `out_of_range` |

**Guarantees**: total over the supported domain (never returns empty, never throws for in-range integers); output uses only inventory glyphs; deterministic.

## `from_geez` — parse canonical Ge'ez → integer

- **JS**: `fromGeez(s: string): number`
- **Python**: `from_geez(s: str) -> int`

**Input**: a string `s`.
**Precondition**: `s` is exactly the canonical rendering of some in-range integer.
**Output**: that integer.
**Errors** (`GeezNumeralError`):

| Condition | `reason` |
|---|---|
| empty or whitespace-only | `empty` |
| contains a non-inventory character | `invalid_char` |
| well-formed glyphs but not a canonical arrangement (e.g. ፩፻) | `non_canonical` |
| implies a value `> 99_999_999` | `out_of_range` |

**Guarantees (strict bijection)**: for every in-range integer `n`, `from_geez(to_geez(n)) == n`; and for every string `s` that `from_geez` accepts, `to_geez(from_geez(s)) == s`.

## `format_money` — currency formatting, Arabic by default

- **JS**: `formatMoney(amount: number, options?: { numerals?: "arabic" | "geez"; fractionDigits?: number }): string`
- **Python**: `format_money(amount, *, numerals: str = "arabic", fraction_digits: int = 2) -> str`

**Input**: a numeric `amount`; `numerals` defaults to `"arabic"`; optional `fractionDigits` (default `2`).
**Output**:
- `"arabic"` (default): amount in Arabic numerals (Principle VII default).
- `"geez"`: whole-number part rendered via `to_geez`; fractional/sub-unit part stays Arabic; a whole-number part of 0 stays Arabic `0`.

**Formatting (deterministic, locale-independent — Principle VIII)**:
- Exactly `fractionDigits` fractional digits (default 2), rounded half-up; fractional digits are always Arabic, never passed to `to_geez`.
- No thousands grouping separators (plain integer part) in either mode.
- Negative amounts: leading ASCII `-` on the magnitude; the sign is never Ge'ez; `to_geez` receives only the positive whole-number magnitude.

**Errors** (`GeezNumeralError`): `numerals` outside {`arabic`,`geez`} → `invalid_char` (no silent fallback); in `geez` mode a whole-number magnitude > 99,999,999 → `out_of_range`.

**Guarantees**: never renders sub-units in Ge'ez; never calls `to_geez` with 0 or a negative; deterministic; JS and Python produce byte-identical output for the same inputs.

## Error type

- **JS**: `class GeezNumeralError extends RangeError { reason: string }`
- **Python**: `class GeezNumeralError(ValueError)` with a `reason: str` attribute.
- Exported from each package's public surface.

## Cross-language conformance

- Both implementations expose the three functions above and the error type.
- A vector runner per language consumes `tests/vectors/numerals.json` when present and **skips cleanly (exit 0)** when absent.
- `tools/cross_runner.py` fails the build on any gating-vector failure or any JS↔PY divergence; `tools/numerals_parity.py` proves JS==PY over the boundary+dense sweep in the interim (Principle X).
