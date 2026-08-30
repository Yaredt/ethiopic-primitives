# Phase 0 Research: Ge'ez Numerals

All Technical-Context unknowns are resolved below. Illustrative glyph examples are drawn from public reference material (cited) and appear here for design clarity only — they are **not** conformance vectors and are **not** asserted by any automated test (Principle I).

## R1 — Conversion algorithm and authority

**Decision**: Anchor render/parse on the **CLDR/Unicode Ethiopic numbering system** (`ethi`; RBNF rule sets `ethiopic` / `ethiopic_p1`), implemented as a pair-wise myriad-group algorithm.

**Algorithm (render), n ∈ 1–99,999,999**:
1. Take the decimal digits of `n`; process in groups of two decimal digits ("pairs"), each pair a value 0–99.
2. Each non-zero pair renders as tens-glyph (፲–፺) + units-glyph (፩–፱), omitting whichever of tens/units is zero.
3. Separators are placed between pairs: within a myriad, the higher pair is followed by ፻ (100); each complete myriad group is followed by ፼ (10,000). Groups combine as `‹high myriads› ፼ ‹low myriads›`.
4. **Leading-1 omission**: when a pair that multiplies ፻ or ፼ equals exactly 1, the ፩ is dropped (100 → ፻, 10,000 → ፼).
5. **Zero-pair suppression**: a pair equal to 0 contributes no units/tens glyphs; its positional separator is handled by the grouping so no zero glyph is ever emitted (there is none).

Worked illustration (Wikipedia, *Geʽez script*): 475 → ፬፻፸፭; 83,692 → ፰፼፴፮፻፺፪. *(Reference only — not a test vector.)*

**Exact composition for the v1 range (≤ 99,999,999 ⇒ at most two myriad groups).** Because the cap is below 10⁸, every in-range `n` decomposes into exactly `high = n // 10000` and `low = n % 10000`, each in 0–9999. This makes the algorithm — including the historically divergent interior-zero cases — fully determined:

- `sub(x)` renders `x ∈ 1..9999` as: let `h = x // 100`, `r = x % 100`. If `h > 0`, emit `tensUnits(h)` then ፻ — but if `h == 1`, omit the ፩ (emit bare ፻). If `r > 0`, emit `tensUnits(r)`. `tensUnits(v)` emits the tens glyph then the units glyph, skipping whichever is zero.
- `render(n)` = (if `high > 0`: `sub(high)` then ፼ — but if `high == 1`, omit the ፩, emit bare ፼) followed by (if `low > 0`: `sub(low)`).

**Zero-group / zero-cell rules that fall out of the above** (the divergence hotspot from analysis U1), stated as rules, not as asserted outputs:
- A `low` of 0 with `high > 0` emits the myriad separator ፼ and nothing after it (e.g. the ten-thousands boundary).
- A hundreds digit of 0 within a group emits no ፻ and no glyph for that cell.
- A multiplier of exactly 1 before ፻ or ፼ always omits the ፩ (R2).
- No zero glyph is ever emitted (there is none), and the two-group form means ፼ is never stacked in v1.

**Parse** is the exact structural inverse: scan the (at most) `‹sub(high)› ፼ ‹sub(low)›` shape, reject any arrangement the renderer would never produce.

**Rationale**: CLDR/Unicode is a constitution Tier-2 authority (Principle II) and is the provenance already chosen for this project's numeral/calendar vectors. Reingold & Dershowitz *Calendrical Calculations* corroborates the same system. Anchoring on the published rule set — rather than any single library's behavior — keeps the implementation aligned with the eventual external fixture.

**Alternatives considered**: Third-party libraries (`geez-numerals-converter`, `kidusmakonnen/geez`, `geez-lib`) — rejected as the *specification* source because they are implementations, not authorities (Principle III), and at least one shipped Ethiopic library maps 0 → ፩ (the exact defect Principle VII targets). They remain candidates for adoption *as a dependency* pending measurement (R5).

## R2 — Canonical form & parse strictness

**Decision**: Exactly one rendered string per integer (leading-1 omission is mandatory, not optional), and `from_geez` accepts **only** that canonical string — a strict bijection. Non-canonical-but-well-formed spellings (e.g. ፩፻ for 100) are rejected as malformed.

**Rationale**: A bijection makes `from_geez(to_geez(n)) == n` the strongest self-consistency guarantee available before the fixture exists (Principle IX interim), and gives a crisp, testable definition of "malformed." Settled in the 2026-08-30 clarification session.

**Alternatives considered**: Lenient normalizing parse (accept ፩፻) — deferred to a future explicit opt-in mode so real-world/OCR ingestion (User Story 2) can be added later without weakening the v1 core. Recorded, not built.

## R3 — Error taxonomy

**Decision**: A single dedicated error type per language carrying a machine-readable `reason`:
- JS: `class GeezNumeralError extends RangeError` with `reason` ∈ {`zero`, `negative`, `non_integer`, `out_of_range`, `empty`, `invalid_char`, `non_canonical`}.
- Python: `class GeezNumeralError(ValueError)` with the same `reason` values.

