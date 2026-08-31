#!/usr/bin/env python3
"""Cross-language equivalence parity (Constitution Principle X), pre-fixture.

Until an authored `tests/vectors/folding.json` exists, this demonstrates that the
TypeScript and Python equivalence implementations agree, by generating a set of
inputs and comparing a fixed case matrix (fold across languages/schemes, the
GE_EZ and unacknowledged/acknowledged TIGRINYA paths, non-lossy equal, foldedEqual,
and offsets) row-by-row. It asserts only "JS == PY" — never a hand-authored class
membership or folded value (Principle I). The case matrix stays in lock-step with
javascript/test/equivalence_dump.ts.

Run from repo root:  python tools/equivalence_parity.py
"""
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python" / "src"))

from ethiopic_primitives import (  # noqa: E402
    EquivalenceError,
    FoldScheme,
    Language,
    equal,
    fold,
    folded_equal,
)


def _tok(fn) -> str:
    try:
        return fn()
    except EquivalenceError as e:
        return f"E:{e.reason}"


def _row(t: str) -> str:
    return "|".join([
        _tok(lambda: f"F:{fold(t, Language.AMHARIC, FoldScheme.H_ONLY).folded}"),
        _tok(lambda: f"F:{fold(t, Language.AMHARIC, FoldScheme.HSL).folded}"),
        _tok(lambda: f"F:{fold(t, Language.TIGRINYA, FoldScheme.HSL, acknowledge_lossy=True).folded}"),
        _tok(lambda: f"F:{fold(t, Language.GE_EZ, FoldScheme.H_ONLY).folded}"),   # -> E:geez_not_foldable
        _tok(lambda: f"F:{fold(t, Language.TIGRINYA, FoldScheme.HSL).folded}"),   # -> E:tigrinya_requires_ack
        _tok(lambda: f"B:{1 if equal(t, t, Language.AMHARIC) else 0}"),
        _tok(lambda: f"B:{1 if folded_equal(t, t, Language.AMHARIC, FoldScheme.HSL) else 0}"),
        _tok(lambda: "O:" + ",".join(str(o) for o in fold(t, Language.AMHARIC, FoldScheme.H_ONLY).offsets)),
    ])


def inputs() -> list[str]:
    """Deterministic input set built from code points (inputs, not assertions)."""
    out: list[str] = ["", "abc 123 #!", "Addis 2016 — #7"]
    # Homophone family members across a few orders + representatives + a non-family fidäl.
    bases = [0x1200, 0x1210, 0x1280, 0x1230, 0x1220, 0x12A0, 0x12D0, 0x1240]
    for b in bases:
        for o in (0, 1, 3, 6):
            out.append(chr(b + o))
    # Mixed content, incl. a Ge'ez numeral (must pass through unchanged).
    fid = "".join(chr(0x1200 + o) for o in range(7))
    out.append(fid + " x" + chr(0x1369) + " " + "".join(chr(0x1210 + o) for o in range(7)))
    out.append("".join(chr(c) for c in (0x1220, 0x12D0, 0x1280, 0x1230)) + "!!")
    # A pre-folded (representative-only) string — idempotence surface.
    out.append("".join(chr(0x1200 + o) for o in range(7)) + "".join(chr(0x1230 + o) for o in range(7)))
    return out


def js_rows(values: list[str]) -> list[str]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not found on PATH")
    stdin = "\n".join(json.dumps(v) for v in values) + "\n"
    proc = subprocess.run(
        [node, "--experimental-strip-types", "javascript/test/equivalence_dump.ts"],
        cwd=ROOT, input=stdin, capture_output=True, text=True,
        encoding="utf-8",  # fidäl output — do not fall back to the Windows ANSI codepage
    )
    if proc.returncode != 0:
        raise RuntimeError(f"JS dump failed:\n{proc.stdout}\n{proc.stderr}")
    return [ln for ln in proc.stdout.replace("\r\n", "\n").split("\n") if ln]


def main() -> int:
    values = inputs()
    py = [_row(v) for v in values]
    js = js_rows(values)

    mismatches = 0
    examples = []
    if len(py) != len(js):
        print(f"::error::row count differs — PY {len(py)} vs JS {len(js)}")
    for i in range(min(len(py), len(js))):
        if py[i] != js[i]:
            mismatches += 1
            if len(examples) < 5:
                examples.append(f"  input={values[i]!r}: PY={py[i]}  JS={js[i]}")
    count_gap = abs(len(py) - len(js))

    print(f"equivalence parity: {min(len(py), len(js))} inputs compared, {mismatches} mismatches, {count_gap} row-count gap")
    for e in examples:
        print(e)

    if mismatches or count_gap:
        print("::error::Principle X — equivalence implementations diverge across languages")
        return 1
    print("equivalence parity: PASS — JS and Python agree on every case (fold/equal/offsets/errors)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
