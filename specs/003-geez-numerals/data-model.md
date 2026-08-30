# Phase 1 Data Model: Ge'ez Numerals

The numeral module has no persistent state and no compound domain objects — its "data model" is the closed integer domain, the glyph inventory, the error shape, and the (external) vector record. Validation rules trace to the spec's functional requirements and the constitution.

## Entities

### Supported integer domain

- **Definition**: the closed set of integers **1 ≤ n ≤ 99,999,999**.
- **Members render and round-trip**; everything else is out of domain.
- **Validation** (FR-001, FR-003–FR-005, Principle VII):
  - `n = 0` → raise (`reason: zero`). Never ፩, never empty string.
  - `n < 0` → raise (`reason: negative`). No sign is ever emitted.
  - `n` non-integer (fraction / NaN / non-finite) → raise (`reason: non_integer`). No rounding or truncation.
  - `n > 99,999,999` → raise (`reason: out_of_range`). v1 does not stack ፼.

### Ge'ez numeral symbol inventory

- **Units**: ፩ 1, ፪ 2, ፫ 3, ፬ 4, ፭ 5, ፮ 6, ፯ 7, ፰ 8, ፱ 9
- **Tens**: ፲ 10, ፳ 20, ፴ 30, ፵ 40, ፶ 50, ፷ 60, ፸ 70, ፹ 80, ፺ 90
- **Multiplicative separators**: ፻ 100, ፼ 10,000
- **No** symbol exists for zero, sign, decimal point, or fraction.
- **Codepoints**: Ethiopic numerals occupy U+1369–U+137C (units, tens, hundred, ten-thousand). Any character outside this set in a parse input → raise (`reason: invalid_char`).

### Canonical Ge'ez numeral string

- **Definition**: the single string `to_geez(n)` produces for a given in-range `n` (R1/R2).
- **Rules** (v1 range ⇒ at most two myriad groups `high = n // 10000`, `low = n % 10000`, each 0–9999; see research R1):
  - Within a group, the hundreds digit (if > 0) renders then ፻, and the trailing 0–99 renders tens+units; a zero tens or zero units glyph is omitted.
  - A multiplier of exactly 1 before ፻ or ፼ omits the ፩ (100 → ፻, 10,000 → ፼).
  - `high > 0` emits its group then ፼; `low > 0` emits its group after. A `low` of 0 leaves ፼ as the final glyph; a hundreds digit of 0 emits no ፻.
  - No zero glyph is ever emitted, and ፼ is never stacked in v1.
- **Validation for parsing** (FR-002, FR-006): a string is valid iff it is byte-for-byte the canonical rendering of some in-range integer. Rejections:
  - empty / whitespace-only → `reason: empty`.
  - any non-inventory character → `reason: invalid_char`.
  - well-formed glyphs but not a canonical arrangement (e.g. ፩፻, a stray leading ፩, mis-ordered groups) → `reason: non_canonical`.
  - implies a value > 99,999,999 → `reason: out_of_range`.

### Money amount (formatting input)

- **Fields**: `amount` (numeric), `options.numerals` ∈ {`arabic` (default), `geez`}, optional fractional-digit count (default 2).
- **Rules** (FR-007, Principle VII, R4):
  - Default output is Arabic numerals.
  - `geez` mode renders only the whole-number part via `to_geez`; sub-units stay Arabic.
  - A whole-number part of 0 stays Arabic `0` even in `geez` mode — `to_geez` is never invoked on 0.
  - Deterministic formatting (Principle VIII): exactly 2 fractional digits by default (rounded half-up, overridable), **no** thousands grouping separators, negatives prefixed with ASCII `-` around the magnitude.
  - In `geez` mode, `to_geez` receives only the positive whole-number magnitude; a magnitude > 99,999,999 raises `out_of_range` (no silent Arabic fallback).

### GeezNumeralError

- **Definition**: the single typed error the module raises.
- **Fields**: `reason` ∈ {`zero`, `negative`, `non_integer`, `out_of_range`, `empty`, `invalid_char`, `non_canonical`}; human-readable `message`.
- **Type**: JS `extends RangeError`; Python `subclass of ValueError`.
- **Purpose**: lets tests assert *why* an input was rejected without asserting any numeral value (Principle I).

### Numeral vector (external, read-only)

- **Definition**: a provenance-tagged record pairing an input (an integer, or a Ge'ez string) with its expected output, in `tests/vectors/numerals.json`.
- **Ownership**: authored externally, never by the implementation (Principle I); must carry `source` (Tier-2 CLDR/Unicode or Reingold & Dershowitz) and `gating` per Principle II before release.
- **Status**: not yet present; runners skip cleanly until it exists.

## State & lifecycle

None. All functions are pure and stateless (Principle VIII): identical inputs yield identical outputs with no dependence on network, locale, timezone, or clock.

## Relationships

`format_money` (geez mode) → calls `to_geez` on the whole-number part. `from_geez` and `to_geez` are mutual inverses over the supported domain. No other module (calendar, fiscal) is referenced.
