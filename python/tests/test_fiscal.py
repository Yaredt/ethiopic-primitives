"""Contract tests for fiscal logic (unittest — no external dependency).

Per Constitution Principle I these assert ONLY self-consistency, structural
invariants, and error contracts — never a hand-authored fiscal value. In
particular they do NOT assert where Hamle 1 or Sene 30 fall; only that the fiscal
boundary is sharp and the labels are contiguous. Mirrors javascript/test/fiscal.test.ts.
"""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from ethiopic_primitives import (  # noqa: E402
    EthiopianDate,
    aging_bucket,
    fiscal_period,
    fiscal_quarter,
    fiscal_year_bounds,
    fiscal_year_for,
)


class FiscalContract(unittest.TestCase):
    def test_bounds_round_trip(self):
        for fy in range(1996, 2021):
            start, end = fiscal_year_bounds(fy)
            self.assertEqual(fiscal_year_for(start), fy)
            self.assertEqual(fiscal_year_for(end), fy)
            self.assertEqual(fiscal_year_for(start.add_days(-1)), fy - 1)
            self.assertEqual(fiscal_year_for(end.add_days(1)), fy + 1)

    def test_label_stable_within_year(self):
        start, end = fiscal_year_bounds(2015)
        d = start
        while d.to_gregorian() <= end.to_gregorian():
            self.assertEqual(fiscal_year_for(d), 2015)
            d = d.add_days(1)

    def test_total_coverage(self):
        for em in range(1, 14):
            length = 6 if (em == 13 and 2011 % 4 == 3) else (5 if em == 13 else 30)
            for ed in range(1, length + 1):
                d = EthiopianDate(2011, em, ed)
                self.assertIn(fiscal_quarter(d), (1, 2, 3, 4))
                self.assertTrue(1 <= fiscal_period(d) <= 13)

    def test_pagume_period_distinct(self):
        pagume = fiscal_period(EthiopianDate(2011, 13, 1))
        regular = {fiscal_period(EthiopianDate(2011, em, 1)) for em in range(1, 13)}
        self.assertNotIn(pagume, regular)

    def test_aging_days_match_calendar(self):
        inv = EthiopianDate(2012, 12, 25)
        asof = EthiopianDate(2013, 1, 15)  # crosses Pagumē
        self.assertEqual(aging_bucket(inv, asof).days, inv.days_until(asof))

    def test_aging_monotonic(self):
        inv = EthiopianDate(2012, 1, 1)
        prev = -1
        for n in (0, 10, 30, 31, 60, 61, 90, 91, 200):
            idx = aging_bucket(inv, inv.add_days(n)).bucket_index
            self.assertGreaterEqual(idx, prev)
            prev = idx

    def test_aging_backward_raises(self):
        inv = EthiopianDate(2012, 5, 10)
        with self.assertRaises(ValueError):
            aging_bucket(inv, inv.add_days(-1))

    def test_custom_thresholds(self):
        inv = EthiopianDate(2012, 1, 1)
        a = aging_bucket(inv, inv.add_days(45), [15, 45, 75])
        self.assertEqual(a.bucket_index, 1)  # 45 <= 45 -> index 1 (threshold arithmetic)


if __name__ == "__main__":
    unittest.main()
