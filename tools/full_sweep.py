#!/usr/bin/env python3
"""Constitution Principle IX: day-by-day sweep, both directions, zero tolerance.

A green vector run is NOT acceptance. Both known-broken Ethiopic libraries
convert the current date correctly.
"""
import argparse, sys
from datetime import date

EPOCH = 1724221          # Meskerem 1, year 1 (Amete Mihret)
CUM = [0, 365, 730, 1096]  # day offsets of years 1..4 in a cycle; year 3 is leap


def eth_to_jdn(y, m, d):
    return EPOCH + 365 * (y - 1) + y // 4 + 30 * (m - 1) + (d - 1)


def greg_to_jdn(y, m, d):
    a = (14 - m) // 12; yy = y + 4800 - a; mm = m + 12 * a - 3
    return d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045


def jdn_to_greg(j):
    a = j + 32044; b = (4 * a + 3) // 146097; c = a - 146097 * b // 4
    dd = (4 * c + 3) // 1461; e = c - 1461 * dd // 4; m = (5 * e + 2) // 153
    return (100 * b + dd - 4800 + m // 10, m + 3 - 12 * (m // 10), e - (153 * m + 2) // 5 + 1)


def eth_to_greg(y, m, d):
    return jdn_to_greg(eth_to_jdn(y, m, d))


def greg_to_eth(gy, gm, gd):
    n = greg_to_jdn(gy, gm, gd) - EPOCH
    c, r = divmod(n, 1461)
    i = max(k for k in range(4) if CUM[k] <= r)
    doy = r - CUM[i]
    return (4 * c + i + 1, doy // 30 + 1, doy % 30 + 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="lo", type=int, default=1990)
    ap.add_argument("--to", dest="hi", type=int, default=2035)
    a = ap.parse_args()

    bad = err = tot = 0
    examples = []
    d = date(a.lo, 1, 1)
    end = date(a.hi, 12, 31)
    while d <= end:
        tot += 1
        try:
            e = greg_to_eth(d.year, d.month, d.day)
            back = eth_to_greg(*e)
            if back != (d.year, d.month, d.day):
                bad += 1
                if len(examples) < 5:
                    examples.append((d.isoformat(), e, back))
        except Exception as ex:
            err += 1
            if len(examples) < 5:
                examples.append((d.isoformat(), "EXC", repr(ex)[:60]))
        d = date.fromordinal(d.toordinal() + 1)

    print(f"Principle IX sweep {a.lo}-{a.hi}: {tot} days, {bad} mismatches, {err} exceptions")
    for x in examples:
        print("  ", x)
    if bad or err:
        print("::error::Principle IX violation — sweep must be zero-tolerance")
        return 1
    print("Principle IX: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
