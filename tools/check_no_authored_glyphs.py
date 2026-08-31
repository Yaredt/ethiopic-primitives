#!/usr/bin/env python3
"""SC-007 guard (Constitution Principle I).

Fails if any raw Ethiopic character (U+1200–U+137F — fidäl and Ge'ez numerals)
appears in the equivalence test files. Tests may exercise Ge'ez strings, but must
construct them from code points (`String.fromCodePoint` / `chr`) — never embed raw
glyph literals, which could smuggle a hand-authored equivalence-class membership or
folded value into an assertion. Class membership lives only in the external
tests/vectors/folding.json.

Run from repo root:  python tools/check_no_authored_glyphs.py
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

TEST_FILES = [
    ROOT / "javascript" / "test" / "equivalence.test.ts",
    ROOT / "python" / "tests" / "test_equivalence.py",
]

LO, HI = 0x1200, 0x137F  # Ethiopic block: fidäl + numerals


def main() -> int:
    offenders: list[str] = []
    for path in TEST_FILES:
        if not path.exists():
            print(f"::error::SC-007 guard — expected test file missing: {path}")
            return 1
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            hits = {ch for ch in line if LO <= ord(ch) <= HI}
            if hits:
                cps = ", ".join(f"U+{ord(ch):04X}" for ch in sorted(hits))
                offenders.append(f"{path.relative_to(ROOT)}:{lineno} contains {cps}")

    if offenders:
        print("::error::SC-007 — equivalence test files must not contain authored Ethiopic glyph literals")
        for o in offenders:
            print(f"   {o}")
        return 1
    print("SC-007 guard: PASS — no authored Ethiopic glyph literals in equivalence tests")
    return 0


if __name__ == "__main__":
    sys.exit(main())
