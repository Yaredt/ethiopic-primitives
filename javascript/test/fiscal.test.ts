/**
 * node:test suite for fiscal logic. Per Constitution Principle I this asserts
 * ONLY self-consistency, structural invariants, and error contracts — never a
 * hand-authored fiscal value. In particular it does NOT assert where Hamle 1 or
 * Sene 30 fall (that is a fiscal boundary the external fixture must author); it
 * asserts only that the boundary is sharp and the labels are contiguous.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EthiopianDate,
  fiscalYearFor,
  fiscalYearBounds,
  fiscalQuarter,
  fiscalPeriod,
  agingBucket,
} from "../src/index.ts";

test("fiscal_year_bounds round-trips: every date in bounds re-labels to the same FY", () => {
  for (let fy = 1996; fy <= 2020; fy++) {
    const { start, end } = fiscalYearBounds(fy);
    // The label is stable across the whole span (checked at both ends).
    assert.equal(fiscalYearFor(start), fy);
    assert.equal(fiscalYearFor(end), fy);
    // The span is exactly one fiscal year wide: the day before start and the day
    // after end belong to the adjacent fiscal years. Sharp boundary, no value asserted.
    assert.equal(fiscalYearFor(start.addDays(-1)), fy - 1);
    assert.equal(fiscalYearFor(end.addDays(1)), fy + 1);
  }
});

test("fiscal year label is stable within a fiscal year (sampled span)", () => {
  const { start, end } = fiscalYearBounds(2015);
  for (let jdn = start.toJdn(); jdn <= end.toJdn(); jdn++) {
    assert.equal(fiscalYearFor(EthiopianDate.fromJdn(jdn)), 2015);
  }
});

test("every date maps to exactly one quarter (1-4) and one period (1-13)", () => {
  for (let em = 1; em <= 13; em++) {
    const len = EthiopianDate.daysInMonth(2011, em);
    for (let ed = 1; ed <= len; ed++) {
      const d = new EthiopianDate(2011, em, ed);
      const q = fiscalQuarter(d);
      const p = fiscalPeriod(d);
      assert.ok(q >= 1 && q <= 4, `quarter out of range: ${q}`);
      assert.ok(p >= 1 && p <= 13, `period out of range: ${p}`);
    }
  }
});

test("Pagumē's period is distinct from every 30-day month's period (Principle VI)", () => {
  const pagume = fiscalPeriod(new EthiopianDate(2011, 13, 1));
  const regular = new Set<number>();
  for (let em = 1; em <= 12; em++) regular.add(fiscalPeriod(new EthiopianDate(2011, em, 1)));
  assert.ok(!regular.has(pagume), "Pagumē must not share a period with a 30-day month");
});

test("aging days equal the calendar core's day difference", () => {
  const inv = new EthiopianDate(2012, 12, 25);
  const asof = new EthiopianDate(2013, 1, 15); // crosses Pagumē
  const a = agingBucket(inv, asof);
  assert.equal(a.days, inv.daysUntil(asof));
});

test("aging bucket index is monotonic in elapsed time", () => {
  const inv = new EthiopianDate(2012, 1, 1);
  let prev = -1;
  for (const n of [0, 10, 30, 31, 60, 61, 90, 91, 200]) {
    const a = agingBucket(inv, inv.addDays(n));
    assert.ok(a.bucketIndex >= prev, "bucket index must not decrease as age grows");
    prev = a.bucketIndex;
  }
});

test("aging raises when as-of precedes invoice", () => {
  const inv = new EthiopianDate(2012, 5, 10);
  assert.throws(() => agingBucket(inv, inv.addDays(-1)), RangeError);
});

test("custom aging thresholds are respected (arithmetic contract)", () => {
  const inv = new EthiopianDate(2012, 1, 1);
  const a = agingBucket(inv, inv.addDays(45), [15, 45, 75]);
  // 45 <= 45 -> second bucket (index 1). Pure threshold arithmetic, not a fiscal value.
  assert.equal(a.bucketIndex, 1);
});
