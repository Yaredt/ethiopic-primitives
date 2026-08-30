#!/usr/bin/env python3
"""Cross-language conformance harness (Constitution Principle X).

Both the JavaScript and Python implementations MUST run the SAME vector file and
agree on the gating set; divergence there is a release blocker, not a known issue.
This drives every runner over the one shared fixture and fails on any gating
failure or any disagreement between the two languages on the gating set.

Node is located on PATH; Python uses the interpreter running this script.
Run from the repository root:  python tools/cross_runner.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(label: str, argv: list[str]) -> tuple[int, str]:
    print(f"\n===== {label} =====")
    try:
        proc = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True)
    except FileNotFoundError as ex:
        print(f"  MISSING RUNTIME: {ex}")
        return 127, ""
    out = (proc.stdout or "") + (proc.stderr or "")
    print(out.rstrip())
    return proc.returncode, out


def main() -> int:
    node = shutil.which("node")
    py = sys.executable
    if node is None:
        print("::error::node not found on PATH — cannot run the JS runner")
        return 127

    jobs = [
        ("Principle II — provenance", [py, "tools/check_provenance.py"]),
        ("Reference sweep (oracle)", [py, "tools/full_sweep.py", "--from", "1990", "--to", "2035"]),
        ("JS conformance vectors", [node, "--experimental-strip-types", "javascript/test/run_vectors.ts"]),
        ("JS Principle IX sweep", [node, "--experimental-strip-types", "javascript/test/run_sweep.ts", "--from", "1990", "--to", "2035"]),
        ("PY conformance vectors", [py, "python/tests/run_vectors.py"]),
        ("PY Principle IX sweep", [py, "python/tests/run_sweep.py", "--from", "1990", "--to", "2035"]),
        # Feature 002 — fiscal logic. Vector runners SKIP (exit 0) until an authored
        # tests/vectors/fiscal.json exists; the parity sweep proves JS==PY now.
        ("Fiscal cross-language parity", [py, "tools/fiscal_parity.py", "--from", "1990", "--to", "2010"]),
        ("JS fiscal vectors", [node, "--experimental-strip-types", "javascript/test/run_fiscal_vectors.ts"]),
        ("PY fiscal vectors", [py, "python/tests/run_fiscal_vectors.py"]),
        # Feature 003 — Ge'ez numerals. Vector runners SKIP (exit 0) until an authored
        # tests/vectors/numerals.json exists; the parity sweep proves JS==PY now.
        ("SC-006 no-authored-numerals guard", [py, "tools/check_no_authored_numerals.py"]),
        ("Numeral cross-language parity", [py, "tools/numerals_parity.py", "--from", "1", "--to", "100000"]),
        ("JS numeral vectors", [node, "--experimental-strip-types", "javascript/test/run_numerals_vectors.ts"]),
        ("PY numeral vectors", [py, "python/tests/run_numerals_vectors.py"]),
    ]

    results: dict[str, int] = {}
    for label, argv in jobs:
        code, _ = run(label, argv)
        results[label] = code

    # Cross-language agreement on the gating set: both vector runners must pass.
    js_ok = results["JS conformance vectors"] == 0
    py_ok = results["PY conformance vectors"] == 0
    agree = js_ok == py_ok

    print("\n===== SUMMARY =====")
    for label, code in results.items():
        print(f"  {'PASS' if code == 0 else 'FAIL'}  {label}")
    print(f"  {'AGREE' if agree else 'DIVERGE'} cross-language gating set (JS ok={js_ok}, PY ok={py_ok})")

    failed = any(code != 0 for code in results.values())
    if failed or not agree:
        print("\n::error::cross-runner failed — see individual runners above")
        return 1
    print("\nCross-runner: PASS — both languages agree on the gating set")
    return 0


if __name__ == "__main__":
    sys.exit(main())
