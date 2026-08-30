#!/usr/bin/env python3
"""SC-006 guard (Constitution Principle I).

Fails if any raw Ge'ez numeral glyph (U+1369–U+137C) appears in the numeral test
files. Tests may exercise Ge'ez strings, but must construct them from code points
or from the functions under test — never embed authored glyph literals that could
smuggle a hand-authored numeral value into an assertion. Conformance values live
only in the external tests/vectors/numerals.json.

Run from repo root:  python tools/check_no_authored_numerals.py
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

TEST_FILES = [
    ROOT / "javascript" / "test" / "numerals.test.ts",
    ROOT / "python" / "tests" / "test_numerals.py",
]

LO, HI = 0x1369, 0x137C  # Ethiopic numeral block: units, tens, ፻, ፼


def main() -> int:
    offenders: list[str] = []
    for path in TEST_FILES:
        if not path.exists():
            print(f"::error::SC-006 guard — expected test file missing: {path}")
            return 1
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            hits = {ch for ch in line if LO <= ord(ch) <= HI}
            if hits:
                cps = ", ".join(f"U+{ord(ch):04X}" for ch in sorted(hits))
                offenders.append(f"{path.relative_to(ROOT)}:{lineno} contains {cps}")

    if offenders:
        print("::error::SC-006 — numeral test files must not contain authored Ge'ez glyph literals")
        for o in offenders:
            print(f"   {o}")
        return 1
    print("SC-006 guard: PASS — no authored Ge'ez numeral literals in numeral tests")
    return 0


if __name__ == "__main__":
    sys.exit(main())
