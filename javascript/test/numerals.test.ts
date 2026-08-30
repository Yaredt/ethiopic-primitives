/**
 * node:test suite for Ge'ez numerals. Per Constitution Principle I this asserts
 * ONLY error contracts, round-trip self-consistency, and structural invariants —
 * never a hand-authored numeral value. To keep that guarantee machine-checkable
 * (SC-006), this file contains NO raw Ethiopic glyphs: any Ge'ez string it needs
 * is built from code points (U+1369–U+137C) or from the functions under test.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { toGeez, fromGeez, formatMoney, GeezNumeralError, GEEZ_MAX } from "../src/index.ts";

// Inventory of numeral code points, constructed (not literal) so this test file
// stays glyph-free for the SC-006 scanner.
const INVENTORY = new Set<string>();
for (let cp = 0x1369; cp <= 0x137c; cp++) INVENTORY.add(String.fromCodePoint(cp));
const U1 = String.fromCodePoint(0x1369); // units "one"
const HUNDRED = String.fromCodePoint(0x137b); // the hundred separator

/** Boundary + carry hotspots (research R1 / analysis U1) plus a fixed stride. */
function sampleValues(): number[] {
  const s = new Set<number>();
  for (const b of [1, 9, 10, 11, 99, 100, 101, 999, 1000, 9999, GEEZ_MAX]) s.add(b);
  for (let p = 1; p <= 7; p++) s.add(10 ** p); // powers of ten
  for (const iz of [10000, 10001, 10100, 20000, 100000, 1000000, 1000001, 10000000]) s.add(iz);
  for (let n = 1; n <= 100000; n += 111) s.add(n); // dense stride (matches numerals_parity)
  return [...s].filter((n) => n >= 1 && n <= GEEZ_MAX);
}

test("render rejects the closed-domain violations (Principle VII)", () => {
  const cases: Array<[number, string]> = [
    [0, "zero"],
    [-5, "negative"],
    [3.5, "non_integer"],
    [GEEZ_MAX + 1, "out_of_range"],
  ];
  for (const [input, reason] of cases) {
    assert.throws(
      () => toGeez(input),
      (e: unknown) => e instanceof GeezNumeralError && e.reason === reason,
      `toGeez(${input}) should throw ${reason}`,
    );
  }
});

test("render output is non-empty and uses only inventory glyphs", () => {
  for (const n of sampleValues()) {
    const g = toGeez(n);
    assert.ok(g.length > 0, `empty render for ${n}`);
    for (const ch of g) assert.ok(INVENTORY.has(ch), `non-inventory char in render of ${n}`);
  }
});

test("round-trip is a strict bijection: fromGeez(toGeez(n)) === n", () => {
  for (const n of sampleValues()) {
    assert.equal(fromGeez(toGeez(n)), n, `round-trip failed at ${n}`);
  }
});

test("parse rejects malformed input with the right reason", () => {
  assert.throws(() => fromGeez(""), (e: unknown) => e instanceof GeezNumeralError && e.reason === "empty");
  assert.throws(() => fromGeez("   "), (e: unknown) => e instanceof GeezNumeralError && e.reason === "empty");
  assert.throws(() => fromGeez("A1"), (e: unknown) => e instanceof GeezNumeralError && e.reason === "invalid_char");
  // Non-canonical: 100 spelled "one" + hundred, instead of the canonical bare hundred.
  const nonCanonical = U1 + HUNDRED;
  assert.throws(
    () => fromGeez(nonCanonical),
    (e: unknown) => e instanceof GeezNumeralError && e.reason === "non_canonical",
    "non-canonical spelling must be rejected",
  );
});

test("money defaults to Arabic; geez mode renders only the whole part", () => {
  // Compared against the functions' own output — no authored glyph literals.
  assert.equal(formatMoney(1234.5), "1234.50");
  assert.equal(formatMoney(1234.5, { numerals: "geez" }), toGeez(1234) + ".50");
  assert.equal(formatMoney(0.5, { numerals: "geez" }), "0.50"); // whole part 0 stays Arabic
  assert.equal(formatMoney(-5), "-5.00");
  assert.equal(formatMoney(-5, { numerals: "geez" }), "-" + toGeez(5) + ".00");
});

test("money rounds ROUND_HALF_UP identically to the Python implementation", () => {
  // Expected values are shared verbatim with python/tests/test_numerals.py so the
  // two languages must agree byte-for-byte (Principle X). These are Arabic money
  // strings, not Ge'ez numeral values, so asserting them does not violate Principle I.
  const cases: Array<[number, number, string]> = [
    [2.675, 2, "2.68"],
    [1.005, 2, "1.01"],
    [0.125, 2, "0.13"],
    [0.005, 2, "0.01"],
    [10.995, 2, "11.00"],
    [-2.675, 2, "-2.68"],
    [1234.5, 2, "1234.50"],
    [2.5, 0, "3"],
  ];
  for (const [amount, fractionDigits, expected] of cases) {
    assert.equal(formatMoney(amount, { fractionDigits }), expected, `formatMoney(${amount}, {fractionDigits:${fractionDigits}})`);
  }
});

test("an amount that rounds to zero is never negative (no \"-0.00\")", () => {
  assert.equal(formatMoney(-0.001), "0.00");
  assert.equal(formatMoney(-0.004, { numerals: "geez" }), "0.00");
  assert.equal(formatMoney(-2.675), "-2.68"); // a non-zero negative keeps its sign
});

test("invalid fractionDigits raises a typed error (not a native one)", () => {
  assert.throws(
    () => formatMoney(10, { fractionDigits: -1 }),
    (e: unknown) => e instanceof GeezNumeralError && e.reason === "out_of_range",
  );
  assert.throws(
    () => formatMoney(10, { fractionDigits: 101 }),
    (e: unknown) => e instanceof GeezNumeralError && e.reason === "out_of_range",
  );
  assert.throws(
    () => formatMoney(10, { fractionDigits: 1.5 }),
    (e: unknown) => e instanceof GeezNumeralError && e.reason === "non_integer",
  );
});

test("money rejects an unknown numerals option and never renders zero in Ge'ez", () => {
  assert.throws(
    // @ts-expect-error deliberately invalid option
    () => formatMoney(10, { numerals: "roman" }),
    (e: unknown) => e instanceof GeezNumeralError && e.reason === "invalid_char",
  );
  // A whole part of 0 must not reach toGeez (which would throw "zero").
  assert.doesNotThrow(() => formatMoney(0, { numerals: "geez" }));
  assert.equal(formatMoney(0, { numerals: "geez" }), "0.00");
});
