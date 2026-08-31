/**
 * Ge'ez-script equivalence & folding — per-language, deterministic, Layer 0.
 *
 * Honors Constitution Principles IV and V:
 *  - Language is MANDATORY and explicit — no default, no inference, no "auto".
 *    `GE_EZ` raises on any fold (all Ge'ez characters are phonemically distinct);
 *    `TIGRINYA` raises on a fold unless the caller passes an explicit lossy
 *    acknowledgement.
 *  - Folding returns a PARALLEL representation plus a per-position offset map back
 *    to the original — never a bare replacement string — and never mutates the
 *    input. Every folded result records its scheme (`H_ONLY`/`HSL`); there is no
 *    DEFAULT. Comparing keys across schemes is surfaced as `scheme_mismatch`.
 *
 * Folding is length-preserving 1:1 (each input character maps to one folded
 * character), so the offset map is the identity in v1. Class membership is owned
 * by the external tests/vectors/folding.json (Principle I); this module contains
 * only the machinery and the provenance-derived class tables.
 */

import { classMap } from "./equivalence-classes.ts";

export const Language = {
  AMHARIC: "AMHARIC",
  TIGRINYA: "TIGRINYA",
  GE_EZ: "GE_EZ",
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export const FoldScheme = {
  H_ONLY: "H_ONLY",
  HSL: "HSL",
} as const;
export type FoldScheme = (typeof FoldScheme)[keyof typeof FoldScheme];

export type EquivalenceReason =
  | "missing_language"
  | "unknown_language"
  | "missing_scheme"
  | "unknown_scheme"
  | "geez_not_foldable"
  | "tigrinya_requires_ack"
  | "scheme_mismatch";

export class EquivalenceError extends Error {
  readonly reason: EquivalenceReason;
  constructor(reason: EquivalenceReason, message: string) {
    super(message);
    this.name = "EquivalenceError";
    this.reason = reason;
  }
}

export interface FoldResult {
  /** The folded representation (same code-point count as the input). */
  folded: string;
  /** Per-position map: offsets[i] is the source index of folded character i (identity in v1). */
  offsets: number[];
  /** The scheme that produced this result (never defaulted). */
  scheme: FoldScheme;
  /** The language it was folded under. */
  language: Language;
}

export interface FoldOptions {
  /** Required for TIGRINYA folds — acknowledges the lossy glottal collapse. */
  acknowledgeLossy?: boolean;
}

const KNOWN_LANGUAGES = new Set<string>(Object.values(Language));
const KNOWN_SCHEMES = new Set<string>(Object.values(FoldScheme));

function requireLanguage(language: Language): void {
  if (language === undefined || language === null) {
    throw new EquivalenceError("missing_language", "language is required — no default, no inference (Principle IV)");
  }
  if (!KNOWN_LANGUAGES.has(language)) {
    throw new EquivalenceError("unknown_language", `unknown language: ${JSON.stringify(language)}`);
  }
}

function requireScheme(scheme: FoldScheme): void {
  if (scheme === undefined || scheme === null) {
    throw new EquivalenceError("missing_scheme", "scheme is required — there is no DEFAULT (Principle V)");
  }
  if (!KNOWN_SCHEMES.has(scheme)) {
    throw new EquivalenceError("unknown_scheme", `unknown scheme: ${JSON.stringify(scheme)}`);
  }
}

/**
 * Fold `text` under an explicit `language` and `scheme`. Length-preserving 1:1.
 * Raises for a missing/unknown language or scheme, for `GE_EZ` (never folds), and
 * for `TIGRINYA` unless `options.acknowledgeLossy` is true. The input is not mutated.
 */
export function fold(
  text: string,
  language: Language,
  scheme: FoldScheme,
  options: FoldOptions = {},
): FoldResult {
  requireLanguage(language);
  requireScheme(scheme);
  if (language === Language.GE_EZ) {
    throw new EquivalenceError(
      "geez_not_foldable",
      "Ge'ez characters are phonemically distinct; folding is prohibited (Principle IV)",
    );
  }
  if (language === Language.TIGRINYA && options.acknowledgeLossy !== true) {
    throw new EquivalenceError(
      "tigrinya_requires_ack",
      "Tigrinya folding is lossy (its glottal characters are distinct); pass { acknowledgeLossy: true } to proceed",
    );
  }
  const map = classMap(scheme);
  const cps = Array.from(text); // iterate by code point
  let folded = "";
  const offsets: number[] = [];
  for (let i = 0; i < cps.length; i++) {
    const ch = cps[i]!;
    const rep = map.get(ch.codePointAt(0)!);
    folded += rep === undefined ? ch : String.fromCodePoint(rep);
    offsets.push(i);
  }
  return { folded, offsets, scheme, language };
}

/**
 * Non-lossy comparison of two strings for a given language — exact code-point
 * equality, no folding and no Unicode normalization. Valid for every language,
 * including `GE_EZ`. Language is required as a Principle IV guard even though the
 * result does not depend on it.
 */
export function equal(a: string, b: string, language: Language): boolean {
  requireLanguage(language);
  return a === b;
}

/**
 * Fold both operands under one scheme and compare the folded keys. Subject to the
 * same language rules as `fold` (raises for `GE_EZ` / unacknowledged `TIGRINYA`).
 */
export function foldedEqual(
  a: string,
  b: string,
  language: Language,
  scheme: FoldScheme,
  options: FoldOptions = {},
): boolean {
  return fold(a, language, scheme, options).folded === fold(b, language, scheme, options).folded;
}

/**
 * Compare two already-folded results. Raises `scheme_mismatch` if they were folded
 * under different schemes (a cross-scheme comparison is surfaced, not silently
 * answered — Principle V / FR-008).
 */
export function keysEqual(x: FoldResult, y: FoldResult): boolean {
  if (x.scheme !== y.scheme) {
    throw new EquivalenceError(
      "scheme_mismatch",
      `cannot compare keys across schemes: ${x.scheme} vs ${y.scheme}`,
    );
  }
  return x.folded === y.folded;
}
