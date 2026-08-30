"""Ge'ez (Ethiopic) numerals — deterministic bidirectional conversion.

Mirrors ``javascript/src/numerals.ts`` exactly. Layer 0: pure integer/string
arithmetic, no calendar dependency, no network/locale/timezone/clock
(Constitution Principle VIII).

The system has no zero, no sign, and no fraction (Principle VII): ``to_geez(0)``,
negatives, and non-integers all raise — never ፩, never "". Money defaults to
Arabic numerals.

Range and form (specs/003-geez-numerals): supports 1–99,999,999 (single-level
፼ myriad grouping — ፼ is never stacked in v1). Rendering is canonical (leading-1
omission: 100 → ፻, 10,000 → ፼); parsing accepts ONLY that canonical form (strict
bijection). Conformance values live only in the external
``tests/vectors/numerals.json`` (Principle I); nothing here asserts a value.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

# Largest value v1 renders/parses (single-level ፼).
GEEZ_MAX = 99_999_999

# Ge'ez numeral inventory (Unicode U+1369–U+137C). Index 0 is "" so a zero digit
# contributes nothing — there is no zero glyph.
_UNITS = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"]  # U+1369–U+1371
_TENS = ["", "፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"]  # U+1372–U+137A
_HUNDRED = "፻"  # U+137B
_MYRIAD = "፼"  # U+137C

_UNIT_OF = {g: i for i, g in enumerate(_UNITS) if g}
_TEN_OF = {g: i for i, g in enumerate(_TENS) if g}
_INVENTORY = set(_UNITS[1:]) | set(_TENS[1:]) | {_HUNDRED, _MYRIAD}

_REASONS = frozenset(
    {"zero", "negative", "non_integer", "out_of_range", "empty", "invalid_char", "non_canonical"}
)


class GeezNumeralError(ValueError):
    """The single typed error the numeral surface raises; carries ``reason``."""

    def __init__(self, reason: str, message: str) -> None:
        super().__init__(message)
        self.reason = reason


# --- rendering -------------------------------------------------------------


def _tens_units(v: int) -> str:
    """A value 0–99 → tens glyph + units glyph, each omitted when its digit is 0."""
    return _TENS[v // 10] + _UNITS[v % 10]


def _sub(x: int) -> str:
    """A group 1–9999 → hundreds cell (with ፻, leading-1 omitted) + trailing 0–99."""
    h, r = divmod(x, 100)
    out = ""
    if h > 0:
        out += ("" if h == 1 else _tens_units(h)) + _HUNDRED
    if r > 0:
        out += _tens_units(r)
    return out


def _require_domain(n: int) -> None:
    """Validate that ``n`` is an in-domain positive integer (Principle VII).

    Integer-valued floats are coerced by :func:`to_geez` before this is called,
    so only genuine non-integers reach the reject path here.
    """
    if isinstance(n, bool) or not isinstance(n, int):
        # bool is an int subclass but is not a numeral quantity.
        raise GeezNumeralError("non_integer", f"expected an integer, got {n!r}")
    if n == 0:
        raise GeezNumeralError("zero", "Ge'ez has no zero; 0 is out of domain")
    if n < 0:
        raise GeezNumeralError("negative", f"Ge'ez has no negatives; got {n}")
    if n > GEEZ_MAX:
        raise GeezNumeralError("out_of_range", f"above the supported maximum {GEEZ_MAX}; got {n}")


def to_geez(n: int) -> str:
    """Render integer ``n`` (1–99,999,999) as its canonical Ge'ez numeral string.

    Because n ≤ 99,999,999 it is exactly two myriad groups: ``high = n // 10000``,
    ``low = n % 10000``. Raises :class:`GeezNumeralError` for
    zero/negative/non-integer/over-range.
    """
    if isinstance(n, float) and n.is_integer():
        n = int(n)
    _require_domain(n)
    high, low = divmod(n, 10000)
    out = ""
    if high > 0:
        out += ("" if high == 1 else _sub(high)) + _MYRIAD
    if low > 0:
        out += _sub(low)
    return out


# --- parsing (canonical-only, strict inverse) ------------------------------


def _parse_tens_units(t: str) -> int:
    """Parse a 1–99 tens/units run; raises non_canonical on any anomaly."""
    i = 0
    tens = units = 0
    if i < len(t) and t[i] in _TEN_OF:
        tens = _TEN_OF[t[i]]
        i += 1
    if i < len(t) and t[i] in _UNIT_OF:
        units = _UNIT_OF[t[i]]
        i += 1
    if i != len(t) or (tens == 0 and units == 0):
        raise GeezNumeralError("non_canonical", f"not a canonical tens/units run: {t}")
    return tens * 10 + units


def _parse_sub(t: str) -> int:
    """Parse a 1–9999 group (optional hundreds cell via ፻); raises non_canonical."""
    idx = t.find(_HUNDRED)
    if idx == -1:
        return _parse_tens_units(t)
    if t.find(_HUNDRED, idx + 1) != -1:
        raise GeezNumeralError("non_canonical", f"more than one {_HUNDRED} in a group")
    h_part = t[:idx]
    r_part = t[idx + len(_HUNDRED):]
    h = 1 if h_part == "" else _parse_tens_units(h_part)
    r = 0 if r_part == "" else _parse_tens_units(r_part)
    return h * 100 + r


def from_geez(s: str) -> int:
    """Parse a canonical Ge'ez numeral string to its integer value.

    Accepts ONLY the exact output of :func:`to_geez` (strict bijection). Rejects
    empty/whitespace, non-inventory characters, non-canonical spellings (e.g.
    ፩፻), and anything implying a value above 99,999,999.
    """
    if not isinstance(s, str):
        raise GeezNumeralError("invalid_char", "expected a string")
    if s == "" or s.strip() == "":
        raise GeezNumeralError("empty", "empty numeral string")
    for ch in s:
        if ch not in _INVENTORY:
            raise GeezNumeralError("invalid_char", f"not a Ge'ez numeral character: {ch!r}")
    parts = s.split(_MYRIAD)
    if len(parts) > 2:
        # More than one ፼ implies ≥ 10^8 (stacking) — above the v1 domain.
        raise GeezNumeralError("out_of_range", "ten-thousand stacking is above the supported maximum")
    if len(parts) == 2:
        high_part, low_part = parts
        high = 1 if high_part == "" else _parse_sub(high_part)
        low = 0 if low_part == "" else _parse_sub(low_part)
        value = high * 10000 + low
    else:
        value = _parse_sub(s)
    # Canonical guard: only the renderer's own output is accepted.
    if value < 1 or value > GEEZ_MAX or to_geez(value) != s:
        raise GeezNumeralError("non_canonical", "not the canonical rendering of an in-range integer")
    return value


# --- money -----------------------------------------------------------------


def format_money(amount, *, numerals: str = "arabic", fraction_digits: int = 2) -> str:
    """Format a monetary ``amount``. Defaults to Arabic numerals (Principle VII).

    In ``"geez"`` mode only the whole-number part is rendered in Ge'ez (via
    :func:`to_geez`); fractional digits stay Arabic and a zero whole part stays
    Arabic ``"0"``. No thousands grouping; negatives get an ASCII ``-``;
    deterministic and locale-free.
    """
    if numerals not in ("arabic", "geez"):
        raise GeezNumeralError("invalid_char", f"unknown numerals option: {numerals!r}")
    if isinstance(fraction_digits, bool) or not isinstance(fraction_digits, int):
        raise GeezNumeralError("non_integer", f"fraction_digits must be an integer, got {fraction_digits!r}")
    if fraction_digits < 0 or fraction_digits > 100:
        raise GeezNumeralError("out_of_range", f"fraction_digits must be in 0..100, got {fraction_digits}")
    quantum = Decimal(1).scaleb(-fraction_digits)
    dec = Decimal(str(amount)).quantize(quantum, rounding=ROUND_HALF_UP)
    # Sign comes from the ROUNDED magnitude: negative zero compares equal to 0,
    # so a tiny -0.001 formats as "0.00", never "-0.00". abs() kills the -0.
    sign = "-" if dec < 0 else ""
    text = f"{abs(dec):.{fraction_digits}f}"
    whole_str, _, frac_str = text.partition(".")
    whole = int(whole_str)
    rendered_whole = to_geez(whole) if numerals == "geez" and whole > 0 else whole_str
    tail = f".{frac_str}" if frac_str else ""
    return sign + rendered_whole + tail
