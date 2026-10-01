// Ethiopian Calendar — DOM wiring. All calendar behaviour comes from the package via
// model.js; this file only renders state and handles input.
import { EthiopianDate } from "../lib/index.js";
import {
  MONTHS,
  WEEKDAYS,
  GREG_MONTHS,
  monthName,
  weekdayName,
  num,
  monthGrid,
  gregorianSpan,
  shiftMonth,
  holidaysFor,
  holidayIndex,
  dayFacts,
  parseIsoDate,
  isoGregorian,
} from "./model.js";

const $ = (id) => document.getElementById(id);

// --- preferences (per-viewer conveniences only) -------------------------------
function loadPref(key, fallback, allowed) {
  try {
    const v = localStorage.getItem("ethcal:" + key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function savePref(key, value) {
  try { localStorage.setItem("ethcal:" + key, value); } catch { /* storage unavailable */ }
}

// --- state ------------------------------------------------------------------------
function todayEthiopian() {
  // The clock is used ONLY to choose the starting page (Principle VIII).
  const now = new Date();
  return EthiopianDate.fromGregorian({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

const today = todayEthiopian();
const state = {
  lang: loadPref("lang", "am", ["am", "en"]),
  numerals: loadPref("num", "arabic", ["arabic", "geez"]),
  theme: loadPref("theme", "", ["", "light", "dark"]),
  view: loadPref("view", "month", ["month", "year"]),
  year: today.year,
  month: today.month,
  selected: today,
};

// --- formatting ---------------------------------------------------------------------
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const n = (v) => num(v, state.numerals);
const other = () => (state.lang === "am" ? "en" : "am");

function ethLong(d, lang = state.lang) {
  return `${weekdayName(d.weekday(), lang)}, ${monthName(d.month, lang)} ${n(d.day)}, ${n(d.year)}`;
}
function ethShort(d, lang = state.lang) {
  return `${monthName(d.month, lang)} ${n(d.day)}, ${n(d.year)}`;
}
function gregLong(g, weekday) {
  const wd = weekday == null ? "" : WEEKDAYS[weekday].en + ", ";
  return `${wd}${GREG_MONTHS[g.month - 1]} ${g.day}, ${g.year}`;
}
function relative(days) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days.toLocaleString("en")} days` : `${(-days).toLocaleString("en")} days ago`;
}
function holidayLabel(h) {
  return state.lang === "am" ? `${h.am} · ${h.en}` : h.en;
}

// --- render -------------------------------------------------------------------------
function render() {
  document.documentElement.lang = state.lang;
  if (state.theme) document.documentElement.dataset.theme = state.theme;
  else delete document.documentElement.dataset.theme;

  for (const b of document.querySelectorAll("[data-lang]")) b.setAttribute("aria-checked", String(b.dataset.lang === state.lang));
  for (const b of document.querySelectorAll("[data-num]")) b.setAttribute("aria-checked", String(b.dataset.num === state.numerals));
  for (const b of document.querySelectorAll("[data-view]")) b.setAttribute("aria-checked", String(b.dataset.view === state.view));

  $("today-line").innerHTML =
    `Today is <b>${esc(ethLong(today))}</b> · ${esc(gregLong(today.toGregorian()))}`;

  if (state.view === "month") renderMonth();
  else renderYear();
  renderDetail();
  renderHolidays();
  renderConverterMonths();
}

function renderMonth() {
  const { year, month } = state;
  $("cal-title").innerHTML =
    `${esc(monthName(month, state.lang))} ${esc(n(year))}<span class="sub">${esc(monthName(month, other()))}</span>`;
  $("cal-span").textContent = gregorianSpan(year, month);
  $("prev-btn").setAttribute("aria-label", "Previous month");
  $("next-btn").setAttribute("aria-label", "Next month");

  const weeks = monthGrid(year, month);
  const hol = holidayIndex([year - 1, year, year + 1]);
  const todayJdn = today.toJdn();
  const selJdn = state.selected.toJdn();

  let html = '<div class="grid" role="grid" aria-labelledby="cal-title"><div role="row" style="display:contents">';
  WEEKDAYS.forEach((w, i) => {
    const label = state.lang === "am" ? w.am : w.en.slice(0, 3);
    html += `<div class="dow${i === 6 ? " sun" : ""}" role="columnheader" title="${esc(w.en)}">${esc(label)}</div>`;
  });
  html += "</div>";

  weeks.forEach((week, r) => {
    html += '<div role="row" style="display:contents">';
    week.forEach((cell, c) => {
      const { date, greg, outside } = cell;
      const jdn = date.toJdn();
      const hs = hol.get(jdn) || [];
      const pub = hs.filter((h) => h.kind === "public");
      const cls = ["day"];
      if (outside) cls.push("outside");
      if (c === 6) cls.push("sun");
      if (hs.length) cls.push("holiday", pub.length ? "pub" : "obs-only");
      if (jdn === todayJdn) cls.push("today");
      if (jdn === selJdn) cls.push("selected");
      const gLabel = greg.day === 1 || (r === 0 && c === 0) || (!outside && date.day === 1)
        ? `${GREG_MONTHS[greg.month - 1].slice(0, 3)} ${greg.day}`
        : String(greg.day);
      const hText = hs.map((h) => (state.lang === "am" ? h.am : h.en.replace(/ \(.*\)$/, ""))).join(" · ");
      const aria = `${ethLong(date)}; ${gregLong(greg)}${hs.length ? "; " + hs.map((h) => h.en).join(", ") : ""}`;
      html += `<button type="button" role="gridcell" class="${cls.join(" ")}" data-jdn="${jdn}" tabindex="${jdn === selJdn ? 0 : -1}" aria-label="${esc(aria)}" aria-selected="${jdn === selJdn}">
        <span class="n">${esc(n(date.day))}</span>
        <span class="g">${esc(gLabel)}</span>
        ${hs.length ? `<span class="h${pub.length ? "" : " obs"}">${esc(hText)}</span>` : ""}
      </button>`;
    });
    html += "</div>";
  });
  html += "</div>";

  if (month === 13) {
    const days = EthiopianDate.daysInMonth(year, 13);
    html += `<p class="pagume-note"><b>${esc(monthName(13, state.lang))}</b> is the 13th month — ${days} days this year${
      days === 6 ? " (a leap year)" : ""}. The other twelve months always have 30.</p>`;
  }
  $("view").innerHTML = html;
}

function renderYear() {
  const { year } = state;
  const ev = dayFacts(new EthiopianDate(year, 1, 1), null).evangelist;
  $("cal-title").innerHTML =
    `${esc(n(year))}<span class="sub">${state.lang === "am" ? "ዘመነ " + esc(ev.am) : "Year of " + esc(ev.en)}</span>`;
  const a = new EthiopianDate(year, 1, 1).toGregorian();
  const b = new EthiopianDate(year, 13, EthiopianDate.daysInMonth(year, 13)).toGregorian();
  $("cal-span").textContent = `${GREG_MONTHS[a.month - 1]} ${a.day}, ${a.year} – ${GREG_MONTHS[b.month - 1]} ${b.day}, ${b.year}`;
  $("prev-btn").setAttribute("aria-label", "Previous year");
  $("next-btn").setAttribute("aria-label", "Next year");

  const hol = holidayIndex([year]);
  const todayJdn = today.toJdn();
  let html = '<div class="year">';
  for (let m = 1; m <= 13; m++) {
    const isCur = today.year === year && today.month === m;
    html += `<button type="button" class="mini${isCur ? " current" : ""}" data-month="${m}" aria-label="${esc(monthName(m, "en"))} ${year}">
      <header><b>${esc(monthName(m, state.lang))}</b><span>${esc(gregorianSpan(year, m).replace(/ \d{4}/g, ""))}</span></header>
      <div class="mgrid">`;
    for (const w of WEEKDAYS) html += `<span class="w">${esc(state.lang === "am" ? w.am.slice(0, 1) : w.en.slice(0, 1))}</span>`;
    for (const week of monthGrid(year, m)) {
      week.forEach((cell, c) => {
        const jdn = cell.date.toJdn();
        const cls = cell.outside ? "o" : jdn === todayJdn ? "t" : hol.has(jdn) ? "hd" : c === 6 ? "su" : "";
        html += `<span class="${cls}">${cell.outside ? "" : esc(n(cell.date.day))}</span>`;
      });
    }
    html += "</div></button>";
  }
  html += "</div>";
  $("view").innerHTML = html;
}

function renderDetail() {
  const d = state.selected;
  const f = dayFacts(d, today);
  const hs = holidaysFor(d.year).filter((h) => h.date.toJdn() === d.toJdn());
  const ev = f.evangelist;
  const rows = [
    ["Gregorian", esc(gregLong(f.greg, f.weekday))],
    ["Day of year", `${esc(n(f.dayOfYear))} / ${esc(n(f.daysInYear))}`],
    ["Year", f.leap ? `<span class="chip">Leap · ${esc(n(366))} days</span>` : `Common · ${esc(n(365))} days`],
    ["Evangelist", `<span lang="am">ዘመነ ${esc(ev.am)}</span> · ${esc(ev.en)}`],
    ["Amete Alem", esc(n(f.alemYear))],
    ["Fiscal", `FY ${esc(n(f.fiscal.year))} · Q${esc(n(f.fiscal.quarter))} · P${esc(n(f.fiscal.period))}`],
    ["Relative", esc(relative(f.fromToday))],
  ];
  $("detail").innerHTML = `
    <div class="big">
      <div class="badge">${esc(n(d.day))}</div>
      <div>
        <div class="headline">${esc(ethLong(d))}</div>
        <div class="subline">${esc(ethShort(d, other()))}</div>
      </div>
    </div>
    ${hs.map((h) => `<p class="hol${h.kind === "observance" ? " obs" : ""}">${esc(holidayLabel(h))}</p>`).join("")}
    <dl class="facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
}

function renderHolidays() {
  const y = state.year;
  $("hol-h").textContent = `Holidays · ${n(y)}`;
  const todayJdn = today.toJdn();
  $("holidays").innerHTML = holidaysFor(y)
    .map((h) => {
      const past = h.date.toJdn() < todayJdn;
      const g = h.date.toGregorian();
      return `<li class="${h.kind === "observance" ? "obs" : ""}${past ? " past" : ""}">
        <button type="button" data-jdn="${h.date.toJdn()}">
          <span class="dot"></span>
          <span>${state.lang === "am" ? `<span lang="am">${esc(h.am)}</span>` : esc(h.en)}</span>
          <span class="when">${esc(monthName(h.date.month, state.lang))} ${esc(n(h.date.day))} · ${GREG_MONTHS[g.month - 1].slice(0, 3)} ${g.day}</span>
        </button></li>`;
    })
    .join("");
}

function renderConverterMonths() {
  const sel = $("conv-eth-month");
  const cur = sel.value || String(state.selected.month);
  sel.innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}">${esc(state.lang === "am" ? m.am : m.en)}</option>`).join("");
  sel.value = cur;
}

// --- converter ------------------------------------------------------------------------
function jumpButton(d) {
  return ` <button type="button" data-jdn="${d.toJdn()}">Show</button>`;
}
function convertFromGregorian() {
  const out = $("conv-greg-out");
  const g = parseIsoDate($("conv-greg").value);
  if (!g) { out.innerHTML = ""; return; }
  try {
    const d = EthiopianDate.fromGregorian(g);
    out.innerHTML = `<b>${esc(ethLong(d))}</b>${jumpButton(d)}`;
  } catch (e) {
    out.innerHTML = `<span class="err">${esc(e.message)}</span>`;
  }
}
function convertFromEthiopian() {
  const out = $("conv-eth-out");
  const y = Number($("conv-eth-year").value);
  const m = Number($("conv-eth-month").value);
  const dd = Number($("conv-eth-day").value);
  if (!$("conv-eth-year").value || !$("conv-eth-day").value) { out.innerHTML = ""; return; }
  try {
    const d = new EthiopianDate(y, m, dd);
    out.innerHTML = `<b>${esc(gregLong(d.toGregorian(), d.weekday()))}</b>${jumpButton(d)}`;
  } catch (e) {
    out.innerHTML = `<span class="err">${esc(e.message)}</span>`;
  }
}
function syncConverter(d) {
  $("conv-greg").value = isoGregorian(d.toGregorian());
  $("conv-eth-year").value = d.year;
  $("conv-eth-month").value = String(d.month);
  $("conv-eth-day").value = d.day;
  convertFromGregorian();
  convertFromEthiopian();
}

// --- actions --------------------------------------------------------------------------
function select(d, { focus = false } = {}) {
  state.selected = d;
  state.year = d.year;
  state.month = d.month;
  render();
  syncConverter(d);
  if (focus && state.view === "month") {
    const el = document.querySelector(`.day[data-jdn="${d.toJdn()}"]`);
    if (el) el.focus();
  }
}

function go(delta) {
  if (state.view === "month") {
    const t = shiftMonth(state.year, state.month, delta);
    state.year = t.year;
    state.month = t.month;
  } else {
    state.year += delta;
  }
  render();
}

// --- events ---------------------------------------------------------------------------
document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.lang) { state.lang = t.dataset.lang; savePref("lang", state.lang); render(); syncConverter(state.selected); return; }
  if (t.dataset.num) { state.numerals = t.dataset.num; savePref("num", state.numerals); render(); syncConverter(state.selected); return; }
  if (t.dataset.view) { state.view = t.dataset.view; savePref("view", state.view); render(); return; }
  if (t.dataset.month) {
    state.month = Number(t.dataset.month);
    state.view = "month";
    savePref("view", "month");
    render();
    return;
  }
  if (t.dataset.jdn) {
    const d = EthiopianDate.fromJdn(Number(t.dataset.jdn));
    if (state.view === "year" && !t.classList.contains("day")) state.view = "month";
    select(d, { focus: t.classList.contains("day") });
    return;
  }
});

$("prev-btn").addEventListener("click", () => go(-1));
$("next-btn").addEventListener("click", () => go(1));
$("today-btn").addEventListener("click", () => select(today));
$("theme-btn").addEventListener("click", () => {
  const dark = state.theme
    ? state.theme === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  state.theme = dark ? "light" : "dark";
  savePref("theme", state.theme);
  render();
});

$("conv-greg").addEventListener("input", convertFromGregorian);
for (const id of ["conv-eth-year", "conv-eth-month", "conv-eth-day"]) {
  $(id).addEventListener("input", convertFromEthiopian);
}

document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, select, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
  if (step != null && state.view === "month") {
    e.preventDefault();
    select(state.selected.addDays(step), { focus: true });
  } else if (e.key === "PageUp" || e.key === "PageDown") {
    e.preventDefault();
    if (state.view === "month") select(state.selected.addMonths(e.key === "PageUp" ? -1 : 1), { focus: true });
    else go(e.key === "PageUp" ? -1 : 1);
  } else if (e.key === "t" || e.key === "T") {
    select(today, { focus: true });
  }
});

render();
syncConverter(state.selected);
