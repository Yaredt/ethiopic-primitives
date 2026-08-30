#!/usr/bin/env python3
"""Principle IX sweep (Python wrapper): a green vector run is NOT acceptance.
Walk every Gregorian day across a range through the wrapper to Ethiopic and back,
zero mismatches and zero exceptions. This exercises the shipped dependency exactly
as callers will use it, not the reference algorithm in tools/full_sweep.py.
"""
import argparse
import pathlib
import sys
from datetime import date

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from ethiopic_primitives import EthiopianDate  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="lo", type=int, default=1990)
    ap.add_argument("--to", dest="hi", type=int, default=2035)
    a = ap.parse_args()

    total = mismatches = exceptions = 0
    examples = []
    d = date(a.lo, 1, 1)
    end = date(a.hi, 12, 31)
    while d <= end:
        total += 1
        try:
            e = EthiopianDate.from_gregorian(d)
            back = e.to_gregorian()
            if back != d:
                mismatches += 1
                if len(examples) < 5:
                    examples.append((d.isoformat(), str(e), back.isoformat()))
        except Exception as ex:  # noqa: BLE001
            exceptions += 1
            if len(examples) < 5:
                examples.append((d.isoformat(), "EXC", repr(ex)[:60]))
        d = date.fromordinal(d.toordinal() + 1)

    print(
        f"Principle IX sweep {a.lo}-{a.hi}: {total} conversions, "
        f"{mismatches} mismatches, {exceptions} exceptions"
    )
    for x in examples:
        print("  ", x)
    if mismatches or exceptions:
        print("::error::Principle IX violation — sweep must be zero-tolerance")
        return 1
    print("Principle IX (PY): PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
