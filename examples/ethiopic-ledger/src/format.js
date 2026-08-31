// Display formatting helpers — every Layer-0 value comes from the package.
// Principle VII: money defaults to Arabic; to_geez is NEVER called with 0.
import { toGeez, formatMoney } from "../lib/index.js";

/** Render a non-negative integer count. Ge'ez mode uses the numeral primitive, but
 *  never for 0 — a zero count is Arabic "0" (Principle VII). */
export function renderCount(n, mode) {
  if (mode === "geez" && n > 0) return toGeez(n);
  return String(n);
}

/** Render a fiscal-year label. Ge'ez mode via the primitive; 0 would be Arabic. */
export function renderYear(y, mode) {
  if (mode === "geez" && y > 0) return toGeez(y);
  return String(y);
}

/** Format a monetary amount — Arabic by default, always (Principle VII). */
export function renderMoney(amount) {
  return formatMoney(amount);
}

/** A Gregorian {year,month,day} as an ISO-like string. */
export function gregString(g) {
  const mm = String(g.month).padStart(2, "0");
  const dd = String(g.day).padStart(2, "0");
  return `${g.year}-${mm}-${dd}`;
}

/** Map any primitive error to a clear user-facing message (never swallow it). */
export function messageFor(err) {
  if (err && typeof err.message === "string" && err.message) return err.message;
  return String(err);
}
