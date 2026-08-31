// Ethiopic Ledger — DOM wiring. All Layer-0 behaviour comes from the package via the
// pure helpers; this file only renders state and surfaces primitive errors (FR-007).
import { EthiopianDate, Language, FoldScheme } from "../lib/index.js";
import {
  seedEntries,
  entryFromEthiopian,
  entryFromGregorian,
  fiscalTags,
  ageEntry,
  groupByPeriod,
} from "./ledger.js";
import { findSpans } from "./search.js";
import { renderCount, renderYear, renderMoney, gregString, messageFor } from "./format.js";

const $ = (id) => document.getElementById(id);

// --- state ---------------------------------------------------------------
const state = {
  entries: seedEntries(),
  mode: "arabic", // or "geez"
  search: { query: "", language: Language.AMHARIC, scheme: FoldScheme.HSL, acknowledgeLossy: false },
  asOf: todayEthiopian(),
};

function todayEthiopian() {
  // Clock used ONLY for an editable default (Principle VIII) — never in a stored result.
  const n = new Date();
  return EthiopianDate.fromGregorian({ year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() });
}

// --- helpers -------------------------------------------------------------
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

/** Build HTML for a description with <mark> around each raw [start,end) code-point span. */
function highlight(description, spans) {
  const cps = Array.from(description);
  if (!spans || spans.length === 0) return esc(description);
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  let out = "";
  let i = 0;
  for (const [start, end] of sorted) {
    if (start < i) continue; // skip overlaps defensively
    out += esc(cps.slice(i, start).join(""));
    out += "<mark>" + esc(cps.slice(start, end).join("")) + "</mark>";
    i = end;
  }
  out += esc(cps.slice(i).join(""));
  return out;
}

function ethString(d) {
  const mm = String(d.month).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  const pag = d.month === 13 ? ' <span class="tag pagume">Pagumē</span>' : "";
  return `${d.year}-${mm}-${dd}${pag}`;
}

// --- render --------------------------------------------------------------
function render() {
  renderLedger();
  renderAging();
}

function renderLedger() {
  const { query } = state.search;
  const searchActive = query.trim().length > 0;
  const msgEl = $("search-msg");
  msgEl.textContent = "";
  msgEl.className = "msg";

  if (searchActive && state.search.language === Language.GE_EZ) {
    msgEl.textContent = "Ge'ez does not fold — exact (unfolded) matching only.";
  }

  // Compute matches; a guarded fold (e.g. unacknowledged Tigrinya) throws — surface it.
  let rows = state.entries.map((e) => ({ e, spans: [] }));
  if (searchActive) {
    try {
      rows = state.entries
        .map((e) => ({ e, spans: findSpans(e.description, query.trim(), state.search) }))
        .filter((r) => r.spans.length > 0);
    } catch (err) {
      msgEl.textContent = messageFor(err);
      msgEl.className = "msg err";
      rows = state.entries.map((e) => ({ e, spans: [] })); // show all, unhighlighted
    }
  }

  $("ledger-count").textContent = `(${renderCount(rows.length, state.mode)} of ${renderCount(state.entries.length, state.mode)})`;

  const container = $("ledger");
  if (rows.length === 0) {
    container.innerHTML = `<p class="empty">${searchActive ? "No matching entries." : "The ledger is empty."}</p>`;
    return;
  }

  const groups = groupByPeriod(rows.map((r) => r.e));
  const spanFor = new Map(rows.map((r) => [r.e.id, r.spans]));

  container.innerHTML = groups
    .map((g) => {
      const items = g.entries
        .map((e) => {
          const t = fiscalTags(e);
          const greg = gregString(e.date.toGregorian());
          return `<tr>
            <td class="mono">${ethString(e.date)}</td>
            <td class="mono greg">${esc(greg)}</td>
            <td class="desc">${highlight(e.description, spanFor.get(e.id))}</td>
            <td class="amt mono">${esc(renderMoney(e.amount))}</td>
            <td class="tags">FY ${esc(renderYear(t.year, state.mode))} · Q${t.quarter}</td>
            <td><button data-remove="${e.id}" type="button" class="link" aria-label="remove">✕</button></td>
          </tr>`;
        })
        .join("");
      return `<div class="group">
        <h3>Period ${g.period}${g.period === 13 ? " — Pagumē" : ""} <span class="count">${renderCount(g.entries.length, state.mode)}</span></h3>
        <table><thead><tr><th>Ethiopian</th><th>Gregorian</th><th>Description</th><th>Amount</th><th>Fiscal</th><th></th></tr></thead>
        <tbody>${items}</tbody></table>
      </div>`;
    })
    .join("");
}

