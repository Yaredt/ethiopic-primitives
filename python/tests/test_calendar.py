"""Contract tests for the Python wrapper (unittest — no external dependency).

Per Constitution Principle I these assert ONLY wiring, error handling, type
contracts, and self-consistency — never a hand-written conversion result. The
authored expectations live solely in tests/vectors/, exercised by run_vectors.py.
"""
import json
import pathlib
import sys
import unittest
from datetime import date

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from ethiopic_primitives import EthiopianDate, Era  # noqa: E402

VECTORS = pathlib.Path(__file__).resolve().parents[2] / "tests" / "vectors" / "calendar.json"


class WrapperContract(unittest.TestCase):
    def test_gating_vectors_round_trip(self):
        doc = json.loads(VECTORS.read_text(encoding="utf-8"))
        failures = 0
        for v in doc["vectors"]:
            if not v.get("gating"):
                continue
            ey, em, ed = v["ethiopic"]
            gy, gm, gd = v["gregorian"]
            e = EthiopianDate.from_gregorian(date(gy, gm, gd))
            g = EthiopianDate(ey, em, ed).to_gregorian()
            if (e.year, e.month, e.day) != (ey, em, ed) or (g.year, g.month, g.day) != (gy, gm, gd):
                failures += 1
        self.assertEqual(failures, 0)

    def test_self_consistent_round_trip(self):
        # Self-consistency only; no authored value.
        d = date(1995, 1, 1)
        end = date(2030, 12, 31)
        while d <= end:
            self.assertEqual(EthiopianDate.from_gregorian(d).to_gregorian(), d)
            d = date.fromordinal(d.toordinal() + 1)

    def test_month_thirteen_is_representable(self):
        # Contract: Pagumē must be a legal month value (Principle VI).
        self.assertEqual(EthiopianDate(2003, 13, 1).month, 13)

    def test_rejects_out_of_range(self):
        for bad in [(2000, 0, 1), (2000, 14, 1), (2000, 1, 0), (2000, 1, 31)]:
            with self.assertRaises((ValueError, TypeError)):
                EthiopianDate(*bad)

    def test_immutability(self):
        a = EthiopianDate(2000, 1, 1)
        with self.assertRaises(Exception):
            a.day = 5  # frozen dataclass
        b = a.add_days(40)
        self.assertIsNot(a, b)
        self.assertEqual(a.day, 1)

    def test_add_months_clamps_into_target(self):
        # Self-consistent contract: result is always a legal date and the day
        # never exceeds the target month's length. No authored calendar value.
        start = EthiopianDate(2000, 12, 30)   # 30-day month
        nxt = start.add_months(1)             # lands in Pagumē (5 or 6 days)
        self.assertEqual(nxt.month, 13)
        self.assertLessEqual(nxt.day, 6)
        # add_months(n) then add_months(-n) returns to the same month/year.
        back = nxt.add_months(-1)
        self.assertEqual((back.year, back.month), (2000, 12))

    def test_amete_alem_era_offset(self):
        m = EthiopianDate(2000, 1, 1, Era.AMETE_MIHRET)
        a = m.to_era(Era.AMETE_ALEM)
        self.assertEqual(a.year, 7500)  # +5500 era offset, not a calendar conversion
        self.assertEqual(a.to_gregorian(), m.to_gregorian())


if __name__ == "__main__":
    unittest.main()
