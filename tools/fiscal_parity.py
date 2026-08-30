#!/usr/bin/env python3
"""Cross-language fiscal parity (Constitution Principle X), pre-fixture.

Until an authored `tests/vectors/fiscal.json` exists, this demonstrates that the
TypeScript and Python fiscal implementations agree, by generating a range of
Ethiopian dates and aging pairs and comparing both languages line by line. It
asserts only "JS == PY" — never a hand-authored fiscal value (Principle I).

Run from repo root:  python tools/fiscal_parity.py --from 1990 --to 2000
"""
import argparse
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python" / "src"))

from ethiopic_primitives import (  # noqa: E402
    EthiopianDate,
    aging_bucket,
    fiscal_period,
    fiscal_quarter,
    fiscal_year_for,
)


def _days_in_month(ey: int, em: int) -> int:
    # Iteration scaffolding only (calendar structure), not a fiscal value.
    if em < 13:
        return 30
    return 6 if ey % 4 == 3 else 5


def python_rows(lo: int, hi: int) -> list[str]:
    out: list[str] = []
    for ey in range(lo, hi + 1):
        for em in range(1, 14):
            for ed in range(1, _days_in_month(ey, em) + 1):
                d = EthiopianDate(ey, em, ed)
                out.append(f"D,{ey},{em},{ed},{fiscal_year_for(d)},{fiscal_quarter(d)},{fiscal_period(d)}")
        if ey < hi:
            inv = EthiopianDate(ey, 12, 25)
            asof = EthiopianDate(ey + 1, 1, 5)
            a = aging_bucket(inv, asof)
            out.append(f"A,{ey},{a.days},{a.bucket_index},{a.label}")
    return out


def js_rows(lo: int, hi: int) -> list[str]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not found on PATH")
    proc = subprocess.run(
        [node, "--experimental-strip-types", "javascript/test/fiscal_dump.ts",
         "--from", str(lo), "--to", str(hi)],
        cwd=ROOT, capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"JS dump failed:\n{proc.stdout}\n{proc.stderr}")
    return [ln for ln in proc.stdout.replace("\r\n", "\n").split("\n") if ln]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="lo", type=int, default=1990)
    ap.add_argument("--to", dest="hi", type=int, default=2000)
    a = ap.parse_args()

    py = python_rows(a.lo, a.hi)
    js = js_rows(a.lo, a.hi)

    mismatches = 0
    examples = []
    if len(py) != len(js):
        print(f"::error::row count differs — PY {len(py)} vs JS {len(js)}")
    for i in range(min(len(py), len(js))):
        if py[i] != js[i]:
            mismatches += 1
            if len(examples) < 5:
                examples.append(f"  line {i}: PY={py[i]}  JS={js[i]}")
    count_gap = abs(len(py) - len(js))

    print(f"fiscal parity {a.lo}-{a.hi}: {min(len(py), len(js))} rows compared, "
          f"{mismatches} mismatches, {count_gap} row-count gap")
    for e in examples:
        print(e)

    if mismatches or count_gap:
        print("::error::Principle X — fiscal implementations diverge across languages")
        return 1
    print("fiscal parity: PASS — JS and Python agree on every fiscal result")
    return 0


if __name__ == "__main__":
    sys.exit(main())
