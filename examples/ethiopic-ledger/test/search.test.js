// node:test suite for the search helper. Per Principle I / FR-010 (and FR-011 of
// feature 004) this asserts ONLY membership-free properties — span fidelity, raw-text
// immutability, and the guard paths. It NEVER asserts that two distinct homophone
// characters match: that is class membership, owned by feature 004's folding fixture.
import { test } from "node:test";
import assert from "node:assert/strict";

import { Language, FoldScheme, EquivalenceError } from "../lib/index.js";
import { findSpans, matches } from "../src/search.js";

const A = { language: Language.AMHARIC, scheme: FoldScheme.HSL, acknowledgeLossy: false };

test("a span selects exactly the matched substring in the raw text", () => {
  const desc = "hello world";
  const spans = findSpans(desc, "world", A);
  assert.equal(spans.length, 1);
  const [s, e] = spans[0];
  assert.equal(Array.from(desc).slice(s, e).join(""), "world");
});

test("all matches are returned, not just the first", () => {
  const spans = findSpans("a b a b a", "a", A);
  assert.equal(spans.length, 3);
});

test("searching does not mutate the description; empty query yields no spans", () => {
  const desc = "immutable source";
  const copy = `${desc}`;
  findSpans(desc, "source", A);
  assert.equal(desc, copy);
  assert.deepEqual(findSpans(desc, "", A), []);
});

test("Ge'ez uses exact (unfolded) matching and never folds", () => {
  const desc = "exact match";
  assert.deepEqual(findSpans(desc, "match", { language: Language.GE_EZ, scheme: FoldScheme.HSL }), [[6, 11]]);
});

test("Tigrinya folding is blocked without acknowledgement, allowed with it", () => {
  assert.throws(
    () => findSpans("desc", "de", { language: Language.TIGRINYA, scheme: FoldScheme.HSL, acknowledgeLossy: false }),
    (err) => err instanceof EquivalenceError && err.reason === "tigrinya_requires_ack",
  );
  assert.doesNotThrow(() =>
    findSpans("desc", "de", { language: Language.TIGRINYA, scheme: FoldScheme.HSL, acknowledgeLossy: true }),
  );
});

test("matches() agrees with findSpans() presence", () => {
  assert.equal(matches("find me", "me", A), true);
  assert.equal(matches("find me", "zzz", A), false);
});
