// node:test suite for the calendar demo's pure helpers. Per Principle I this asserts
// wiring and structural invariants only — never a hand-authored calendar value.
import { test } from "node:test";
import assert from "node:assert/strict";

import { EthiopianDate, gregorianToJdn, toGeez } from "../lib/index.js";
import {
  MONTHS,
  WEEKDAYS,
  num,
  monthGrid,
  shiftMonth,
  holidaysFor,
  holidayIndex,
  julianToJdn,
  orthodoxEasterJulian,
  dayFacts,
  parseIsoDate,
  isoGregorian,
} from "../src/model.js";

test("name tables cover 13 months and 7 weekdays", () => {
  assert.equal(MONTHS.length, 13);
  assert.equal(WEEKDAYS.length, 7);
});

test("num() uses the Ge'ez primitive and never passes it 0 or a negative", () => {
  assert.equal(num(42, "geez"), toGeez(42));
  assert.equal(num(42, "arabic"), "42");
  assert.equal(num(0, "geez"), "0");
  assert.equal(num(-3, "geez"), "-3");
});

for (const [y, m] of [[2016, 1], [2016, 13], [2015, 13], [2019, 7]]) {
  test(`monthGrid(${y}, ${m}) is Monday-first, contiguous, and holds every day once`, () => {
    const weeks = monthGrid(y, m);
    const cells = weeks.flat();
    assert.equal(cells.length % 7, 0);
    assert.equal(cells[0].date.weekday(), 0);
    for (let i = 1; i < cells.length; i++) {
      assert.equal(cells[i - 1].date.daysUntil(cells[i].date), 1);
    }
    const inside = cells.filter((c) => !c.outside);
    assert.equal(inside.length, EthiopianDate.daysInMonth(y, m));
    assert.deepEqual(inside.map((c) => c.date.day), inside.map((_, i) => i + 1));
    for (const c of cells) assert.deepEqual(c.greg, c.date.toGregorian());
  });
}

test("shiftMonth steps through Pagumē into the next year", () => {
  assert.deepEqual(shiftMonth(2016, 12, 1), { year: 2016, month: 13 });
  assert.deepEqual(shiftMonth(2016, 13, 1), { year: 2017, month: 1 });
  assert.deepEqual(shiftMonth(2017, 1, -1), { year: 2016, month: 13 });
});

test("julianToJdn agrees with gregorianToJdn where the calendars coincide (3rd century)", () => {
  // In 200–300 CE the Julian and Gregorian calendars name the same day identically.
  assert.equal(julianToJdn(250, 6, 15), gregorianToJdn(250, 6, 15));
});

test("Orthodox Easter is always a Sunday between Julian 22 March and 25 April", () => {
  for (let y = 1990; y <= 2100; y++) {
    const e = orthodoxEasterJulian(y);
    const jdn = julianToJdn(e.year, e.month, e.day);
    assert.equal(EthiopianDate.fromJdn(jdn).weekday(), 6, `year ${y}`);
    assert.ok(jdn >= julianToJdn(y, 3, 22) && jdn <= julianToJdn(y, 4, 25), `year ${y}`);
  }
});

test("holidaysFor stays inside its year, is sorted, and keeps Easter's offsets", () => {
  for (let y = 1990; y <= 2060; y++) {
    const hs = holidaysFor(y);
    for (const h of hs) assert.equal(h.date.year, y);
    for (let i = 1; i < hs.length; i++) assert.ok(hs[i - 1].date.toJdn() <= hs[i].date.toJdn());
    const fasika = hs.find((h) => h.en.startsWith("Fasika"));
    const siklet = hs.find((h) => h.en.startsWith("Siklet"));
    const hosanna = hs.find((h) => h.en.startsWith("Hosanna"));
    assert.equal(siklet.date.daysUntil(fasika.date), 2);
    assert.equal(hosanna.date.daysUntil(fasika.date), 7);
    assert.ok(hs.length >= 12, `year ${y} has ${hs.length}`);
  }
});

test("holidayIndex keys every holiday by its JDN", () => {
  const idx = holidayIndex([2016, 2017]);
  for (const h of [...holidaysFor(2016), ...holidaysFor(2017)]) {
    assert.ok(idx.get(h.date.toJdn()).includes(h) || idx.get(h.date.toJdn()).some((x) => x.en === h.en));
  }
});

test("dayFacts is wired to the primitives", () => {
  const d = new EthiopianDate(2015, 13, 6);
  const f = dayFacts(d, d.addDays(-10));
  assert.equal(f.leap, d.isLeapYear());
  assert.equal(f.dayOfYear, f.daysInYear);
  assert.equal(f.weekday, d.weekday());
  assert.equal(f.fromToday, 10);
  assert.equal(f.fiscal.period, 13);
});

test("ISO date parsing round-trips without Date/timezone", () => {
  const g = parseIsoDate("2026-10-01");
  assert.deepEqual(g, { year: 2026, month: 10, day: 1 });
  assert.equal(isoGregorian(g), "2026-10-01");
  assert.equal(parseIsoDate("nope"), null);
});
