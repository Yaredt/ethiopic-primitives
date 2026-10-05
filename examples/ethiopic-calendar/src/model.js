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

// --- Hijri (Islamic) calendar ----------------------------------------------
// Ethiopia fixes Islamic holidays by local moon sighting, so no formula is exact and
// these holidays are flagged `estimated`. The browser's built-in Umm al-Qura calendar
// (Intl, offline) is usually right or a day out; where it's unavailable we fall back
// to the arithmetic (tabular) calendar, which can run a day or two late.

/** Hijri date → JDN, tabular Islamic calendar (civil epoch, 1 Muharram 1 AH). */
export function hijriToJdn(y, m, d) {
  return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948439;
}

const UNIX_EPOCH_JDN = 2440588;

function makeUmmAlQura() {
  try {
    const f = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric",
    });
    const probe = f.resolvedOptions().calendar;
    return probe === "islamic-umalqura" ? f : null;
  } catch {
    return null;
  }
}
const UMM_AL_QURA = makeUmmAlQura();

/** JDN → Umm al-Qura Hijri {y, m, d}, or null when Intl lacks the calendar. */
export function jdnToUmmAlQura(jdn) {
  if (!UMM_AL_QURA) return null;
  const parts = {};
  for (const p of UMM_AL_QURA.formatToParts(new Date((jdn - UNIX_EPOCH_JDN) * 86400000))) parts[p.type] = p.value;
  const y = parseInt(parts.year ?? parts.relatedYear, 10);
  return Number.isFinite(y) ? { y, m: Number(parts.month), d: Number(parts.day) } : null;
}

/** Hijri date → JDN: Umm al-Qura when available (searched near the tabular date),
 *  otherwise the tabular calendar. */
export function islamicToJdn(y, m, d) {
  const t = hijriToJdn(y, m, d);
  for (let k = -3; k <= 3; k++) {
    const h = jdnToUmmAlQura(t + k);
    if (!h) break;
    if (h.y === y && h.m === m && h.d === d) return t + k;
  }
  return t;
}

/** Hijri months used below (1-based). */
const MUHARRAM = 1, RABI_AWWAL = 3, RAMADAN = 9, SHAWWAL = 10, DHU_HIJJAH = 12;

const ISLAMIC = [
  { m: MUHARRAM, d: 1, am: "የሂጅራ አዲስ ዓመት", en: "Islamic New Year", kind: "observance" },
  { m: MUHARRAM, d: 10, am: "አሹራ", en: "Ashura", kind: "observance" },
  { m: RABI_AWWAL, d: 12, am: "መውሊድ", en: "Mawlid (Prophet's Birthday)", kind: "public" },
  { m: RAMADAN, d: 1, am: "ረመዳን ይጀምራል", en: "Ramadan begins", kind: "observance" },
  { m: RAMADAN, d: 27, am: "ለይለተል ቀድር", en: "Laylat al-Qadr", kind: "observance" },
  { m: SHAWWAL, d: 1, am: "ዒድ አል ፈጥር", en: "Eid al-Fitr", kind: "public" },
  { m: DHU_HIJJAH, d: 9, am: "የዐረፋ ቀን", en: "Day of Arafah", kind: "observance" },
  { m: DHU_HIJJAH, d: 10, am: "ዒድ አል አድሐ (አረፋ)", en: "Eid al-Adha", kind: "public" },
];

/** Islamic holidays whose (estimated) date falls in Ethiopian year `year`. A lunar
 *  year is ~11 days shorter, so one holiday can occur twice in a solar year. */
function islamicHolidays(year) {
  const first = new EthiopianDate(year, 1, 1).toJdn();
  const last = new EthiopianDate(year, 13, EthiopianDate.daysInMonth(year, 13)).toJdn();
  const approxHijri = Math.floor(((year + 8 - 622) * 33) / 32);
  const out = [];
  for (let hy = approxHijri - 2; hy <= approxHijri + 2; hy++) {
    for (const h of ISLAMIC) {
      const jdn = islamicToJdn(hy, h.m, h.d);
      if (jdn >= first && jdn <= last) {
        out.push({ ...h, date: EthiopianDate.fromJdn(jdn), group: "islamic", estimated: true });
      }
    }
  }
  return out;
}

