#!/usr/bin/env python3
"""Folding conformance runner (Python). Consumes the externally authored
`tests/vectors/folding.json` (Principle I). SKIPs cleanly with exit 0 if the fixture
is absent, so the build stays green until it arrives.

The schema below is the anticipated shape from specs/004-script-equivalence/data-model.md;
align it to the fixture author's final schema, but never author expected values here.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from ethiopic_primitives import EquivalenceError, equal, fold  # noqa: E402

PATH = pathlib.Path(__file__).resolve().parents[2] / "tests" / "vectors" / "folding.json"


def _check(v: dict) -> bool:
    kind = v["kind"]
    inp = v["input"]
    if kind == "fold":
        r = fold(inp["text"], inp["language"], inp["scheme"], acknowledge_lossy=inp.get("acknowledgeLossy") is True)
        exp = v["expected"]
        return (
            (exp.get("folded") is None or r.folded == exp["folded"])
            and (exp.get("offsets") is None or list(r.offsets) == list(exp["offsets"]))
        )
    if kind == "equal":
        return equal(inp["a"], inp["b"], inp["language"]) == v["expected"]
    if kind == "error":
        try:
            if inp.get("op") == "equal":
                equal(inp["a"], inp["b"], inp["language"])
            else:
                fold(inp["text"], inp["language"], inp["scheme"], acknowledge_lossy=inp.get("acknowledgeLossy") is True)
            return False
        except EquivalenceError as e:
            return e.reason == v["expected"]["reason"]
    raise ValueError(f"unknown folding vector kind: {kind}")


def main() -> int:
    if not PATH.exists():
        print("PY folding conformance: SKIP (no tests/vectors/folding.json yet)")
        return 0
    doc = json.loads(PATH.read_text(encoding="utf-8"))
    vectors = doc["vectors"]
    gating = sum(1 for v in vectors if v.get("gating"))
    failures = [v for v in vectors if v.get("gating") and not _check(v)]
    print(f"PY folding conformance: {len(vectors)} vectors ({gating} gating), {len(failures)} gating failures")
    for v in failures[:8]:
        print(f"   GATING {v['kind']} input={v['input']}")
    if failures:
        print("::error::Principle I/X — folding gating vectors must pass")
        return 1
    print("PY folding conformance: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
