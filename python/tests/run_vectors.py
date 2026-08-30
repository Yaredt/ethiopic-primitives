#!/usr/bin/env python3
"""Conformance runner (Python): drive every shared vector through the wrapper,
both directions. The vectors are the acceptance criteria (Constitution
Principle I); this file asserts nothing of its own.

Exit 0 iff every gating vector round-trips both ways. The summary line mirrors
the JS runner so a cross-language harness can compare them.
"""
import json
import pathlib
import sys
from datetime import date

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from ethiopic_primitives import EthiopianDate  # noqa: E402

VECTORS = pathlib.Path(__file__).resolve().parents[2] / "tests" / "vectors" / "calendar.json"


def main() -> int:
    doc = json.loads(VECTORS.read_text(encoding="utf-8"))
    vectors = doc["vectors"]
    gating = 0
    gating_failures = []
    other_failures = []

    for v in vectors:
        ey, em, ed = v["ethiopic"]
        gy, gm, gd = v["gregorian"]
        if v.get("gating"):
            gating += 1
        bucket = gating_failures if v.get("gating") else other_failures

        # Per-vector guard: the dependency does not support Ethiopian years below
        # ~8 (the epoch vector eth 1-1-1 is non-gating). An exception on a
        # non-gating vector is recorded, never fatal; on a gating vector it gates.
        try:
            e = EthiopianDate.from_gregorian(date(gy, gm, gd))
            if (e.year, e.month, e.day) != (ey, em, ed):
                bucket.append(("g2e", v, (e.year, e.month, e.day)))
        except Exception as ex:  # noqa: BLE001
            bucket.append(("g2e", v, f"EXC {ex!r}"[:60]))

        try:
            g = EthiopianDate(ey, em, ed).to_gregorian()
            if (g.year, g.month, g.day) != (gy, gm, gd):
                bucket.append(("e2g", v, (g.year, g.month, g.day)))
        except Exception as ex:  # noqa: BLE001
            bucket.append(("e2g", v, f"EXC {ex!r}"[:60]))

    print(
        f"PY conformance: {len(vectors)} vectors ({gating} gating), "
        f"{len(gating_failures)} gating failures, {len(other_failures)} non-gating failures"
    )
    for direction, v, got in (gating_failures + other_failures)[:8]:
        tag = "GATING" if v.get("gating") else "info  "
        shown = list(got) if isinstance(got, tuple) else got
        print(f"   {tag} {direction} eth={v['ethiopic']} greg={v['gregorian']} got={shown}")

    if gating_failures:
        print("::error::Principle I/X — gating vectors must pass in every runner")
        return 1
    print("PY conformance: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
