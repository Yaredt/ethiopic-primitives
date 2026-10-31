// Structural checks of the generated verse text (data/passages/NN.json). Per Principle I
// this asserts wiring and invariants only — never a hand-authored verse.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { readingsFor, passageKey, READINGS_MONTHS } from "../src/readings.js";

const file = (m) => new URL(`../data/passages/${String(m).padStart(2, "0")}.json`, import.meta.url);

test("every month with readings has a verse file with its notices", () => {
  for (const m of READINGS_MONTHS) {
    assert.ok(existsSync(file(m)), `month ${m}: no verse file`);
    const doc = JSON.parse(readFileSync(file(m), "utf8"));
    assert.equal(doc.month, m);
    assert.ok(doc.notice.am.includes("Bible Society of Ethiopia"), "the Amharic text's copyright notice is shown");
    assert.ok(doc.notice.en.length > 0);
  }
});

test("every reading with a reference has verse text in both languages", () => {
  let n = 0;
  for (const m of READINGS_MONTHS) {
    const { passages } = JSON.parse(readFileSync(file(m), "utf8"));
    for (let day = 1; day <= 30; day++) {
      const r = readingsFor({ month: m, day });
      if (!r) continue;
      for (const x of [...r.morning, ...r.kidase]) {
        const key = passageKey(x);
        if (!key) continue;
        const verses = passages[key];
        assert.ok(Array.isArray(verses) && verses.length > 0, `${m}/${day} ${key}: no verses`);
        assert.equal(verses[0][0], x.chapter, `${key}: starts at its chapter`);
        assert.equal(verses[0][1], x.verse, `${key}: starts at its verse`);
        assert.ok(verses[0][2] && verses[0][3], `${key}: first verse has Amharic and English text`);
        for (const v of verses) assert.equal(v.length, 4);
        n++;
      }
    }
  }
  assert.ok(n > 0);
});