function renderAging() {
  const errEl = $("aging-error");
  errEl.textContent = "";
  const container = $("aging");
  const rows = state.entries.map((e) => {
    try {
      const a = ageEntry(e, state.asOf);
      return `<tr><td class="mono">${ethString(e.date)}</td><td class="desc">${esc(shortDesc(e.description))}</td>
        <td class="mono">${a.days}</td><td><span class="tag bucket">${esc(a.label)}</span></td></tr>`;
    } catch (err) {
      // Backwards aging (as-of before the entry) — surface, never a silent bucket.
      return `<tr><td class="mono">${ethString(e.date)}</td><td class="desc">${esc(shortDesc(e.description))}</td>
        <td colspan="2" class="err">${esc(messageFor(err))}</td></tr>`;
    }
  });
  container.innerHTML = `<table><thead><tr><th>Ethiopian</th><th>Description</th><th>Days</th><th>Bucket</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function shortDesc(s) {
  const cps = Array.from(s);
  return cps.length > 40 ? cps.slice(0, 40).join("") + "…" : s;
}

// --- events --------------------------------------------------------------
function wire() {
  $("numerals-toggle").addEventListener("change", (e) => {
    state.mode = e.target.checked ? "geez" : "arabic";
    render();
  });

  $("reset-btn").addEventListener("click", () => {
    state.entries = seedEntries();
    render();
  });

  $("add-btn").addEventListener("click", () => {
    const errEl = $("add-error");
    errEl.textContent = "";
    const y = Number($("in-year").value);
    const m = Number($("in-month").value);
    const d = Number($("in-day").value);
    const desc = $("in-desc").value.trim();
    const amount = Number($("in-amount").value);
    try {
      const entry =
        $("cal-mode").value === "gregorian"
          ? entryFromGregorian(y, m, d, desc || "(no description)", isFinite(amount) ? amount : 0)
          : entryFromEthiopian(y, m, d, desc || "(no description)", isFinite(amount) ? amount : 0);
      state.entries = [...state.entries, entry];
      $("in-desc").value = "";
      $("in-amount").value = "";
      render();
    } catch (err) {
      errEl.textContent = messageFor(err); // primitive's error, surfaced (FR-007)
    }
  });

  $("q").addEventListener("input", (e) => {
    state.search.query = e.target.value;
    renderLedger();
  });
  $("lang").addEventListener("change", (e) => {
    state.search.language = e.target.value;
    renderLedger();
  });
  $("scheme").addEventListener("change", (e) => {
    state.search.scheme = e.target.value;
    renderLedger();
  });
  $("ack").addEventListener("change", (e) => {
    state.search.acknowledgeLossy = e.target.checked;
    renderLedger();
  });

  for (const id of ["asof-year", "asof-month", "asof-day"]) {
    $(id).addEventListener("input", () => {
      const y = Number($("asof-year").value);
      const m = Number($("asof-month").value);
      const d = Number($("asof-day").value);
      try {
        state.asOf = new EthiopianDate(y, m, d);
        $("aging-error").textContent = "";
        renderAging();
      } catch (err) {
        $("aging-error").textContent = messageFor(err);
      }
    });
  }

  // Remove buttons (event delegation on the ledger).
  $("ledger").addEventListener("click", (e) => {
    const id = e.target && e.target.getAttribute && e.target.getAttribute("data-remove");
    if (id) {
      state.entries = state.entries.filter((x) => String(x.id) !== id);
      render();
    }
  });
}

// --- init ----------------------------------------------------------------
function init() {
  const t = todayEthiopian();
  $("in-year").value = t.year;
  $("in-month").value = t.month;
  $("in-day").value = t.day;
  $("asof-year").value = state.asOf.year;
  $("asof-month").value = state.asOf.month;
  $("asof-day").value = state.asOf.day;
  wire();
  render();
}

init();
