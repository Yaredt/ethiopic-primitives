#!/usr/bin/env python3
"""Numeral conformance runner (Python). Consumes the externally authored
`tests/vectors/numerals.json` (Principle I). SKIPs cleanly with exit 0 if the
fixture is absent, so the build stays green until it arrives.

The schema below is the anticipated shape from specs/003-geez-numerals/data-model.md;
align it to the fixture author's final schema, but never author expected values here.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from ethiopic_primitives import from_geez, to_geez  # noqa: E402

PATH = pathlib.Path(__file__).resolve().parents[2] / "tests" / "vectors" / "numerals.json"


def _check(v: dict) -> bool:
    kind = v["kind"]
    if kind == "to_geez":
        return to_geez(v["input"]) == v["expected"]
    if kind == "from_geez":
        return from_geez(v["input"]) == v["expected"]
    raise ValueError(f"unknown numeral vector kind: {kind}")


def main() -> int:
    if not PATH.exists():
        print("PY numeral conformance: SKIP (no tests/vectors/numerals.json yet)")
        return 0
    doc = json.loads(PATH.read_text(encoding="utf-8"))
    vectors = doc["vectors"]
    gating = sum(1 for v in vectors if v.get("gating"))
    failures = [v for v in vectors if v.get("gating") and not _check(v)]
    print(f"PY numeral conformance: {len(vectors)} vectors ({gating} gating), {len(failures)} gating failures")
    for v in failures[:8]:
        print(f"   GATING {v['kind']} input={v['input']}")
    if failures:
        print("::error::Principle I/X — numeral gating vectors must pass")
        return 1
    print("PY numeral conformance: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