// --- holidays --------------------------------------------------------------

/** Holiday groups, in display order. `kind` is orthogonal: public (a day off) or
 *  observance (marked, not a day off). */
export const GROUPS = [
  { key: "civic", am: "ብሔራዊ", en: "National" },
  { key: "orthodox", am: "ኦርቶዶክስ", en: "Orthodox" },
  { key: "islamic", am: "እስልምና", en: "Islamic" },
  { key: "cultural", am: "ባህላዊ", en: "Cultural" },
];

/**
 * Holidays and observances for Ethiopian year `year` (Amete Mihret), sorted by date.
 * Each entry: {date, am, en, kind, group, estimated?, note?}.
 */
export function holidaysFor(year) {
  const gStart = year + 7; // Meskerem falls in Gregorian September of this year
  const gEnd = year + 8;
  const fromJdn = (jdn) => EthiopianDate.fromJdn(jdn);
  const eth = (m, d) => new EthiopianDate(year, m, d);
  const greg = (gy, m, d) => fromJdn(gregorianToJdn(gy, m, d));
  const easter = orthodoxEasterJulian(gEnd);
  const easterJdn = julianToJdn(easter.year, easter.month, easter.day);
  const fasika = (offset) => fromJdn(easterJdn + offset);

  // Irreecha: Oromo thanksgiving, on a Sunday in early Tikimt set by the Abba Gadaa
  // councils. Approximated as the first Sunday on or after Meskerem 22.
  const m22 = eth(1, 22);
  const irreecha = m22.addDays((6 - m22.weekday() + 7) % 7);

  const civic = [
    { date: eth(1, 1), am: "እንቁጣጣሽ", en: "Enkutatash (New Year)", kind: "public" },
    { date: eth(6, 23), am: "የዓድዋ ድል", en: "Adwa Victory Day", kind: "public" },
    { date: greg(gEnd, 5, 1), am: "የሠራተኞች ቀን", en: "International Labour Day", kind: "public" },
    { date: eth(8, 27), am: "የአርበኞች ቀን", en: "Patriots' Victory Day", kind: "public" },
    { date: eth(9, 20), am: "ግንቦት ፳", en: "Downfall of the Derg", kind: "public" },
    { date: eth(3, 29), am: "የብሔር ብሔረሰቦች ቀን", en: "Nations, Nationalities & Peoples' Day", kind: "observance" },
    { date: eth(6, 12), am: "የሰማዕታት ቀን", en: "Martyrs' Day (Yekatit 12)", kind: "observance",
      note: "Remembers the victims of the 1937 Addis Ababa massacre." },
    { date: greg(gEnd, 3, 8), am: "የሴቶች ቀን", en: "International Women's Day", kind: "observance" },
    { date: greg(gEnd, 5, 25), am: "የአፍሪካ ቀን", en: "Africa Day", kind: "observance" },
  ];
  const orthodox = [
    { date: eth(1, 16), am: "የመስቀል ደመራ", en: "Meskel Demera (bonfire eve)", kind: "observance" },
    { date: eth(1, 17), am: "መስቀል", en: "Meskel (Finding of the True Cross)", kind: "public" },
    { date: eth(3, 12), am: "ኅዳር ሚካኤል", en: "Hidar Mikael (St. Michael)", kind: "observance" },
    { date: eth(3, 21), am: "ኅዳር ጽዮን", en: "Hidar Tsion (St. Mary of Zion)", kind: "observance" },
    { date: eth(4, 19), am: "ቁልቢ ገብርኤል", en: "Kulubi Gabriel", kind: "observance" },
    { date: fromJdn(julianToJdn(gStart, 12, 25)), am: "ገና", en: "Genna (Christmas)", kind: "public" },
    { date: fromJdn(julianToJdn(gEnd, 1, 1)), am: "ግዝረት", en: "Gizret (Circumcision of Christ)", kind: "observance" },
    { date: fromJdn(julianToJdn(gEnd, 1, 5)), am: "ከተራ", en: "Ketera (Eve of Timket)", kind: "observance" },
    { date: fromJdn(julianToJdn(gEnd, 1, 6)), am: "ጥምቀት", en: "Timket (Epiphany)", kind: "public" },
    { date: fromJdn(julianToJdn(gEnd, 1, 7)), am: "ቃና ዘገሊላ", en: "Kana Zegelila (Wedding at Cana)", kind: "observance" },
    { date: eth(6, 16), am: "ኪዳነ ምሕረት", en: "Kidane Mehret (Covenant of Mercy)", kind: "observance" },
    { date: fasika(-28), am: "ደብረ ዘይት", en: "Debre Zeit (Mid-Lent)", kind: "observance" },
    { date: eth(7, 29), am: "ፅንሰት (ብሥራት)", en: "Tsinset (Annunciation)", kind: "observance" },
    { date: fasika(-7), am: "ሆሳዕና", en: "Hosanna (Palm Sunday)", kind: "observance" },
    { date: fasika(-2), am: "ስቅለት", en: "Siklet (Good Friday)", kind: "public" },
    { date: fasika(0), am: "ፋሲካ", en: "Fasika (Easter)", kind: "public" },
    { date: eth(8, 23), am: "ቅዱስ ጊዮርጊስ", en: "St. George (Giyorgis)", kind: "observance" },
    { date: eth(9, 1), am: "ልደታ ለማርያም", en: "Lideta Mariam (Birth of Mary)", kind: "observance" },
    { date: eth(9, 11), am: "ቅዱስ ያሬድ", en: "St. Yared", kind: "observance" },
    { date: fasika(39), am: "ዕርገት", en: "Erget (Ascension)", kind: "observance" },
    { date: fasika(49), am: "ጰራቅሊጦስ", en: "Peraklitos (Pentecost)", kind: "observance" },
    { date: eth(11, 5), am: "ጴጥሮስ ወጳውሎስ", en: "Saints Peter & Paul", kind: "observance" },
    { date: eth(11, 19), am: "ሐምሌ ገብርኤል", en: "Kulubi Gabriel (Hamle)", kind: "observance" },
    { date: eth(12, 13), am: "ቡሄ (ደብረ ታቦር)", en: "Buhe / Debre Tabor (Transfiguration)", kind: "observance" },
    { date: eth(12, 16), am: "ፍልሰታ ለማርያም", en: "Filseta (Assumption of Mary)", kind: "observance" },
    { date: eth(12, 24), am: "ተክለ ሃይማኖት", en: "St. Tekle Haymanot", kind: "observance" },
  ];
  const cultural = [
    { date: irreecha, am: "ኢሬቻ", en: "Irreecha (Oromo thanksgiving)", kind: "observance", estimated: true,
      note: "Held on a Sunday in early October; the exact day is announced by the Abba Gadaa councils." },
    { date: eth(12, 16), am: "አሸንዳ · ሻደይ · ሶለል", en: "Ashenda / Shadey / Solel (girls' festival)", kind: "observance",
      note: "Celebrated in Tigray and Amhara for several days from the end of the Filseta fast." },
  ];
  const list = [
    ...civic.map((h) => ({ ...h, group: "civic" })),
    ...orthodox.map((h) => ({ ...h, group: "orthodox" })),
    ...islamicHolidays(year),
    ...cultural.map((h) => ({ ...h, group: "cultural" })),
  ];
  return list
    .filter((h) => h.date.year === year)
    .sort((x, y) => x.date.toJdn() - y.date.toJdn() || (x.kind === "public" ? -1 : y.kind === "public" ? 1 : 0));
}

