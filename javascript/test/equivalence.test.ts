/**
 * node:test suite for Ge'ez-script equivalence. Per Constitution Principle I /
 * FR-011 this asserts ONLY membership-free properties — determinism, idempotence,
 * length/offset structure, scheme tagging, and error/acknowledge contracts. It
 * NEVER asserts that two distinct inputs fold equal (or differ): which characters
 * collate is class membership, owned by the external tests/vectors/folding.json.
 *
 * To keep that machine-checkable (SC-007), this file contains NO raw Ethiopic
 * fidäl (U+1200–U+137F): every fidäl input is built from code points.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  fold,
  equal,
  foldedEqual,
  keysEqual,
  Language,
  FoldScheme,
  EquivalenceError,
} from "../src/index.ts";

// Fidäl inputs constructed (not literal). A spread of family members + non-fidäl.
const FID = String.fromCodePoint(0x1210, 0x1280, 0x1230, 0x1220, 0x12a0, 0x12d0); // homophone bases, order 0
const MIXED = FID + " abc-123 " + String.fromCodePoint(0x1369); // + ASCII + a Ge'ez numeral (built, not literal)
const NON_FIDEL = "Addis 2016 — #7"; // no Ethiopic block characters at all

for (const scheme of [FoldScheme.H_ONLY, FoldScheme.HSL] as const) {
  test(`fold is length-preserving 1:1 with a faithful offset map (${scheme})`, () => {
    const input = MIXED;
    const r = fold(input, Language.AMHARIC, scheme);
    const inCps = Array.from(input);
    const outCps = Array.from(r.folded);
    assert.equal(outCps.length, inCps.length, "folded code-point count must equal input");
    assert.equal(r.offsets.length, outCps.length, "offset map length must equal folded length");
    for (let i = 0; i < r.offsets.length; i++) {
      assert.ok(r.offsets[i]! >= 0 && r.offsets[i]! < inCps.length, "every offset maps to a valid source position");
    }
    assert.equal(r.scheme, scheme);
    assert.equal(r.language, Language.AMHARIC);
  });

  test(`fold is deterministic and idempotent (${scheme})`, () => {
    const a = fold(MIXED, Language.AMHARIC, scheme).folded;
    const b = fold(MIXED, Language.AMHARIC, scheme).folded;
    assert.equal(a, b, "same input → same output");
    const twice = fold(a, Language.AMHARIC, scheme).folded;
    assert.equal(twice, a, "folding a folded string is a no-op (idempotent)");
  });

  test(`fold leaves non-fidäl text unchanged with an identity map (${scheme})`, () => {
    const r = fold(NON_FIDEL, Language.AMHARIC, scheme);
    assert.equal(r.folded, NON_FIDEL, "non-fidäl characters pass through unchanged");
    assert.deepEqual(r.offsets, [...NON_FIDEL].map((_, i) => i));
  });

  test(`fold does not mutate its input; empty string is valid (${scheme})`, () => {
    const input = MIXED;
    const copy = `${input}`;
    fold(input, Language.AMHARIC, scheme);
    assert.equal(input, copy, "input reference is unchanged");
    const empty = fold("", Language.AMHARIC, scheme);
    assert.equal(empty.folded, "");
    assert.deepEqual(empty.offsets, []);
    assert.equal(empty.scheme, scheme);
  });
}

test("language is required and validated (no default, no inference)", () => {
  assert.throws(
    () => fold(FID, null as unknown as typeof Language.AMHARIC, FoldScheme.H_ONLY),
    (e: unknown) => e instanceof EquivalenceError && e.reason === "missing_language",
  );
  assert.throws(
    () => fold(FID, "KLINGON" as unknown as typeof Language.AMHARIC, FoldScheme.H_ONLY),
    (e: unknown) => e instanceof EquivalenceError && e.reason === "unknown_language",
  );
});

test("scheme is required and validated (no DEFAULT)", () => {
  assert.throws(
    () => fold(FID, Language.AMHARIC, null as unknown as typeof FoldScheme.H_ONLY),
    (e: unknown) => e instanceof EquivalenceError && e.reason === "missing_scheme",
  );
  assert.throws(
    () => fold(FID, Language.AMHARIC, "SOUNDEX" as unknown as typeof FoldScheme.H_ONLY),
    (e: unknown) => e instanceof EquivalenceError && e.reason === "unknown_scheme",
  );
});

test("Ge'ez never folds, but is valid for a non-lossy compare (Principle IV)", () => {
  assert.throws(
    () => fold(FID, Language.GE_EZ, FoldScheme.H_ONLY),
    (e: unknown) => e instanceof EquivalenceError && e.reason === "geez_not_foldable",
  );
  // equal() is the non-lossy path — valid for Ge'ez, never raises for it.
  assert.equal(equal(FID, FID, Language.GE_EZ), true);
  assert.equal(equal(FID, FID + "x", Language.GE_EZ), false);
});

test("Tigrinya folding requires an explicit lossy acknowledgement (Principle IV)", () => {
  assert.throws(
    () => fold(FID, Language.TIGRINYA, FoldScheme.HSL),
    (e: unknown) => e instanceof EquivalenceError && e.reason === "tigrinya_requires_ack",
  );
  const r = fold(FID, Language.TIGRINYA, FoldScheme.HSL, { acknowledgeLossy: true });
  assert.equal(r.scheme, FoldScheme.HSL);
  assert.equal(r.language, Language.TIGRINYA);
  assert.equal(Array.from(r.folded).length, Array.from(FID).length);
  // Reflexive — no membership claim about which characters collate.
  assert.equal(foldedEqual(FID, FID, Language.TIGRINYA, FoldScheme.HSL, { acknowledgeLossy: true }), true);
});

test("every FoldResult carries its explicit scheme; keys are scheme-safe", () => {
  const h = fold(MIXED, Language.AMHARIC, FoldScheme.H_ONLY);
  const s = fold(MIXED, Language.AMHARIC, FoldScheme.HSL);
  assert.equal(h.scheme, FoldScheme.H_ONLY);
  assert.equal(s.scheme, FoldScheme.HSL);
  assert.equal(keysEqual(h, fold(MIXED, Language.AMHARIC, FoldScheme.H_ONLY)), true); // reflexive within a scheme
  assert.throws(
    () => keysEqual(h, s),
    (e: unknown) => e instanceof EquivalenceError && e.reason === "scheme_mismatch",
  );
});
