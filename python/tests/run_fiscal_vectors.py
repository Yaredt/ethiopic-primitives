#!/usr/bin/env python3
"""Fiscal conformance runner (Python). Consumes the externally authored
`tests/vectors/fiscal.json` (Principle I). SKIPs cleanly with exit 0 if the
fixture is absent, so the build stays green until it arrives.

The schema below is the anticipated shape from specs/002-fiscal-logic/data-model.md;
align it to the fixture author's final schema, but never author expected values here.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from ethiopic_primitives import (  # noqa: E402
    EthiopianDate,
    aging_bucket,
    fiscal_period,
    fiscal_quarter,
    fiscal_year_bounds,
    fiscal_year_for,
)

PATH = pathlib.Path(__file__).resolve().parents[2] / "tests" / "vectors" / "fiscal.json"


def _ed(triple) -> EthiopianDate:
    y, m, d = triple
    return EthiopianDate(y, m, d)


def _check(v: dict) -> bool:
    kind = v["kind"]
    inp = v["input"]
    exp = v["expected"]
    if kind == "fiscal_year":
        return fiscal_year_for(_ed(inp)) == exp
    if kind == "quarter":
        return fiscal_quarter(_ed(inp)) == exp
    if kind == "period":
        return fiscal_period(_ed(inp)) == exp
    if kind == "bounds":
        start, end = fiscal_year_bounds(inp)
        return (
            [start.year, start.month, start.day] == list(exp["start"])
            and [end.year, end.month, end.day] == list(exp["end"])
        )
    if kind == "aging":
        a = aging_bucket(_ed(inp["invoice"]), _ed(inp["as_of"]), inp.get("buckets", (30, 60, 90)))
        return (
            (exp.get("days") is None or a.days == exp["days"])
            and (exp.get("bucketIndex") is None or a.bucket_index == exp["bucketIndex"])
            and (exp.get("label") is None or a.label == exp["label"])
        )
    raise ValueError(f"unknown fiscal vector kind: {kind}")


def main() -> int:
    if not PATH.exists():
        print("PY fiscal conformance: SKIP (no tests/vectors/fiscal.json yet)")
        return 0
    doc = json.loads(PATH.read_text(encoding="utf-8"))
    vectors = doc["vectors"]
    gating = sum(1 for v in vectors if v.get("gating"))
    failures = [v for v in vectors if v.get("gating") and not _check(v)]
    print(f"PY fiscal conformance: {len(vectors)} vectors ({gating} gating), {len(failures)} gating failures")
    for v in failures[:8]:
        print(f"   GATING {v['kind']} input={v['input']} expected={v['expected']}")
    if failures:
        print("::error::Principle I/X — fiscal gating vectors must pass")
        return 1
    print("PY fiscal conformance: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
