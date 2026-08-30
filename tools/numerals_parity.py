#!/usr/bin/env python3
"""Cross-language numeral parity (Constitution Principle X), pre-fixture.

Until an authored `tests/vectors/numerals.json` exists, this demonstrates that
the TypeScript and Python numeral implementations agree, by generating a set of
integers and comparing `n,to_geez(n),from_geez(to_geez(n))` from each language
line by line. It asserts only "JS == PY" — never a hand-authored numeral value
(Principle I). The round-trip column also proves each language's bijection.

The value set enumerates the interior-zero / two-group hotspots from research R1
& analysis U1, plus a fixed-stride dense sample. `--exhaustive` sweeps the whole
1–99,999,999 domain in each language (the Principle IX release sweep).

Run from repo root:  python tools/numerals_parity.py --from 1 --to 100000
                     python tools/numerals_parity.py --exhaustive
"""
import argparse
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python" / "src"))

from ethiopic_primitives import from_geez, to_geez  # noqa: E402

GEEZ_MAX = 99_999_999
STRIDE = 111  # documented dense stride; matches the test suites' sampleValues


def iter_values(lo: int, hi: int, stride: int, exhaustive: bool):
    """Yield the values to compare. Exhaustive mode streams the whole domain
    lazily (never materialized) so it runs in bounded memory."""
    if exhaustive:
        yield from range(1, GEEZ_MAX + 1)
        return
    s: set[int] = set()
    # Boundary + carry hotspots (research R1 / analysis U1).
    for b in (1, 9, 10, 11, 99, 100, 101, 999, 1000, 9999, GEEZ_MAX):
        s.add(b)
    for p in range(1, 8):
        s.add(10 ** p)
    s.update({10000, 10001, 10100, 20000, 100000, 1000000, 1000001, 10000000})
    # …99 → …00 transitions across the low group, within the [lo, hi] window.
    for k in (100, 1000, 10000):
        start = max(k, (lo // k) * k)
        for base in range(start, min(hi, GEEZ_MAX) + 1, k):
            s.add(base - 1)
            s.add(base)
    s.update(range(lo, hi + 1, stride))
    yield from sorted(n for n in s if 1 <= n <= GEEZ_MAX)


def _chunks(iterable, size: int):
    """Yield lists of up to `size` items from `iterable` (bounded memory)."""
    batch: list[int] = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


CHUNK = 50_000  # bounds memory and stdin size per Node invocation


def python_rows(values: list[int]) -> list[str]:
    return [f"{n},{to_geez(n)},{from_geez(to_geez(n))}" for n in values]


def js_rows(values: list[int]) -> list[str]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not found on PATH")
    stdin = "\n".join(str(n) for n in values) + "\n"
    proc = subprocess.run(
        [node, "--experimental-strip-types", "javascript/test/numerals_dump.ts"],
        cwd=ROOT, input=stdin, capture_output=True, text=True,
        encoding="utf-8",  # Ge'ez glyphs — do not fall back to the Windows ANSI codepage
    )
    if proc.returncode != 0:
        raise RuntimeError(f"JS dump failed:\n{proc.stdout}\n{proc.stderr}")
    return [ln for ln in proc.stdout.replace("\r\n", "\n").split("\n") if ln]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="lo", type=int, default=1)
    ap.add_argument("--to", dest="hi", type=int, default=100_000)
    ap.add_argument("--stride", type=int, default=STRIDE)
    ap.add_argument("--exhaustive", action="store_true", help="sweep the full 1–99,999,999 domain")
    a = ap.parse_args()

    compared = 0
    mismatches = 0
    count_gap = 0
    examples: list[str] = []
    for batch in _chunks(iter_values(a.lo, a.hi, a.stride, a.exhaustive), CHUNK):
        py = python_rows(batch)
        js = js_rows(batch)
        count_gap += abs(len(py) - len(js))
        for i in range(min(len(py), len(js))):
            compared += 1
            if py[i] != js[i]:
                mismatches += 1
                if len(examples) < 5:
                    examples.append(f"  n={batch[i]}: PY={py[i]}  JS={js[i]}")

    label = "exhaustive" if a.exhaustive else f"{a.lo}-{a.hi}"
    print(f"numeral parity {label}: {compared} values compared, {mismatches} mismatches, {count_gap} row-count gap")
    for e in examples:
        print(e)

    if mismatches or count_gap:
        print("::error::Principle X — numeral implementations diverge across languages")
        return 1
    print("numeral parity: PASS — JS and Python agree on every numeral result (both directions)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
