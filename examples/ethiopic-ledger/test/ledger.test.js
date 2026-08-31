// node:test suite for the ledger demo's pure helpers. Per Principle I / FR-010 this
// asserts ONLY wiring, state transitions, error surfacing, and "helper == primitive"
// self-consistency — never a hand-authored calendar/fiscal/numeral/folding value.
import { test } from "node:test";
import assert from "node:assert/strict";

import { EthiopianDate, fiscalYearFor, fiscalQuarter, fiscalPeriod, agingBucket } from "../lib/index.js";
import { entryFromEthiopian, entryFromGregorian, fiscalTags, ageEntry, seedEntries, groupByPeriod } from "../src/ledger.js";

test("entryFromEthiopian builds a month-13 (Pagumē) entry", () => {
  const e = entryFromEthiopian(2016, 13, 3, "Pagumē", 800);
  assert.equal(e.date.month, 13);
  assert.equal(e.description, "Pagumē");
});

test("an invalid date surfaces the primitive's error (nothing fabricated)", () => {
  assert.throws(() => entryFromEthiopian(2016, 14, 1, "bad", 0), RangeError);
  assert.throws(() => entryFromGregorian(2016, 13, 40, "bad", 0), RangeError);
});

test("fiscalTags equals the fiscal primitive's outputs for the same date (wiring)", () => {
  const e = entryFromEthiopian(2016, 1, 5, "x", 1);
  const t = fiscalTags(e);
  assert.equal(t.year, fiscalYearFor(e.date));
  assert.equal(t.quarter, fiscalQuarter(e.date));
  assert.equal(t.period, fiscalPeriod(e.date));
});

test("ageEntry days equal the fiscal primitive's aging for the same pair", () => {
  const inv = entryFromEthiopian(2016, 12, 25, "inv", 100); // near year end
  const asOf = new EthiopianDate(2017, 1, 15); // crosses Pagumē
  assert.equal(ageEntry(inv, asOf).days, agingBucket(inv.date, asOf).days);
});

test("seed ledger includes a Pagumē entry; grouping puts each entry under one period", () => {
  const entries = seedEntries();
  assert.ok(entries.some((e) => e.date.month === 13), "seed has a month-13 entry");
  const groups = groupByPeriod(entries);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  assert.equal(total, entries.length, "every entry appears in exactly one period group");
});
