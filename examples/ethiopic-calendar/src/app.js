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
  monthlyFeast,
  GROUPS,
  fastsFor,
  fastOn,
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
  fasts: loadPref("fasts", "on", ["on", "off"]),
  saints: loadPref("saints", "on", ["on", "off"]),
  holFilter: loadPref("holFilter", "all", ["all", "public", ...GROUPS.map((g) => g.key)]),
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
function fastClass(date) {
  if (state.fasts !== "on") return "";
  const f = fastOn(date);
  return !f ? "" : f.fast.key === "weekly" ? "fast-weekly" : "fast";
}
function holidayLabel(h) {
  return state.lang === "am" ? `${h.am} · ${h.en}` : h.en;
}
/** Holidays pass the current filter chip (all / public / a group). */
function shown(h) {
  const f = state.holFilter;
  return f === "all" || (f === "public" ? h.kind === "public" : h.group === f);
}
function groupName(key) {
  const g = GROUPS.find((x) => x.key === key);
  return state.lang === "am" ? g.am : g.en;
}
/** CSS class for a set of same-day holidays: the strongest kind wins. */
function holClass(hs) {
  return hs.some((h) => h.kind === "public") ? "pub" : "obs-only";
}
function shortName(h) {
  return state.lang === "am" ? h.am : h.en.replace(/ \(.*\)$/, "");
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
  renderFasts();
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
      const hs = (hol.get(jdn) || []).filter(shown);
      const hc = hs.length ? holClass(hs) : "";
      const cls = ["day"];
      if (outside) cls.push("outside");
      if (c === 6) cls.push("sun");
      if (hs.length) cls.push("holiday", hc);
      const fc = fastClass(date);
      if (fc) cls.push(fc);
      if (jdn === todayJdn) cls.push("today");
      if (jdn === selJdn) cls.push("selected");
      const gLabel = greg.day === 1 || (r === 0 && c === 0) || (!outside && date.day === 1)
        ? `${GREG_MONTHS[greg.month - 1].slice(0, 3)} ${greg.day}`
        : String(greg.day);
      const hText = hs.map((h) => shortName(h) + (h.estimated ? " ≈" : "")).join(" · ");
      const saint = !hs.length && state.saints === "on" ? monthlyFeast(date)[0] : null;
      const fo = fc ? fastOn(date) : null;
      const aria = `${ethLong(date)}; ${gregLong(greg)}${hs.length ? "; " + hs.map((h) => h.en).join(", ") : ""}${fo ? "; " + fo.fast.en : ""}`;
      html += `<button type="button" role="gridcell" class="${cls.join(" ")}" data-jdn="${jdn}" tabindex="${jdn === selJdn ? 0 : -1}" aria-label="${esc(aria)}" aria-selected="${jdn === selJdn}">
        <span class="n">${esc(n(date.day))}</span>
        <span class="g">${esc(gLabel)}</span>
        ${hs.length ? `<span class="h ${hc}">${esc(hText)}</span>` : ""}
        ${saint ? `<span class="h saint">${esc(state.lang === "am" ? saint.am : saint.en.replace(/ \(.*\)$/, ""))}</span>` : ""}
      </button>`;
    });
    html += "</div>";
  });
  html += "</div>";
  html += legend();

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
        const hs = (hol.get(jdn) || []).filter(shown);
        const hk = hs.length ? holClass(hs) : "";
        const base = cell.outside ? "o" : jdn === todayJdn ? "t" : hk === "pub" ? "hd" : hk === "obs-only" ? "ho" : c === 6 ? "su" : "";
        const cls = cell.outside ? base : `${base} ${fastClass(cell.date)}`.trim();
        html += `<span class="${cls}">${cell.outside ? "" : esc(n(cell.date.day))}</span>`;
      });
    }
    html += "</div></button>";
  }
  html += "</div>";
  html += legend();
  $("view").innerHTML = html;
}

