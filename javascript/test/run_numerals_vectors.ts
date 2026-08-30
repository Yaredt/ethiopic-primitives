/**
 * Numeral conformance runner (JS). Consumes the externally authored
 * `tests/vectors/numerals.json` (Principle I — the fixture, never the agent,
 * owns numeral values). If the fixture is absent it SKIPs cleanly with exit 0,
 * so the build stays green until the fixture arrives.
 *
 * The schema below is the anticipated shape from specs/003-geez-numerals/data-model.md.
 * If the fixture author lands a different schema, align this runner to it — but
 * never author expected values here.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { toGeez, fromGeez } from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const PATH = resolve(here, "..", "..", "tests", "vectors", "numerals.json");

interface NumeralVector {
  kind: string; // "to_geez" | "from_geez"
  input: unknown;
  expected: unknown;
  gating?: boolean;
}

function check(v: NumeralVector): boolean {
  switch (v.kind) {
    case "to_geez":
      return toGeez(v.input as number) === v.expected;
    case "from_geez":
      return fromGeez(v.input as string) === v.expected;
    default:
      throw new Error(`unknown numeral vector kind: ${v.kind}`);
  }
}

function main(): number {
  if (!existsSync(PATH)) {
    console.log("JS numeral conformance: SKIP (no tests/vectors/numerals.json yet)");
    return 0;
  }
  const doc = JSON.parse(readFileSync(PATH, "utf8")) as { vectors: NumeralVector[] };
  let gating = 0;
  const gatingFailures: NumeralVector[] = [];
  for (const v of doc.vectors) {
    if (v.gating) gating++;
    if (v.gating && !check(v)) gatingFailures.push(v);
  }
  console.log(
    `JS numeral conformance: ${doc.vectors.length} vectors (${gating} gating), ${gatingFailures.length} gating failures`,
  );
  for (const v of gatingFailures.slice(0, 8)) {
    console.log(`   GATING ${v.kind} input=${JSON.stringify(v.input)}`);
  }
  if (gatingFailures.length > 0) {
    console.log("::error::Principle I/X — numeral gating vectors must pass");
    return 1;
  }
  console.log("JS numeral conformance: PASS");
  return 0;
}

process.exit(main());
