// Pure, DOM-free helpers for the calendar demo. Every date conversion, weekday,
// leap-year test, numeral, and fiscal value comes from the package — this file only
// arranges what the primitives return (Principle III: no reimplementation).
import {
  EthiopianDate,
  Era,
  gregorianToJdn,
  toGeez,
  GEEZ_MAX,
  fiscalYearFor,
  fiscalQuarter,
  fiscalPeriod,
} from "../lib/index.js";

// --- display names (presentation only) ------------------------------------

/** Ethiopian months, index 0 = Meskerem … 12 = Pagumē. */
export const MONTHS = [
  { am: "መስከረም", en: "Meskerem" },
  { am: "ጥቅምት", en: "Tikimt" },
  { am: "ኅዳር", en: "Hidar" },
  { am: "ታኅሣሥ", en: "Tahsas" },
  { am: "ጥር", en: "Tir" },
  { am: "የካቲት", en: "Yekatit" },
  { am: "መጋቢት", en: "Megabit" },
  { am: "ሚያዝያ", en: "Miyazya" },
  { am: "ግንቦት", en: "Ginbot" },
  { am: "ሰኔ", en: "Sene" },
  { am: "ሐምሌ", en: "Hamle" },
  { am: "ነሐሴ", en: "Nehase" },
  { am: "ጳጉሜ", en: "Pagumē" },
];

/** Weekdays in the package's ISO order: index 0 = Monday … 6 = Sunday. */
export const WEEKDAYS = [
  { am: "ሰኞ", en: "Monday" },
  { am: "ማክሰኞ", en: "Tuesday" },
  { am: "ረቡዕ", en: "Wednesday" },
  { am: "ሐሙስ", en: "Thursday" },
  { am: "ዓርብ", en: "Friday" },
  { am: "ቅዳሜ", en: "Saturday" },
  { am: "እሑድ", en: "Sunday" },
];

export const GREG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The four-year evangelist cycle, indexed by year % 4 (Luke = the leap year). */
export const EVANGELISTS = [
  { am: "ዮሐንስ", en: "John" },
  { am: "ማቴዎስ", en: "Matthew" },
  { am: "ማርቆስ", en: "Mark" },
  { am: "ሉቃስ", en: "Luke" },
];

export function monthName(month, lang) {
  return MONTHS[month - 1][lang === "am" ? "am" : "en"];
}

export function weekdayName(isoWeekday, lang) {
  return WEEKDAYS[isoWeekday][lang === "am" ? "am" : "en"];
}

export function evangelistOf(year) {
  return EVANGELISTS[((year % 4) + 4) % 4];
}

// --- numerals --------------------------------------------------------------

/** Render a number in Arabic or (via the primitive) Ge'ez. Ge'ez has no zero or
 *  negatives (Principle VII), so anything outside 1..GEEZ_MAX stays Arabic. */
export function num(n, mode) {
  if (mode === "geez" && Number.isInteger(n) && n > 0 && n <= GEEZ_MAX) return toGeez(n);
  return String(n);
}

// --- grids -----------------------------------------------------------------

/**
 * The weeks of an Ethiopian month, Monday-first. Leading/trailing cells are the
 * real neighbouring days (from `addDays`), flagged `outside`.
 */
export function monthGrid(year, month) {
  const first = new EthiopianDate(year, month, 1);
  const lead = first.weekday();
  const days = EthiopianDate.daysInMonth(year, month);
  const rows = Math.ceil((lead + days) / 7);
  const weeks = [];
  for (let r = 0; r < rows; r++) {
    const week = [];
    for (let c = 0; c < 7; c++) {
      const date = first.addDays(r * 7 + c - lead);
      week.push({ date, greg: date.toGregorian(), outside: date.month !== month || date.year !== year });
    }
    weeks.push(week);
  }
  return weeks;
}

/** The Gregorian span a month covers, e.g. "September – October 2026". */
export function gregorianSpan(year, month) {
  const a = new EthiopianDate(year, month, 1).toGregorian();
  const b = new EthiopianDate(year, month, EthiopianDate.daysInMonth(year, month)).toGregorian();
  if (a.year === b.year) {
    return a.month === b.month
      ? `${GREG_MONTHS[a.month - 1]} ${a.year}`
      : `${GREG_MONTHS[a.month - 1]} – ${GREG_MONTHS[b.month - 1]} ${a.year}`;
  }
  return `${GREG_MONTHS[a.month - 1]} ${a.year} – ${GREG_MONTHS[b.month - 1]} ${b.year}`;
}