/**
 * Monthly commemorations (ወርኃዊ በዓላት) of the Ethiopian Orthodox Tewahedo Church,
 * keyed by day of the month (1–30), as listed by ethiopianorthodox.org. The first
 * entry is the day's principal commemoration.
 */
const MONTHLY = {
  1: [["ልደታ", "Lideta (Birth of Mary)"], ["ራጉኤል", "St. Raguel"], ["ኤልያስ", "Prophet Elijah"]],
  2: [["ታዴዎስ ሐዋርያ", "Thaddeus the Apostle"], ["ኢዮብ ጻድቅ", "Job the Righteous"]],
  3: [["በዓታ ማርያም", "Ba'eta Mariam (Presentation of Mary)"], ["ዜና ማርቆስ", "Zena Markos"], ["ነአኩቶ ለአብ", "Na'akueto La'ab"]],
  4: [["ዮሐንስ ወልደ ነጎድጓድ", "John, Son of Thunder"]],
  5: [["ጴጥሮስ ወጳውሎስ", "Saints Peter & Paul"], ["አቡነ ገብረ መንፈስ ቅዱስ", "Abune Gebre Menfes Kidus"]],
  6: [["ኢየሱስ", "Iyesus (Jesus)"], ["ቁስቋም", "Qusqwam"], ["አርሴማ ቅድስት", "St. Arsema"]],
  7: [["ሥላሴ", "Holy Trinity (Selassie)"], ["ፊልሞን", "Philemon"], ["አብላንዮስ", "Ablanyos"]],
  8: [["ማቴዎስ", "Matthew the Evangelist"], ["ዮልያኖስ", "Yolyanos"], ["አባ ኪሮስ", "Abba Kiros"]],
  9: [["ቶማስ ሐዋርያ", "Thomas the Apostle"], ["እንድርያስ ሐዋርያ", "Andrew the Apostle"], ["አውሳብዮስ", "Eusebius"]],
  10: [["በዓለ መስቀሉ ለእግዚእነ", "Feast of the Cross of Our Lord"]],
  11: [["ሃና ወኢያቄም", "Hanna & Joachim"], ["ቅዱስ ፋሲለደስ ሰማዕት", "St. Fasiledes the Martyr"]],
  12: [["ቅዱስ ሚካኤል", "St. Michael"], ["ክርስቶስ ሠምራ", "Kristos Semra"]],
  13: [["እግዚአብሔር አብ", "God the Father"], ["ቅዱስ ሩፋኤል ሊቀ መላእክት", "St. Raphael the Archangel"]],
  14: [["አባ አረጋዊ", "Abba Aregawi"], ["አባ ገብረ ክርስቶስ", "Abba Gebre Kristos"], ["ድምጥያኖስ ሰማዕት", "Dimtyanos the Martyr"]],
  15: [["ቂርቆስና ኢየሉጣ", "Qirqos & Iyeluta"], ["ስልፋኮስ", "Silfakos"]],
  16: [["ኪዳነ ምሕረት", "Kidane Mehret"], ["ሚካኤል ጳጳስ", "Michael the Bishop"]],
  17: [["ቅዱስ እስጢፋኖስ", "St. Stephen"], ["ሉቃስ ዘዓምደ ብርሃን", "Luke of Amde Birhan"]],
  18: [["ፊልጶስ ሐዋርያ", "Philip the Apostle"], ["ኤስድሮስ ሰማዕት", "Isidore the Martyr"], ["ኤዎስጣቴዎስ ሰማዕት", "Eustathius the Martyr"]],
  19: [["ቅዱስ ገብርኤል", "St. Gabriel"], ["አርቃዲዎስ", "Arcadius"]],
  20: [["ጽንሰታ ለማርያም", "Conception of Mary"], ["ነቢዩ ኤልሳ", "Prophet Elisha"], ["ሐጌ ነቢይ", "Prophet Haggai"], ["አባ ሰላማ", "Abba Selama"]],
  21: [["በዓለ እግዝእትነ ማርያም", "Feast of Our Lady Mary"]],
  22: [["ቅዱስ ዑራኤል", "St. Uriel"], ["ያዕቆብ ምሥራቃዊ", "Jacob of the East"], ["ደቅስዮስ", "Deqsyos"]],
  23: [["ቅዱስ ጊዮርጊስ", "St. George"], ["ለጊዮስ ሰማዕት", "Legios the Martyr"]],
  24: [["አቡነ ተክለ ሃይማኖት", "Abune Tekle Haymanot"]],
  25: [["መርቆሬዎስ", "Merkorewos"], ["አኒፍኖስ", "Anifnos"]],
  26: [["ሆሴዕ ነቢይ", "Prophet Hosea"]],
  27: [["መድኃኔ ዓለም", "Medhane Alem (Saviour of the World)"]],
  28: [["አማኑኤል", "Amanuel"], ["ቆስጠንጢኖስ", "Constantine"], ["አብርሃም", "Abraham"]],
  29: [["በዓለ ወልድ", "Bale Wold (Feast of the Son)"], ["ሳሙኤል ዘወገግ", "Samuel of Wegag"]],
  30: [["ማርቆስ ወንጌላዊ", "Mark the Evangelist"]],
};

