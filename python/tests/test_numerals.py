"""unittest suite for Ge'ez numerals. Per Constitution Principle I this asserts
ONLY error contracts, round-trip self-consistency, and structural invariants —
never a hand-authored numeral value. To keep that machine-checkable (SC-006),
this file contains NO raw Ethiopic glyphs: any Ge'ez string it needs is built
from code points (U+1369–U+137C) or from the functions under test.
"""

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from ethiopic_primitives import (  # noqa: E402
    GEEZ_MAX,
    GeezNumeralError,
    format_money,
    from_geez,
    to_geez,
)

# Inventory constructed (not literal) so this file stays glyph-free for SC-006.
_INVENTORY = {chr(cp) for cp in range(0x1369, 0x137D)}
_U1 = chr(0x1369)  # one
_HUNDRED = chr(0x137B)


def _sample_values():
    """Boundary + carry hotspots (research R1 / analysis U1) plus a fixed stride."""
    s = {1, 9, 10, 11, 99, 100, 101, 999, 1000, 9999, GEEZ_MAX}
    for p in range(1, 8):
        s.add(10 ** p)
    s.update({10000, 10001, 10100, 20000, 100000, 1000000, 1000001, 10000000})
    s.update(range(1, 100001, 111))  # dense stride (matches numerals_parity)
    return sorted(n for n in s if 1 <= n <= GEEZ_MAX)


class RenderContracts(unittest.TestCase):
    def test_rejects_closed_domain_violations(self):
        for value, reason in [(0, "zero"), (-5, "negative"), (3.5, "non_integer"), (GEEZ_MAX + 1, "out_of_range")]:
            with self.assertRaises(GeezNumeralError) as ctx:
                to_geez(value)
            self.assertEqual(ctx.exception.reason, reason)

    def test_output_nonempty_inventory_only(self):
        for n in _sample_values():
            g = to_geez(n)
            self.assertTrue(g, f"empty render for {n}")
            self.assertTrue(all(ch in _INVENTORY for ch in g), f"non-inventory char in render of {n}")


class RoundTrip(unittest.TestCase):
    def test_strict_bijection(self):
        for n in _sample_values():
            self.assertEqual(from_geez(to_geez(n)), n, f"round-trip failed at {n}")


class ParseContracts(unittest.TestCase):
    def test_rejects_malformed(self):
        for text, reason in [("", "empty"), ("   ", "empty"), ("A1", "invalid_char"), (_U1 + _HUNDRED, "non_canonical")]:
            with self.assertRaises(GeezNumeralError) as ctx:
                from_geez(text)
            self.assertEqual(ctx.exception.reason, reason)


class Money(unittest.TestCase):
    def test_default_arabic_and_geez_whole_part(self):
        self.assertEqual(format_money(1234.5), "1234.50")
        self.assertEqual(format_money(1234.5, numerals="geez"), to_geez(1234) + ".50")
        self.assertEqual(format_money(0.5, numerals="geez"), "0.50")  # whole part 0 stays Arabic
        self.assertEqual(format_money(-5), "-5.00")
        self.assertEqual(format_money(-5, numerals="geez"), "-" + to_geez(5) + ".00")

    def test_rounds_half_up_identically_to_js(self):
        # Expected values are shared verbatim with javascript/test/numerals.test.ts so
        # the two languages must agree byte-for-byte (Principle X). These are Arabic
        # money strings, not Ge'ez numeral values (Principle I is not engaged).
        cases = [
            (2.675, 2, "2.68"),
            (1.005, 2, "1.01"),
            (0.125, 2, "0.13"),
            (0.005, 2, "0.01"),
            (10.995, 2, "11.00"),
            (-2.675, 2, "-2.68"),
            (1234.5, 2, "1234.50"),
            (2.5, 0, "3"),
        ]
        for amount, fraction_digits, expected in cases:
            self.assertEqual(
                format_money(amount, fraction_digits=fraction_digits),
                expected,
                f"format_money({amount}, fraction_digits={fraction_digits})",
            )

    def test_rounds_to_zero_is_not_negative(self):
        self.assertEqual(format_money(-0.001), "0.00")
        self.assertEqual(format_money(-0.004, numerals="geez"), "0.00")
        self.assertEqual(format_money(-2.675), "-2.68")  # a non-zero negative keeps its sign

    def test_invalid_fraction_digits_raises_typed_error(self):
        for fd, reason in [(-1, "out_of_range"), (101, "out_of_range"), (True, "non_integer")]:
            with self.assertRaises(GeezNumeralError) as ctx:
                format_money(10, fraction_digits=fd)
            self.assertEqual(ctx.exception.reason, reason)

    def test_unknown_option_and_zero_never_geez(self):
        with self.assertRaises(GeezNumeralError) as ctx:
            format_money(10, numerals="roman")
        self.assertEqual(ctx.exception.reason, "invalid_char")
        self.assertEqual(format_money(0, numerals="geez"), "0.00")  # 0 never reaches to_geez


if __name__ == "__main__":
    unittest.main()