`to_geez` raises for `zero | negative | non_integer | out_of_range`. `from_geez` raises for `empty | invalid_char | non_canonical | out_of_range`.

**Rationale**: One typed error keeps callers' handling simple while `reason` lets tests assert *why* an input was rejected without asserting any numeral value. Subclassing the idiomatic base (`RangeError` / `ValueError`) means existing `except ValueError` / `catch (RangeError)` handlers still work.

**Alternatives considered**: Returning `null`/`None` or a sentinel — rejected; silent coercion is precisely the Principle VII failure. Multiple distinct exception classes — rejected as heavier than the `reason` field warrants.

## R4 — Money formatting shape (Assumption A3)

**Decision**: `format_money(amount, { numerals })` defaults `numerals: "arabic"`. When `numerals: "geez"` is explicitly passed, only the **whole-number part** renders in Ge'ez (via `to_geez`); any fractional/sub-unit part stays Arabic, because the system has no fractional notation. A whole-number part of 0 (e.g. amount 0.50) renders the integer part as Arabic `0` even in Ge'ez mode — `to_geez` is never called on 0.

**Numeric formatting (resolves analysis U2)** — the amount itself is formatted deterministically, locale-independently (Principle VIII):
- **Decimals**: exactly **2** fractional digits by default (standard currency minor unit), rounded half-up; callers may override the digit count via an option. In Ge'ez mode those fractional digits stay Arabic and are never passed to `to_geez`.
- **Grouping**: **no** thousands grouping separators are inserted (a plain integer part), to avoid a separator convention that would collide with the Ge'ez glyphs and to keep output locale-free. Arabic mode likewise emits an ungrouped integer part.
- **Negative amounts**: a leading ASCII `-` prefixes the formatted magnitude; the magnitude's whole part is rendered per the chosen mode. In Ge'ez mode the sign stays ASCII (Ge'ez has no sign) and `to_geez` still receives only the positive whole-number magnitude — so `to_geez` is never handed a negative or a zero.
- **Whole part above the numeral domain**: if `geez` mode is requested and the whole-number magnitude exceeds 99,999,999, `to_geez` raises `out_of_range` (no silent Arabic fallback).

**Rationale**: Directly satisfies Principle VII ("monetary values MUST default to Arabic numerals") while still offering opt-in Ge'ez for the integer part. Keeping sub-units Arabic avoids inventing notation the script does not have. Fixing decimals/grouping/sign makes the two language implementations byte-identical (Principle X) instead of leaking host-locale differences.

**Alternatives considered**: Ge'ez-by-default for money — prohibited by Principle VII. Rendering sub-units in Ge'ez — impossible without fabricating fractional glyphs.

## R5 — Principle III: reimplement vs. adopt

**Decision**: Implement from the CLDR rule set in v1; record a **release gate**: once `tests/vectors/numerals.json` exists, run each candidate package (`geez-numerals-converter`, etc.) against it and either (a) adopt the one that passes 100% of the gating set as a dependency, or (b) cite its measured failure to justify keeping the reimplementation.

**Rationale**: Principle III demands a *measured* failure before reimplementing, but measurement is impossible with no fixture. This sequences the obligation correctly: build now to unblock the surface, measure and justify before release.

**Alternatives considered**: Adopt a package immediately (unmeasured) — risks importing an unverified algorithm. Block until fixture — stalls the feature on an external artifact with no committed date.

## R6 — Acceptance sweep strategy (Principle IX)

**Decision**: Final acceptance = the authored `numerals.json` gating set passes in both languages **and** an **exhaustive round-trip** `from_geez(to_geez(n)) == n` over the full domain 1–99,999,999 in each language with zero exceptions. The JS↔PY parity sweep (interim, and ongoing) compares both directions over a deterministic set that includes **every** boundary and carry case (all powers of ten, all ...99→...00 transitions, 1 and 99,999,999, every single-glyph value) plus a dense stride sample; CI may sample the exhaustive sweep for speed but the full sweep is the release target.

**Rationale**: Round-trip over integers is cheap, so exhaustive coverage is feasible and matches Principle IX's "no spot-checks" intent. Explicit boundary enumeration guards the separator-placement and leading-1 logic where bugs concentrate.

**Alternatives considered**: Current-value spot checks — prohibited by Principle IX. Random-only sampling — rejected; deterministic boundary enumeration is reproducible and targets the fragile cases.

## Resolved unknowns

- Language/Version, Testing, Platform: inherited from features 001–002 (no new toolchain). ✅
- Upper bound (1–99,999,999), leading-1 omission, canonical-only parse: settled in spec Clarifications. ✅
- Error taxonomy, money shape, Principle III sequencing, sweep strategy: R3–R6 above. ✅

No NEEDS CLARIFICATION remain.
