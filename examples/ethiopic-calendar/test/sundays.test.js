// Structural checks of the Sunday readings (SUNDAYS + sundayReadingsFor in src/readings.js,
// verse text in data/passages/su.json). Per Principle I these assert wiring and
// invariants only — never which reading a given Sunday has.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { EthiopianDate } from "../lib/index.js";
import { holidaysFor } from "../src/model.js";
import { sundayReadingsFor, passageKey } from "../src/readings.js";

const SUNDAY = 6; // EthiopianDate#weekday(): Monday = 0
const su = JSON.parse(readFileSync(new URL("../data/passages/su.json", import.meta.url), "utf8"));

function sundays(year) {
  const out = [];
  const last = new EthiopianDate(year, 13, EthiopianDate.daysInMonth(year, 13)).toJdn();
  for (let d = new EthiopianDate(year, 1, 1); d.toJdn() <= last; d = d.addDays(1)) if (d.weekday() === SUNDAY) out.push(d);
  return out;
}
const fasikaOf = (year) => holidaysFor(year).find((h) => h.en.startsWith("Fasika")).date;

test("most Sundays get readings, and every result is well formed", () => {
  for (const year of [2017, 2018, 2019, 2020, 2021]) {
    const list = sundays(year);
    let found = 0;
    for (const d of list) {
      const r = sundayReadingsFor(d, fasikaOf(year));
      if (!r) continue;
      if (r.missing) { assert.equal(typeof r.missing, "string"); continue; }
      found++;
      assert.ok(r.entry && r.heading !== undefined, `${year}/${d.month}/${d.day}: entry`);
      assert.ok(r.morning.length + r.kidase.length > 0, `${year}/${d.month}/${d.day}: readings`);
    }
    assert.ok(found >= list.length - 6, `${year}: only ${found} of ${list.length} Sundays have readings`);
  }
});

test("Fasika itself gets the Easter readings, with a Gospel", () => {
  for (const year of [2018, 2019, 2020]) {
    const r = sundayReadingsFor(fasikaOf(year), fasikaOf(year));
    assert.ok(r && r.rule === "fasika");
    assert.ok([...r.morning, ...r.kidase].some((x) => x.kind[1] === "Gospel"));
  }
});

test("every resolvable Sunday reading has verse text in su.json", () => {
  for (const year of [2018, 2019, 2020]) {
    for (const d of sundays(year)) {
      const r = sundayReadingsFor(d, fasikaOf(year));
      if (!r || r.missing) continue;
      for (const x of [...r.morning, ...r.kidase]) {
        const key = passageKey(x);
        if (key) assert.ok(su.passages[key]?.length, `${key}: no verse text`);
      }
    }
  }
});

test("movable-feast readings land on their days from Fasika (Ascension has a Gospel)", async () => {
  const { movableReadingsFor } = await import("../src/readings.js");
  for (const year of [2018, 2019, 2020]) {
    const fasika = fasikaOf(year);
    const ascension = movableReadingsFor(fasika.addDays(39), fasika);
    assert.ok(ascension && [...ascension.morning, ...ascension.kidase].some((x) => x.kind[1] === "Gospel"));
    assert.equal(movableReadingsFor(fasika.addDays(1), fasika), null);
    let n = 0;
    for (let k = -80; k <= 60; k++) if (movableReadingsFor(fasika.addDays(k), fasika)) n++;
    assert.equal(n, 11, `${year}: 11 movable days`);
    for (let k = -80; k <= 60; k++) {
      const r = movableReadingsFor(fasika.addDays(k), fasika);
      if (!r) continue;
      for (const x of [...r.morning, ...r.kidase]) {
        const key = passageKey(x);
        if (key) assert.ok(su.passages[key]?.length, `${key}: no verse text`);
      }
    }
  }
});
