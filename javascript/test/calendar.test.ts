/**
 * node:test suite. Per Constitution Principle I this file asserts ONLY wiring,
 * error handling, type contracts, and self-consistency. It contains no
 * hand-written conversion, fiscal, or numeral expectation — those live solely in
 * the external fixture under tests/vectors/, exercised here by driving the fixture.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { EthiopianDate, Era } from "../src/index.ts";
import { loadVectors } from "./harness.ts";

test("every gating vector round-trips both directions", () => {
  const doc = loadVectors();
  let gatingFailures = 0;
  for (const v of doc.vectors) {
    const [ey, em, ed] = v.ethiopic;
    const [gy, gm, gd] = v.gregorian;
    const e = EthiopianDate.fromGregorian({ year: gy, month: gm, day: gd });
    const g = new EthiopianDate(ey, em, ed).toGregorian();
    const ok =
      e.year === ey && e.month === em && e.day === ed &&
      g.year === gy && g.month === gm && g.day === gd;
    if (v.gating && !ok) gatingFailures++;
  }
  assert.equal(gatingFailures, 0, "gating vectors must all pass");
});

test("round-trip is self-consistent across a JDN span", () => {
  // Self-consistency only: convert and convert back, assert identity. No value
  // in this test was authored by hand.
  const start = EthiopianDate.fromGregorian({ year: 1995, month: 1, day: 1 }).toJdn();
  const end = EthiopianDate.fromGregorian({ year: 2030, month: 12, day: 31 }).toJdn();
  for (let jdn = start; jdn <= end; jdn++) {
    const e = EthiopianDate.fromJdn(jdn);
    assert.equal(e.toJdn(), jdn);
    assert.equal(EthiopianDate.fromGregorian(e.toGregorian()).toJdn(), jdn);
  }
});

test("Pagumē (month 13) is constructible and representable", () => {
  // Contract only: month 13 must be a legal value in the type (Principle VI).
  // We do not assert which years have 6 days — that is fixture territory.
  const d = new EthiopianDate(2003, 13, 1);
  assert.equal(d.month, 13);
  assert.equal(d.toString().split("-")[1], "13");
});

test("constructor rejects out-of-range month and day", () => {
  assert.throws(() => new EthiopianDate(2000, 0, 1), RangeError);
  assert.throws(() => new EthiopianDate(2000, 14, 1), RangeError);
  assert.throws(() => new EthiopianDate(2000, 1, 0), RangeError);
  assert.throws(() => new EthiopianDate(2000, 1, 31), RangeError);
  assert.throws(() => new EthiopianDate(2000.5, 1, 1), RangeError);
});

test("fromJdn and addDays reject non-integers", () => {
  assert.throws(() => EthiopianDate.fromJdn(1.5), RangeError);
  assert.throws(() => new EthiopianDate(2000, 1, 1).addDays(0.5), RangeError);
});

test("instances are immutable; mutators return new objects", () => {
  const a = new EthiopianDate(2000, 1, 1);
  const b = a.addDays(40);
  assert.notEqual(a, b);
  assert.equal(a.day, 1);
  assert.equal(a.toJdn() + 40, b.toJdn());
});

test("addMonths clamps the day into the target month", () => {
  // Self-consistent contract: the result is always a legal date (no throw),
  // and the day never exceeds the target month's length.
  const start = new EthiopianDate(2000, 12, 30); // 30-day month
  const next = start.addMonths(1); // lands in Pagumē (5 or 6 days)
  assert.equal(next.month, 13);
  assert.ok(next.day <= EthiopianDate.daysInMonth(next.year, 13));
});

test("Amete Alem era round-trips to the same instant", () => {
  const m = new EthiopianDate(2000, 1, 1, Era.AmeteMihret);
  const a = m.toEra(Era.AmeteAlem);
  assert.equal(a.year, 7500); // 2000 + 5500, an era offset (not a calendar conversion)
  assert.equal(a.toJdn(), m.toJdn());
  assert.equal(a.toEra(Era.AmeteMihret).toJdn(), m.toJdn());
});
