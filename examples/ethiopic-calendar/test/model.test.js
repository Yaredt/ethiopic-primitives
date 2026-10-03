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
  GROUPS,
  hijriToJdn,
  islamicToJdn,
  jdnToUmmAlQura,
  monthlyFeast,
  fastsFor,
  fastOn,
  WEEKLY_FAST,
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

// --- fasts -----------------------------------------------------------------

const byKey = (y) => Object.fromEntries(fastsFor(y).map((f) => [f.key, f]));
const feastOf = (y, prefix) => holidaysFor(y).find((h) => h.en.startsWith(prefix)).date;
const MON = 0, WED = 2, FRI = 4, SAT = 5, SUN = 6;

test("fastsFor: six seasonal fasts inside their year, sorted and non-overlapping", () => {
  for (let y = 1990; y <= 2060; y++) {
    const fs = fastsFor(y);
    assert.equal(fs.length, 6, `year ${y}`);
    for (const f of fs) {
      assert.equal(f.start.year, y);
      assert.equal(f.end.year, y);
      assert.equal(f.days, f.start.daysUntil(f.end) + 1);
      assert.ok(f.days >= 1);
    }
    for (let i = 1; i < fs.length; i++) {
      assert.ok(fs[i - 1].end.toJdn() < fs[i].start.toJdn(), `overlap in ${y}`);
    }
  }
});

test("Abiy Tsom: 55 days, Monday through the Saturday before Fasika", () => {
  for (let y = 1990; y <= 2060; y++) {
    const { abiy } = byKey(y);
    assert.equal(abiy.days, 55);
    assert.equal(abiy.start.weekday(), MON);
    assert.equal(abiy.end.weekday(), SAT);
    assert.equal(abiy.end.daysUntil(feastOf(y, "Fasika")), 1);
  }
});

test("Nineveh: Monday–Wednesday, two weeks before Abiy Tsom", () => {
  for (let y = 1990; y <= 2060; y++) {
    const { nenewe, abiy } = byKey(y);
    assert.equal(nenewe.days, 3);
    assert.equal(nenewe.start.weekday(), MON);
    assert.equal(nenewe.end.weekday(), WED);
    assert.equal(nenewe.start.daysUntil(abiy.start), 14);
  }
});

test("Apostles' fast: Monday after Pentecost through Hamle 4; Filseta Nehase 1–15", () => {
  for (let y = 1990; y <= 2060; y++) {
    const { hawariyat, filseta } = byKey(y);
    assert.equal(hawariyat.start.weekday(), MON);
    assert.equal(feastOf(y, "Fasika").daysUntil(hawariyat.start), 50);
    assert.deepEqual([hawariyat.end.month, hawariyat.end.day], [11, 4]);
    assert.deepEqual([filseta.start.month, filseta.start.day, filseta.days], [12, 1, 15]);
  }
});

test("Advent ends the day before Genna; Gahad is the eve of Timket", () => {
  for (let y = 1990; y <= 2060; y++) {
    const { nebiyat, gahad } = byKey(y);
    assert.equal(nebiyat.end.daysUntil(feastOf(y, "Genna")), 1);
    assert.equal(gahad.days, 1);
    assert.equal(gahad.end.daysUntil(feastOf(y, "Timket")), 1);
  }
});

test("fastOn: seasonal days report their fast and day number", () => {
  const { abiy } = byKey(2018);
  const r = fastOn(abiy.start.addDays(9));
  assert.equal(r.fast.key, "abiy");
  assert.equal(r.dayNumber, 10);
});

test("fastOn: Wed/Fri fast outside seasons, never in the Fifty Days or on non-fast weekdays", () => {
  for (let y = 2010; y <= 2030; y++) {
    const fasika = feastOf(y, "Fasika");
    const genna = feastOf(y, "Genna").toJdn();
    const timket = feastOf(y, "Timket").toJdn();
    const seasons = fastsFor(y);
    const inSeason = (d) => seasons.some((f) => d.toJdn() >= f.start.toJdn() && d.toJdn() <= f.end.toJdn());
    for (let d = new EthiopianDate(y, 1, 1); d.year === y; d = d.addDays(1)) {
      const r = fastOn(d);
      if (inSeason(d)) { assert.notEqual(r, null); continue; }
      const wd = d.weekday();
      const fifty = fasika.daysUntil(d) >= 1 && fasika.daysUntil(d) <= 49;
      const feast = d.toJdn() === genna || d.toJdn() === timket;
      const expected = (wd === WED || wd === FRI) && !fifty && !feast;
      assert.equal(r !== null, expected, `${d}`);
      if (r) assert.equal(r.fast, WEEKLY_FAST);
    }
    assert.equal(fastOn(fasika), null); // Easter Sunday itself
    assert.equal(fasika.weekday(), SUN);
  }
});

