// Structural checks of the generated readings module (src/readings.js). Per Principle I
// this asserts wiring and invariants only — never a hand-authored reading.
import { test } from "node:test";
import assert from "node:assert/strict";

import { readingsFor, formatReference, READINGS_MONTHS } from "../src/readings.js";

const SERVICES = new Set(["ነግህ", "ቅዳሴ"]);

test("every transcribed day has a Kidase Gospel and well-formed readings", () => {
  assert.ok(READINGS_MONTHS.length > 0);
  for (const month of READINGS_MONTHS) {
    for (let day = 1; day <= 30; day++) {
      const r = readingsFor({ month, day });
      if (!r) continue;
      const all = [...r.morning, ...r.kidase];
      assert.ok(r.kidase.some((x) => x.kind[1] === "Gospel"), `${month}/${day}: no Kidase Gospel`);
      for (const x of all) {
        assert.ok(SERVICES.has(x.service));
        assert.ok(x.book === null || (x.book.am && x.book.en), `${month}/${day}: book names`);
        if (!x.check) assert.ok(Number.isInteger(x.chapter) && Number.isInteger(x.verse), `${month}/${day}: unchecked rows have numbers`);
        assert.equal(typeof formatReference(x, "en"), "string");
      }
    }
  }
});

test("cross-references resolve to a psalm", () => {
  let seen = 0;
  for (const month of READINGS_MONTHS) {
    for (let day = 1; day <= 30; day++) {
      const r = readingsFor({ month, day });
      for (const x of r ? [...r.morning, ...r.kidase] : []) {
        if (!x.crossRef || !x.book) continue;
        seen++;
        assert.equal(x.book.key, "PSA");
      }
    }
  }
  assert.ok(seen > 0);
});

test("months without data give null", () => {
  for (let month = 1; month <= 13; month++) {
    if (READINGS_MONTHS.includes(month)) continue;
    assert.equal(readingsFor({ month, day: 1 }), null);
  }
});
