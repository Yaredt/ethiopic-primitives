/**
 * Shared test harness helpers. These load the read-only conformance fixture and
 * run it; they do NOT contain any hand-written conversion expectation
 * (Constitution Principle I — fixtures are authored externally, never here).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the shared vector file, the single source of truth for both languages. */
export const VECTORS_PATH = resolve(here, "..", "..", "tests", "vectors", "calendar.json");

export interface VectorSource {
  authority: string;
  ref?: string;
  verified?: string;
  result?: string;
}

export interface CalendarVector {
  ethiopic: [number, number, number];
  gregorian: [number, number, number];
  note?: string;
  gating?: boolean;
  source?: VectorSource[];
}

export interface CalendarVectorFile {
  description: string;
  epoch_jdn: number;
  leap_rule: string;
  count: number;
  vectors: CalendarVector[];
}

export function loadVectors(): CalendarVectorFile {
  return JSON.parse(readFileSync(VECTORS_PATH, "utf8")) as CalendarVectorFile;
}
