// node:test suite for display formatting. Per Principle I / FR-010 this asserts ONLY
// "render == primitive(input)" self-consistency and the Principle VII rules — never a
// hand-authored numeral value.
import { test } from "node:test";
import assert from "node:assert/strict";

import { toGeez, formatMoney } from "../lib/index.js";
import { renderCount, renderYear, renderMoney } from "../src/format.js";

test("Ge'ez mode renders counts/years via the primitive; Arabic mode is plain", () => {
  assert.equal(renderCount(5, "geez"), toGeez(5));
  assert.equal(renderYear(2016, "geez"), toGeez(2016));
  assert.equal(renderCount(7, "arabic"), "7");
  assert.equal(renderYear(2016, "arabic"), "2016");
});

test("a zero count stays Arabic '0' and never calls the numeral renderer with 0 (Principle VII)", () => {
  // If renderCount called toGeez(0) it would throw; it must not.
  assert.equal(renderCount(0, "geez"), "0");
  assert.equal(renderYear(0, "geez"), "0");
});

test("money is Arabic by default and matches the primitive (Principle VII)", () => {
  assert.equal(renderMoney(1234.5), formatMoney(1234.5));
});