export function shiftMonth(year, month, n) {
  const d = new EthiopianDate(year, month, 1).addMonths(n);
  return { year: d.year, month: d.month };
}

// --- holidays --------------------------------------------------------------
// The Orthodox feasts follow the Julian calendar, so they're placed by converting
// a Julian-calendar date to a JDN and handing it to the package (`fromJdn`).

/** Julian-calendar date → Julian Day Number (standard integer algorithm). */
export function julianToJdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083;
}

/** Orthodox Easter as a Julian-calendar date (Meeus' Julian algorithm). */
export function orthodoxEasterJulian(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return { year, month, day };
}

/**
 * Selected holidays for Ethiopian year `year` (Amete Mihret), sorted by date.
 * Islamic holidays follow the lunar Hijri calendar and are not computed here.
 */
export function holidaysFor(year) {
  const gStart = year + 7; // Meskerem falls in Gregorian September of this year
  const gEnd = year + 8;
  const fromJdn = (jdn) => EthiopianDate.fromJdn(jdn);
  const easter = orthodoxEasterJulian(gEnd);
  const easterJdn = julianToJdn(easter.year, easter.month, easter.day);

  const list = [
    { date: new EthiopianDate(year, 1, 1), am: "እንቁጣጣሽ", en: "Enkutatash (New Year)", kind: "public" },
    { date: new EthiopianDate(year, 1, 17), am: "መስቀል", en: "Meskel (Finding of the True Cross)", kind: "public" },
    { date: fromJdn(julianToJdn(gStart, 12, 25)), am: "ገና", en: "Genna (Christmas)", kind: "public" },
    { date: fromJdn(julianToJdn(gEnd, 1, 6)), am: "ጥምቀት", en: "Timket (Epiphany)", kind: "public" },
    { date: new EthiopianDate(year, 6, 23), am: "የዓድዋ ድል", en: "Adwa Victory Day", kind: "public" },
    { date: fromJdn(easterJdn - 7), am: "ሆሳዕና", en: "Hosanna (Palm Sunday)", kind: "observance" },
    { date: fromJdn(easterJdn - 2), am: "ስቅለት", en: "Siklet (Good Friday)", kind: "public" },
    { date: fromJdn(easterJdn), am: "ፋሲካ", en: "Fasika (Easter)", kind: "public" },
    { date: fromJdn(gregorianToJdn(gEnd, 5, 1)), am: "የሠራተኞች ቀን", en: "International Labour Day", kind: "public" },
    { date: new EthiopianDate(year, 8, 27), am: "የአርበኞች ቀን", en: "Patriots' Victory Day", kind: "public" },
    { date: new EthiopianDate(year, 9, 20), am: "ግንቦት ፳", en: "Downfall of the Derg", kind: "public" },
    { date: new EthiopianDate(year, 12, 13), am: "ቡሄ", en: "Buhe (Transfiguration)", kind: "observance" },
  ];
  return list
    .filter((h) => h.date.year === year)
    .sort((x, y) => x.date.toJdn() - y.date.toJdn());
}

/** Map of JDN → holidays, for the years a grid may touch. */
export function holidayIndex(years) {
  const map = new Map();
  for (const y of new Set(years)) {
    for (const h of holidaysFor(y)) {
      const k = h.date.toJdn();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(h);
    }
  }
  return map;
}

// --- day facts -------------------------------------------------------------

/** Everything the detail panel shows for one date — all from the primitives. */
export function dayFacts(date, today) {
  return {
    date,
    greg: date.toGregorian(),
    weekday: date.weekday(),
    dayOfYear: (date.month - 1) * 30 + date.day,
    daysInYear: date.isLeapYear() ? 366 : 365,
    leap: date.isLeapYear(),
    alemYear: date.toEra(Era.AmeteAlem).year,
    evangelist: evangelistOf(date.year),
    fiscal: { year: fiscalYearFor(date), quarter: fiscalQuarter(date), period: fiscalPeriod(date) },
    fromToday: today ? today.daysUntil(date) : null,
  };
}

/** Parse "YYYY-MM-DD" (from <input type=date>) without Date/timezone. */
export function parseIsoDate(s) {
  const m = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function isoGregorian(g) {
  return `${String(g.year).padStart(4, "0")}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
}
