/**
 * Ge'ez (Ethiopic) numerals — deterministic, bidirectional conversion between
 * Arabic integers and Ge'ez numeral strings, plus Arabic-default money.
 *
 * Layer 0: pure integer/string arithmetic. No calendar dependency, no model
 * calls, no network, no dependence on locale, timezone, or clock (Principle VIII).
 *
 * The system has no zero, no sign, and no fraction (Constitution Principle VII):
 * `toGeez(0)`, negatives, and non-integers all raise — never ፩, never "".
 * Money defaults to Arabic numerals.
 *
 * Range and form (settled in specs/003-geez-numerals): supports 1–99,999,999
 * (single-level ፼ myriad grouping — ፼ is never stacked in v1). Rendering is
 * canonical (leading-1 omission: 100 → ፻, 10,000 → ፼) so every integer has one
 * representation; parsing accepts ONLY that canonical form (strict bijection).
 * Conformance values live only in the external tests/vectors/numerals.json
 * (Principle I); nothing here asserts a numeral value.
 */

/** Largest value v1 renders/parses (single-level ፼). */
export const GEEZ_MAX = 99_999_999;

// Ge'ez numeral inventory (Unicode U+1369–U+137C). Index 0 is the empty string
// so a zero digit contributes nothing — there is no zero glyph.
const UNITS = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"]; // U+1369–U+1371
const TENS = ["", "፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"]; // U+1372–U+137A
const HUNDRED = "፻"; // U+137B
const MYRIAD = "፼"; // U+137C

/** Reason codes carried by every GeezNumeralError. */
export type GeezNumeralReason =
  | "zero"
  | "negative"
  | "non_integer"
  | "out_of_range"
  | "empty"
  | "invalid_char"
  | "non_canonical";

/** The single typed error the numeral surface raises. */
export class GeezNumeralError extends RangeError {
  readonly reason: GeezNumeralReason;
  constructor(reason: GeezNumeralReason, message: string) {
    super(message);
    this.name = "GeezNumeralError";
    this.reason = reason;
  }
}

// --- rendering -------------------------------------------------------------

/** A value 0–99 → tens glyph + units glyph, each omitted when its digit is 0. */
function tensUnits(v: number): string {
  return TENS[Math.floor(v / 10)]! + UNITS[v % 10]!;
}

/** A group value 1–9999 → hundreds cell (with ፻, leading-1 omitted) + trailing 0–99. */
function sub(x: number): string {
  const h = Math.floor(x / 100);
  const r = x % 100;
  let out = "";
  if (h > 0) out += (h === 1 ? "" : tensUnits(h)) + HUNDRED;
  if (r > 0) out += tensUnits(r);
  return out;
}

/** Validate that `n` is an in-domain positive integer (Principle VII). */
function requireDomain(n: number): void {
  if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n)) {
    throw new GeezNumeralError("non_integer", `expected an integer, got ${String(n)}`);
  }
  if (n === 0) throw new GeezNumeralError("zero", "Ge'ez has no zero; 0 is out of domain");
  if (n < 0) throw new GeezNumeralError("negative", `Ge'ez has no negatives; got ${n}`);
  if (n > GEEZ_MAX) {
    throw new GeezNumeralError("out_of_range", `above the supported maximum ${GEEZ_MAX}; got ${n}`);
  }
}

/**
 * Render integer `n` (1–99,999,999) as its canonical Ge'ez numeral string.
 * Because n ≤ 99,999,999 it is exactly two myriad groups: high = n // 10000,
 * low = n % 10000. Throws GeezNumeralError for 0/negative/non-integer/over-range.
 */
export function toGeez(n: number): string {
  requireDomain(n);
  const high = Math.floor(n / 10000);
  const low = n % 10000;
  let out = "";
  if (high > 0) out += (high === 1 ? "" : sub(high)) + MYRIAD;
  if (low > 0) out += sub(low);
  return out;
}

// --- parsing (canonical-only, strict inverse) ------------------------------

const UNIT_OF = new Map<string, number>(
  UNITS.map((g, i): [string, number] => [g, i]).filter(([g]) => g !== ""),
);
const TEN_OF = new Map<string, number>(
  TENS.map((g, i): [string, number] => [g, i]).filter(([g]) => g !== ""),
);
const INVENTORY = new Set<string>([...UNITS.slice(1), ...TENS.slice(1), HUNDRED, MYRIAD]);

/** Parse a 1–99 tens/units run; throws non_canonical on any anomaly. */
function parseTensUnits(t: string): number {
  const chars = [...t];
  let i = 0;
  let tens = 0;
  let units = 0;
  if (i < chars.length && TEN_OF.has(chars[i]!)) {
    tens = TEN_OF.get(chars[i]!)!;
    i++;
  }
  if (i < chars.length && UNIT_OF.has(chars[i]!)) {
    units = UNIT_OF.get(chars[i]!)!;
    i++;
  }
  if (i !== chars.length || (tens === 0 && units === 0)) {
    throw new GeezNumeralError("non_canonical", `not a canonical tens/units run: ${t}`);
  }
  return tens * 10 + units;
}

/** Parse a 1–9999 group (optional hundreds cell via ፻); throws non_canonical. */
function parseSub(t: string): number {
  const idx = t.indexOf(HUNDRED);
  if (idx === -1) return parseTensUnits(t);
  if (t.indexOf(HUNDRED, idx + 1) !== -1) {
    throw new GeezNumeralError("non_canonical", `more than one ${HUNDRED} in a group`);
  }
  const hPart = t.slice(0, idx);
  const rPart = t.slice(idx + HUNDRED.length);
  const h = hPart === "" ? 1 : parseTensUnits(hPart);
  const r = rPart === "" ? 0 : parseTensUnits(rPart);
  return h * 100 + r;
}

