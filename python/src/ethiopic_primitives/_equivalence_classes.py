"""Ge'ez homophone equivalence-class tables (the single swap point).

Mirrors ``javascript/src/equivalence-classes.ts`` exactly.

PROVENANCE (research R1; NOT ICU/CLDR collation — collation encodes sort order and
keeps these letters distinct). These are the documented "redundant" Amharic fidäl:
base consonants that are phonemically homophonous in Amharic. Each base occupies 7
consecutive vowel orders in the Unicode Ethiopic block (U+1200–U+137F); folding maps
a homophone base to a canonical representative base, preserving the vowel order.

Exact class membership is owned and validated by the external
``tests/vectors/folding.json`` (Principle I). If that fixture disagrees, correct the
families below — this file only, never the fold functions, never the tests.

Families (representative ← homophones), by base start code point:
    H (h-family):          ሀ U+1200 ← ሐ U+1210, ኀ U+1280
    S (s-family):          ሰ U+1230 ← ሠ U+1220
    L (laryngeal/glottal): አ U+12A0 ← ዐ U+12D0
H_ONLY folds H only; HSL folds H + S + L. The ejective ṣ pair (ጸ U+1338 / ፀ U+1340)
is a candidate the fixture may add to HSL; it is left out of v1 pending that
validation. The 8th (labiovelar) forms are likewise fixture territory.
"""

# Standard vowel orders per base consonant.
_ORDERS = 7

# (representative_base_start, (homophone_base_starts, ...))
_H_FAMILY = (0x1200, (0x1210, 0x1280))
_S_FAMILY = (0x1230, (0x1220,))
_L_FAMILY = (0x12A0, (0x12D0,))


def _add_family(m: dict[int, int], family) -> None:
    rep, sources = family
    for src in sources:
        for o in range(_ORDERS):
            m[src + o] = rep + o


_H_ONLY_MAP: dict[int, int] = {}
_add_family(_H_ONLY_MAP, _H_FAMILY)

_HSL_MAP: dict[int, int] = {}
_add_family(_HSL_MAP, _H_FAMILY)
_add_family(_HSL_MAP, _S_FAMILY)
_add_family(_HSL_MAP, _L_FAMILY)


def class_map(scheme: str) -> dict[int, int]:
    """Code-point → representative map for a scheme. Representatives are absent
    (they fold to themselves), keeping folding idempotent."""
    return _HSL_MAP if scheme == "HSL" else _H_ONLY_MAP