// --- holiday groups, Islamic and former holidays -------------------------------

const named = (y, prefix) => holidaysFor(y).filter((h) => h.en.startsWith(prefix));

test("every holiday has a known group and kind", () => {
  const groups = new Set(GROUPS.map((g) => g.key));
  for (let y = 1990; y <= 2060; y++) {
    for (const h of holidaysFor(y)) {
      assert.ok(groups.has(h.group), `${h.en} group ${h.group}`);
      assert.ok(["public", "observance", "former"].includes(h.kind), `${h.en} kind ${h.kind}`);
      assert.equal(h.kind === "former", h.group === "former", h.en);
    }
  }
});

test("each Islamic holiday occurs at least once in every Ethiopian year (lunar year is shorter)", () => {
  for (let y = 1990; y <= 2060; y++) {
    for (const name of ["Eid al-Fitr", "Eid al-Adha", "Mawlid", "Ramadan begins", "Islamic New Year", "Ashura"]) {
      const hs = named(y, name);
      assert.ok(hs.length >= 1 && hs.length <= 2, `${name} x${hs.length} in ${y}`);
      for (const h of hs) assert.equal(h.estimated, true);
    }
  }
});

test("Islamic holidays keep their Hijri spacing (Arafah the eve of Eid al-Adha)", () => {
  for (let y = 1990; y <= 2060; y++) {
    for (const eid of named(y, "Eid al-Adha")) {
      const arafah = holidaysFor(y).concat(holidaysFor(y - 1)).find((h) => h.en === "Day of Arafah" && h.date.daysUntil(eid.date) === 1);
      assert.ok(arafah, `no Arafah before ${eid.date}`);
    }
  }
});

test("tabular Hijri epoch is 16 July 622 (Julian)", () => {
  assert.equal(hijriToJdn(1, 1, 1), julianToJdn(622, 7, 16));
});

test("islamicToJdn agrees with Umm al-Qura when Intl has it, and stays near the tabular date", () => {
  for (let hy = 1410; hy <= 1480; hy++) {
    for (const [m, d] of [[1, 1], [3, 12], [9, 1], [10, 1], [12, 10]]) {
      const jdn = islamicToJdn(hy, m, d);
      assert.ok(Math.abs(jdn - hijriToJdn(hy, m, d)) <= 3);
      const u = jdnToUmmAlQura(jdn);
      if (u) assert.deepEqual(u, { y: hy, m, d });
    }
  }
});

test("Orthodox feasts keep their weekday and spacing rules", () => {
  for (let y = 1990; y <= 2060; y++) {
    const one = (p) => { const hs = named(y, p); assert.equal(hs.length, 1, `${p} in ${y}`); return hs[0].date; };
    const fasika = one("Fasika");
    assert.equal(one("Erget").weekday(), 3); // Thursday
    assert.equal(fasika.daysUntil(one("Erget")), 39);
    assert.equal(one("Peraklitos").weekday(), 6);
    assert.equal(one("Debre Zeit").weekday(), 6);
    assert.equal(one("Genna").daysUntil(one("Gizret")), 7); // "the eighth day", counted inclusively
    assert.equal(one("Ketera").daysUntil(one("Timket")), 1);
    assert.equal(one("Timket").daysUntil(one("Kana Zegelila")), 1);
    assert.equal(one("Meskel Demera").daysUntil(one("Meskel (")), 1);
  }
});

test("Irreecha is a Sunday in the week from Meskerem 22", () => {
  for (let y = 1990; y <= 2060; y++) {
    const d = named(y, "Irreecha")[0].date;
    assert.equal(d.weekday(), 6);
    assert.equal(d.month, 1);
    assert.ok(d.day >= 22 && d.day <= 28);
  }
});

test("monthlyFeast covers the main commemoration days and skips Pagume", () => {
  assert.ok(monthlyFeast(new EthiopianDate(2018, 3, 12)));
  assert.ok(monthlyFeast(new EthiopianDate(2018, 5, 29)));
  assert.equal(monthlyFeast(new EthiopianDate(2018, 5, 2)), null);
  assert.equal(monthlyFeast(new EthiopianDate(2019, 13, 5)), null);
});