/**
 * Parse a canonical Ge'ez numeral string to its integer value. Accepts ONLY the
 * exact output of `toGeez` (strict bijection). Rejects empty/whitespace,
 * non-inventory characters, non-canonical spellings (e.g. ፩፻), and anything
 * implying a value above 99,999,999.
 */
export function fromGeez(s: string): number {
  if (typeof s !== "string") {
    throw new GeezNumeralError("invalid_char", "expected a string");
  }
  if (s.length === 0 || s.trim().length === 0) {
    throw new GeezNumeralError("empty", "empty numeral string");
  }
  for (const ch of s) {
    if (!INVENTORY.has(ch)) {
      throw new GeezNumeralError("invalid_char", `not a Ge'ez numeral character: ${JSON.stringify(ch)}`);
    }
  }
  const parts = s.split(MYRIAD);
  if (parts.length > 2) {
    // More than one ፼ implies ≥ 10^8 (stacking) — above the v1 domain.
    throw new GeezNumeralError("out_of_range", "ten-thousand stacking is above the supported maximum");
  }
  let value: number;
  if (parts.length === 2) {
    const [highPart, lowPart] = parts as [string, string];
    const high = highPart === "" ? 1 : parseSub(highPart);
    const low = lowPart === "" ? 0 : parseSub(lowPart);
    value = high * 10000 + low;
  } else {
    value = parseSub(s);
  }
  // Canonical guard: only the renderer's own output is accepted.
  if (value < 1 || value > GEEZ_MAX || toGeez(value) !== s) {
    throw new GeezNumeralError("non_canonical", "not the canonical rendering of an in-range integer");
  }
  return value;
}

// --- money -----------------------------------------------------------------

export interface MoneyOptions {
  /** "arabic" (default) or "geez" for the whole-number part. */
  numerals?: "arabic" | "geez";
  /** Fractional digit count (default 2), always rendered in Arabic. */
  fractionDigits?: number;
}

/**
 * Round a non-negative magnitude to `fractionDigits` decimals with ROUND_HALF_UP,
 * operating on the shortest decimal string `String(magnitude)`. This matches
 * Python's `Decimal(str(amount)).quantize(..., ROUND_HALF_UP)` byte-for-byte
 * (both languages emit the same shortest round-trip repr, and half-up depends
 * only on the first discarded digit: >= 5 rounds up). Values that stringify in
 * exponential form (|x| < 1e-6 or >= 1e21 — outside the money domain) fall back
 * to `toFixed`, where cross-language identity is not guaranteed.
 */
function roundHalfUpFixed(magnitude: number, fractionDigits: number): string {
  const s = String(magnitude);
  if (s.includes("e") || s.includes("E")) return magnitude.toFixed(fractionDigits);
  const dot = s.indexOf(".");
  const intPart = dot === -1 ? s : s.slice(0, dot);
  const fracPart = dot === -1 ? "" : s.slice(dot + 1);
  const keep = fracPart.slice(0, fractionDigits).padEnd(fractionDigits, "0");
  let combined = intPart + keep; // the value scaled by 10^fractionDigits, truncated
  const roundDigit = fracPart.length > fractionDigits ? fracPart.charCodeAt(fractionDigits) - 48 : 0;
  if (roundDigit >= 5) combined = (BigInt(combined) + 1n).toString();
  if (fractionDigits === 0) return combined;
  combined = combined.padStart(fractionDigits + 1, "0");
  const cut = combined.length - fractionDigits;
  return combined.slice(0, cut) + "." + combined.slice(cut);
}

/**
 * Format a monetary `amount`. Defaults to Arabic numerals (Principle VII). In
 * "geez" mode only the whole-number part is rendered in Ge'ez (via toGeez);
 * fractional digits stay Arabic and a zero whole part stays Arabic "0". No
 * thousands grouping; negatives get an ASCII "-"; deterministic and locale-free.
 * Rounding is ROUND_HALF_UP on the decimal value, identical to the Python
 * implementation (see roundHalfUpFixed).
 */
export function formatMoney(amount: number, options: MoneyOptions = {}): string {
  const numerals = options.numerals ?? "arabic";
  const fractionDigits = options.fractionDigits ?? 2;
  if (numerals !== "arabic" && numerals !== "geez") {
    throw new GeezNumeralError("invalid_char", `unknown numerals option: ${String(numerals)}`);
  }
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new GeezNumeralError("non_integer", `amount must be a finite number, got ${String(amount)}`);
  }
  if (!Number.isInteger(fractionDigits)) {
    throw new GeezNumeralError("non_integer", `fractionDigits must be an integer, got ${String(fractionDigits)}`);
  }
  if (fractionDigits < 0 || fractionDigits > 100) {
    throw new GeezNumeralError("out_of_range", `fractionDigits must be in 0..100, got ${fractionDigits}`);
  }
  const fixed = roundHalfUpFixed(Math.abs(amount), fractionDigits);
  const dot = fixed.indexOf(".");
  const wholeStr = dot === -1 ? fixed : fixed.slice(0, dot);
  const fracStr = dot === -1 ? "" : fixed.slice(dot); // includes the "."
  const whole = Number(wholeStr);
  // Sign comes from the ROUNDED magnitude: an amount that rounds to zero is not
  // negative, so a tiny -0.001 formats as "0.00", never "-0.00".
  const sign = amount < 0 && Number(fixed) !== 0 ? "-" : "";
  const renderedWhole = numerals === "geez" && whole > 0 ? toGeez(whole) : wholeStr;
  return sign + renderedWhole + fracStr;
}