function legend() {
  const on = state.fasts === "on";
  return `<div class="legend">
    <span><i class="lg-hol"></i>Public holiday</span>
    <span><i class="lg-obs"></i>Feast / observance</span>
    ${on ? `<span><i class="lg-fast"></i>Fasting season</span><span><i class="lg-weekly"></i>Wed &amp; Fri fast</span>` : ""}
    <span class="toggles">
      <label class="switch"><input type="checkbox" id="saints-toggle"${state.saints === "on" ? " checked" : ""} /> Show saints' days</label>
      <label class="switch"><input type="checkbox" id="fasts-toggle"${on ? " checked" : ""} /> Show fasts</label>
    </span>
  </div>`;
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
    ["Fasting", fastingFact(d)],
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
    ${hs.map(holidayCard).join("")}
    <dl class="facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
    ${monthlyBlock(d)}`;
}

function holidayCard(h) {
  const kind = h.kind === "public" ? "Public holiday" : "Not a day off";
  const extra = [
    h.estimated ? (h.group === "islamic" ? "Estimated — set by moon sighting, may differ by a day" : "Approximate date") : "",
    h.note || "",
  ].filter(Boolean);
  return `<div class="hol ${h.kind}">
    <b>${esc(holidayLabel(h))}${h.estimated ? " ≈" : ""}</b>
    <span class="hol-meta">${esc(groupName(h.group))} · ${esc(kind)}</span>
    ${extra.map((t) => `<span class="hol-note">${esc(t)}</span>`).join("")}
  </div>`;
}

/** The day's monthly commemorations (ወርኃዊ በዓላት), principal first. */
function monthlyBlock(d) {
  const list = monthlyFeast(d);
  if (!list.length) return "";
  const name = (m) => (state.lang === "am" ? `<span lang="am">${esc(m.am)}</span> <span class="muted">· ${esc(m.en)}</span>` : esc(m.en));
  return `<div class="monthly">
    <h4>${state.lang === "am" ? "ወርኃዊ በዓል" : "Monthly commemoration"} · ${esc(n(d.day))}</h4>
    <ul>${list.map((m, i) => `<li${i === 0 ? ' class="main"' : ""}>${name(m)}</li>`).join("")}</ul>
  </div>`;
}

function fastingFact(d) {
  const fo = fastOn(d);
  if (!fo) return '<span class="muted">No fast</span>';
  const name = state.lang === "am" ? `<span lang="am">${esc(fo.fast.am)}</span>` : esc(fo.fast.en);
  if (fo.dayNumber == null) return `<span class="fast-chip weekly">${name}</span>`;
  return `<span class="fast-chip">${name}</span><br><span class="muted">day ${esc(n(fo.dayNumber))} of ${esc(n(fo.fast.days))}</span>`;
}

function renderFasts() {
  const y = state.year;
  $("fast-h").textContent = `Fasting seasons · ${n(y)}`;
  const todayJdn = today.toJdn();
  $("fasts").innerHTML = fastsFor(y)
    .map((f) => {
      const s = f.start.toJdn();
      const e = f.end.toJdn();
      const status = todayJdn > e ? " past" : todayJdn >= s ? " now" : "";
      const range = f.days === 1
        ? `${monthName(f.start.month, state.lang)} ${n(f.start.day)}`
        : `${monthName(f.start.month, state.lang)} ${n(f.start.day)} – ${f.end.month === f.start.month ? "" : monthName(f.end.month, state.lang) + " "}${n(f.end.day)}`;
      const g1 = f.start.toGregorian();
      const g2 = f.end.toGregorian();
      const gRange = f.days === 1
        ? `${GREG_MONTHS[g1.month - 1].slice(0, 3)} ${g1.day}`
        : `${GREG_MONTHS[g1.month - 1].slice(0, 3)} ${g1.day} – ${GREG_MONTHS[g2.month - 1].slice(0, 3)} ${g2.day}`;
      return `<li class="${status.trim()}">
        <button type="button" data-jdn="${s}">
          <span class="bar"></span>
          <span class="fname">${state.lang === "am" ? `<span lang="am">${esc(f.am)}</span>` : esc(f.en)}${status === " now" ? ' <span class="now-tag">now</span>' : ""}
            <span class="when">${esc(range)} · ${esc(gRange)}</span></span>
          <span class="len">${esc(n(f.days))}${f.days === 1 ? " day" : " days"}</span>
        </button></li>`;
    })
    .join("");
}

function renderHolidays() {
  const y = state.year;
  const all = holidaysFor(y);
  const list = all.filter(shown);
  $("hol-h").textContent = `Holidays · ${n(y)}`;
  const chips = [
    { key: "all", label: state.lang === "am" ? "ሁሉም" : "All" },
    { key: "public", label: state.lang === "am" ? "የሕዝብ በዓል" : "Public" },
    ...GROUPS.map((g) => ({ key: g.key, label: groupName(g.key) })),
  ];
  $("hol-filter").innerHTML = chips
    .map((c) => {
      const count = c.key === "all" ? all.length : all.filter((h) => (c.key === "public" ? h.kind === "public" : h.group === c.key)).length;
      return `<button type="button" data-hol-filter="${c.key}" aria-pressed="${state.holFilter === c.key}">${esc(c.label)} <span>${esc(n(count))}</span></button>`;
    })
    .join("");

  const todayJdn = today.toJdn();
  let html = "";
  let month = 0;
  for (const h of list) {
    if (h.date.month !== month) {
      month = h.date.month;
      html += `<li class="mhead">${esc(monthName(month, state.lang))}</li>`;
    }
    const past = h.date.toJdn() < todayJdn;
    const g = h.date.toGregorian();
    html += `<li class="${h.kind}${past ? " past" : ""}">
        <button type="button" data-jdn="${h.date.toJdn()}">
          <span class="dot"></span>
          <span class="hname"><span>${state.lang === "am" ? `<span lang="am">${esc(h.am)}</span>` : esc(h.en)}${h.estimated ? ' <span class="est" title="Estimated date">≈</span>' : ""}</span>
            <span class="tag">${esc(groupName(h.group))}${h.kind === "public" ? " · " + (state.lang === "am" ? "የሕዝብ በዓል" : "public") : ""}</span></span>
          <span class="when">${esc(n(h.date.day))} · ${GREG_MONTHS[g.month - 1].slice(0, 3)} ${g.day}</span>
        </button></li>`;
  }
  $("holidays").innerHTML = html || `<li class="empty">None this year.</li>`;
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
  slide(delta);
}

/** Slide the freshly rendered month/year in from the side it came from. */
function slide(delta) {
  const el = $("view").firstElementChild;
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.classList.remove("slide-next", "slide-prev");
  void el.offsetWidth; // restart the animation
  el.classList.add(delta > 0 ? "slide-next" : "slide-prev");
}

// --- swipe left/right on the calendar to change month (or year) -------------------------
(() => {
  const view = $("view");
  let x0 = 0, y0 = 0, t0 = 0, tracking = false;
  view.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true;
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
    t0 = Date.now();
  }, { passive: true });
  view.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    // A quick, mostly horizontal flick; vertical drags keep scrolling the page.
    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy) && Date.now() - t0 < 800) {
      go(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
})();

// --- month / year picker (tap the title) -------------------------------------------------
const jump = { year: state.year };
function renderJump() {
  $("jump-h").textContent = state.lang === "am" ? "ወደ ቀን ሂድ" : "Go to";
  $("jump-year").value = jump.year;
  $("jump-months").innerHTML = MONTHS.map((m, i) => {
    const month = i + 1;
    const cur = state.view === "month" && jump.year === state.year && month === state.month;
    const isToday = jump.year === today.year && month === today.month;
    const label = state.lang === "am" ? m.am : m.en;
    const sub = state.lang === "am" ? m.en : m.am;
    return `<button type="button" data-jm="${month}" class="${cur ? "current" : ""}${isToday ? " has-today" : ""}"${cur ? ' aria-current="true"' : ""}>
      <b>${esc(label)}</b><span>${esc(sub)}</span></button>`;
  }).join("");
}
function openJump() {
  jump.year = state.year;
  renderJump();
  $("jump").showModal();
  const cur = $("jump-months").querySelector(".current") || $("jump-months").firstElementChild;
  if (cur) cur.focus();
}
function closeJump() { $("jump").close(); }
function jumpTo(year, month) {
  const before = state.year * 13 + state.month;
  state.year = year;
  state.month = month;
  state.view = "month";
  savePref("view", "month");
  closeJump();
  render();
  const after = state.year * 13 + state.month;
  if (after !== before) slide(after - before);
}
$("title-btn").addEventListener("click", openJump);
$("jump-close").addEventListener("click", closeJump);
$("jump-prev-year").addEventListener("click", () => { jump.year -= 1; renderJump(); });
$("jump-next-year").addEventListener("click", () => { jump.year += 1; renderJump(); });
$("jump-year").addEventListener("change", (e) => {
  const y = parseInt(e.target.value, 10);
  if (Number.isInteger(y) && y > 0 && y < 10000) { jump.year = y; renderJump(); }
  else e.target.value = jump.year;
});
$("jump-months").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-jm]");
  if (b) jumpTo(jump.year, Number(b.dataset.jm));
});
$("jump-today").addEventListener("click", () => { closeJump(); select(today); });
// Tapping the dimmed backdrop (outside the panel) closes the picker.
$("jump").addEventListener("click", (e) => { if (e.target === $("jump")) closeJump(); });

// --- events ---------------------------------------------------------------------------
document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.lang) { state.lang = t.dataset.lang; savePref("lang", state.lang); render(); syncConverter(state.selected); return; }
  if (t.dataset.num) { state.numerals = t.dataset.num; savePref("num", state.numerals); render(); syncConverter(state.selected); return; }
  if (t.dataset.holFilter) { state.holFilter = t.dataset.holFilter; savePref("holFilter", state.holFilter); render(); return; }
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

document.addEventListener("change", (e) => {
  if (e.target.id === "saints-toggle") {
    state.saints = e.target.checked ? "on" : "off";
    savePref("saints", state.saints);
    render();
  }
  if (e.target.id === "fasts-toggle") {
    state.fasts = e.target.checked ? "on" : "off";
    savePref("fasts", state.fasts);
    render();
  }
});

$("conv-greg").addEventListener("input", convertFromGregorian);
for (const id of ["conv-eth-year", "conv-eth-month", "conv-eth-day"]) {
  $(id).addEventListener("input", convertFromEthiopian);
}

document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, select, textarea, dialog") || e.metaKey || e.ctrlKey || e.altKey) return;
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

// --- install as an app (PWA) ------------------------------------------------------------
// The service worker makes the calendar work offline; the Install button uses the
// browser's install prompt where it exists (Android/desktop Chrome, Edge) and shows
// Add-to-Home-Screen steps on iPhone/iPad, where Safari has no prompt.
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(() => { /* offline support unavailable */ });
}

let installPrompt = null;
const installBtn = $("install-btn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  if (!isStandalone()) installBtn.hidden = false;
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installBtn.hidden = true;
});
if (isIos && !isStandalone()) installBtn.hidden = false;
installBtn.addEventListener("click", async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    installBtn.hidden = true;
  } else if (isIos) {
    $("ios-install").showModal();
  }
});

render();
syncConverter(state.selected);