/** The commemorations for this day of the month, principal first, as [{am, en}];
 *  empty for Pagumē. */
export function monthlyFeast(date) {
  if (date.month === 13) return [];
  return MONTHLY[date.day].map(([am, en]) => ({ am, en }));
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

// --- fasts -----------------------------------------------------------------
// The seven fasts of the Ethiopian Orthodox Tewahedo Church. The movable ones hang
// off Fasika (Orthodox Easter); the rest are fixed Ethiopian dates or the eves of
// Genna/Timket, so every placement reuses holidaysFor + the package's JDN API.

/** Easter-relative day offsets (Hudade = 55 days ending Holy Saturday). */
const ABIY_TSOM_DAYS = 55;
const NENEWE_OFFSET = -69; // Monday two weeks before Abiy Tsom, three days
const PENTECOST_OFFSET = 49;

function feast(year, prefix) {
  return holidaysFor(year).find((h) => h.en.startsWith(prefix)).date;
}

/**
 * Seasonal fasts for Ethiopian year `year`, as inclusive {start, end} ranges,
 * sorted by start. Wednesday/Friday fasting is handled by `fastOn`.
 */
export function fastsFor(year) {
  const fasika = feast(year, "Fasika");
  const genna = feast(year, "Genna");
  const timket = feast(year, "Timket");
  const list = [
    {
      key: "nebiyat", am: "ጾመ ነቢያት", en: "Fast of the Prophets (Advent)",
      start: new EthiopianDate(year, 3, 15), end: genna.addDays(-1),
    },
    {
      key: "gahad", am: "ጾመ ገሀድ", en: "Gahad (Eve of Timket)",
      start: timket.addDays(-1), end: timket.addDays(-1),
    },
    {
      key: "nenewe", am: "ጾመ ነነዌ", en: "Fast of Nineveh",
      start: fasika.addDays(NENEWE_OFFSET), end: fasika.addDays(NENEWE_OFFSET + 2),
    },
    {
      key: "abiy", am: "ዐቢይ ጾም", en: "Abiy Tsom (Great Lent)",
      start: fasika.addDays(-ABIY_TSOM_DAYS), end: fasika.addDays(-1),
    },
    {
      key: "hawariyat", am: "ጾመ ሐዋርያት", en: "Fast of the Apostles",
      start: fasika.addDays(PENTECOST_OFFSET + 1), end: new EthiopianDate(year, 11, 4),
    },
    {
      key: "filseta", am: "ጾመ ፍልሰታ", en: "Filseta (Fast of the Assumption)",
      start: new EthiopianDate(year, 12, 1), end: new EthiopianDate(year, 12, 15),
    },
  ];
  return list
    .map((f) => ({ ...f, days: f.start.daysUntil(f.end) + 1 }))
    .sort((a, b) => a.start.toJdn() - b.start.toJdn());
}

export const WEEKLY_FAST = { key: "weekly", am: "ጾመ ድኅነት", en: "Wednesday & Friday fast" };

/**
 * The fast observed on `date`, or null. A seasonal fast wins; otherwise Wednesdays
 * and Fridays fast, except in the fifty days from Fasika to Pentecost and on
 * Genna or Timket themselves. Returns {fast, dayNumber} (dayNumber is 1-based
 * within a seasonal fast, null for the weekly fast).
 */
export function fastOn(date) {
  const jdn = date.toJdn();
  for (const f of fastsFor(date.year)) {
    if (jdn >= f.start.toJdn() && jdn <= f.end.toJdn()) {
      return { fast: f, dayNumber: jdn - f.start.toJdn() + 1 };
    }
  }
  const wd = date.weekday();
  if (wd !== 2 && wd !== 4) return null; // ISO: 2 = Wednesday, 4 = Friday
  const fasika = feast(date.year, "Fasika").toJdn();
  if (jdn > fasika && jdn <= fasika + PENTECOST_OFFSET) return null;
  const genna = feast(date.year, "Genna").toJdn();
  const timket = feast(date.year, "Timket").toJdn();
  if (jdn === genna || jdn === timket) return null;
  return { fast: WEEKLY_FAST, dayNumber: null };
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
