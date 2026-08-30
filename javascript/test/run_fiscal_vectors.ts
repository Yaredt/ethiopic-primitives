/**
 * Fiscal conformance runner (JS). Consumes the externally authored
 * `tests/vectors/fiscal.json` (Principle I — the fixture, never the agent, owns
 * fiscal values). If the fixture is absent it SKIPs cleanly with exit 0, so the
 * build stays green until the fixture arrives.
 *
 * The schema below is the anticipated shape from specs/002-fiscal-logic/data-model.md.
 * If the fixture author lands a different schema, align this runner to it — but
 * never author expected values here.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  EthiopianDate,
  fiscalYearFor,
  fiscalYearBounds,
  fiscalQuarter,
  fiscalPeriod,
  agingBucket,
} from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const PATH = resolve(here, "..", "..", "tests", "vectors", "fiscal.json");

interface FiscalVector {
  kind: string;
  input: unknown;
  expected: unknown;
  gating?: boolean;
}

function ed(triple: unknown): EthiopianDate {
  const [y, m, d] = triple as [number, number, number];
  return new EthiopianDate(y, m, d);
}

function check(v: FiscalVector): boolean {
  switch (v.kind) {
    case "fiscal_year":
      return fiscalYearFor(ed(v.input)) === v.expected;
    case "quarter":
      return fiscalQuarter(ed(v.input)) === v.expected;
    case "period":
      return fiscalPeriod(ed(v.input)) === v.expected;
    case "bounds": {
      const b = fiscalYearBounds(v.input as number);
      const exp = v.expected as { start: [number, number, number]; end: [number, number, number] };
      return (
        b.start.year === exp.start[0] && b.start.month === exp.start[1] && b.start.day === exp.start[2] &&
        b.end.year === exp.end[0] && b.end.month === exp.end[1] && b.end.day === exp.end[2]
      );
    }
    case "aging": {
      const inp = v.input as { invoice: [number, number, number]; as_of: [number, number, number]; buckets?: number[] };
      const a = agingBucket(ed(inp.invoice), ed(inp.as_of), inp.buckets ?? [30, 60, 90]);
      const exp = v.expected as { days?: number; bucketIndex?: number; label?: string };
      return (
        (exp.days === undefined || a.days === exp.days) &&
        (exp.bucketIndex === undefined || a.bucketIndex === exp.bucketIndex) &&
        (exp.label === undefined || a.label === exp.label)
      );
    }
    default:
      throw new Error(`unknown fiscal vector kind: ${v.kind}`);
  }
}

function main(): number {
  if (!existsSync(PATH)) {
    console.log("JS fiscal conformance: SKIP (no tests/vectors/fiscal.json yet)");
    return 0;
  }
  const doc = JSON.parse(readFileSync(PATH, "utf8")) as { vectors: FiscalVector[] };
  let gating = 0;
  const gatingFailures: FiscalVector[] = [];
  for (const v of doc.vectors) {
    if (v.gating) gating++;
    if (!check(v) && v.gating) gatingFailures.push(v);
  }
  console.log(
    `JS fiscal conformance: ${doc.vectors.length} vectors (${gating} gating), ${gatingFailures.length} gating failures`,
  );
  for (const v of gatingFailures.slice(0, 8)) {
    console.log(`   GATING ${v.kind} input=${JSON.stringify(v.input)} expected=${JSON.stringify(v.expected)}`);
  }
  if (gatingFailures.length > 0) {
    console.log("::error::Principle I/X — fiscal gating vectors must pass");
    return 1;
  }
  console.log("JS fiscal conformance: PASS");
  return 0;
}

process.exit(main());
