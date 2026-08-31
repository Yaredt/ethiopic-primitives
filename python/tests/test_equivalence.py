"""unittest suite for Ge'ez-script equivalence. Per Constitution Principle I /
FR-011 this asserts ONLY membership-free properties — determinism, idempotence,
length/offset structure, scheme tagging, and error/acknowledge contracts. It NEVER
asserts that two distinct inputs fold equal (or differ): which characters collate is
class membership, owned by the external tests/vectors/folding.json.

To keep that machine-checkable (SC-007), this file contains NO raw Ethiopic fidäl
(U+1200–U+137F): every fidäl input is built from code points.
"""

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from ethiopic_primitives import (  # noqa: E402
    EquivalenceError,
    FoldScheme,
    Language,
    equal,
    fold,
    folded_equal,
    keys_equal,
)

# Fidäl inputs constructed (not literal). A spread of family members + non-fidäl.
_FID = "".join(chr(cp) for cp in (0x1210, 0x1280, 0x1230, 0x1220, 0x12A0, 0x12D0))
_MIXED = _FID + " abc-123 " + chr(0x1369)  # + ASCII + a Ge'ez numeral (built, not literal)
_NON_FIDEL = "Addis 2016 — #7"  # no Ethiopic block characters at all

_SCHEMES = (FoldScheme.H_ONLY, FoldScheme.HSL)


class Structural(unittest.TestCase):
    def test_length_preserving_with_offset_map(self):
        for scheme in _SCHEMES:
            r = fold(_MIXED, Language.AMHARIC, scheme)
            self.assertEqual(len(r.folded), len(_MIXED), "folded code-point count must equal input")
            self.assertEqual(len(r.offsets), len(r.folded), "offset map length must equal folded length")
            self.assertTrue(all(0 <= o < len(_MIXED) for o in r.offsets))
            self.assertEqual(r.scheme, scheme)
            self.assertEqual(r.language, Language.AMHARIC)

    def test_deterministic_and_idempotent(self):
        for scheme in _SCHEMES:
            a = fold(_MIXED, Language.AMHARIC, scheme).folded
            b = fold(_MIXED, Language.AMHARIC, scheme).folded
            self.assertEqual(a, b)
            self.assertEqual(fold(a, Language.AMHARIC, scheme).folded, a, "idempotent")

    def test_non_fidel_unchanged_and_empty(self):
        for scheme in _SCHEMES:
            r = fold(_NON_FIDEL, Language.AMHARIC, scheme)
            self.assertEqual(r.folded, _NON_FIDEL)
            self.assertEqual(r.offsets, tuple(range(len(_NON_FIDEL))))
            e = fold("", Language.AMHARIC, scheme)
            self.assertEqual(e.folded, "")
            self.assertEqual(e.offsets, ())


class Guards(unittest.TestCase):
    def test_language_required_and_validated(self):
        with self.assertRaises(EquivalenceError) as c:
            fold(_FID, None, FoldScheme.H_ONLY)
        self.assertEqual(c.exception.reason, "missing_language")
        with self.assertRaises(EquivalenceError) as c:
            fold(_FID, "KLINGON", FoldScheme.H_ONLY)
        self.assertEqual(c.exception.reason, "unknown_language")

    def test_scheme_required_and_validated(self):
        with self.assertRaises(EquivalenceError) as c:
            fold(_FID, Language.AMHARIC, None)
        self.assertEqual(c.exception.reason, "missing_scheme")
        with self.assertRaises(EquivalenceError) as c:
            fold(_FID, Language.AMHARIC, "SOUNDEX")
        self.assertEqual(c.exception.reason, "unknown_scheme")

    def test_geez_never_folds_but_compares(self):
        with self.assertRaises(EquivalenceError) as c:
            fold(_FID, Language.GE_EZ, FoldScheme.H_ONLY)
        self.assertEqual(c.exception.reason, "geez_not_foldable")
        self.assertTrue(equal(_FID, _FID, Language.GE_EZ))
        self.assertFalse(equal(_FID, _FID + "x", Language.GE_EZ))

    def test_tigrinya_requires_acknowledgement(self):
        with self.assertRaises(EquivalenceError) as c:
            fold(_FID, Language.TIGRINYA, FoldScheme.HSL)
        self.assertEqual(c.exception.reason, "tigrinya_requires_ack")
        r = fold(_FID, Language.TIGRINYA, FoldScheme.HSL, acknowledge_lossy=True)
        self.assertEqual(r.scheme, FoldScheme.HSL)
        self.assertEqual(len(r.folded), len(_FID))
        self.assertTrue(folded_equal(_FID, _FID, Language.TIGRINYA, FoldScheme.HSL, acknowledge_lossy=True))


class SchemeSafety(unittest.TestCase):
    def test_tagging_and_scheme_mismatch(self):
        h = fold(_MIXED, Language.AMHARIC, FoldScheme.H_ONLY)
        s = fold(_MIXED, Language.AMHARIC, FoldScheme.HSL)
        self.assertEqual(h.scheme, FoldScheme.H_ONLY)
        self.assertEqual(s.scheme, FoldScheme.HSL)
        self.assertTrue(keys_equal(h, fold(_MIXED, Language.AMHARIC, FoldScheme.H_ONLY)))
        with self.assertRaises(EquivalenceError) as c:
            keys_equal(h, s)
        self.assertEqual(c.exception.reason, "scheme_mismatch")


if __name__ == "__main__":
    unittest.main()
