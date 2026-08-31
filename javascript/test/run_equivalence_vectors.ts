/**
 * Folding conformance runner (JS). Consumes the externally authored
 * `tests/vectors/folding.json` (Principle I — the fixture, never the agent, owns
 * class membership and folded values). If the fixture is absent it SKIPs cleanly
 * with exit 0, so the build stays green until the fixture arrives.
 *
 * The schema below is the anticipated shape from specs/004-script-equivalence/data-model.md.
 * If the fixture author lands a different schema, align this runner to it — but
 * never author expected values here.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { fold, equal, EquivalenceError } from "../src/index.ts";
import type { Language, FoldScheme } from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const PATH = resolve(here, "..", "..", "tests", "vectors", "folding.json");

interface FoldingVector {
  kind: string; // "fold" | "equal" | "error"
  input: Record<string, unknown>;
  expected: unknown;
  gating?: boolean;
}

function check(v: FoldingVector): boolean {
  const inp = v.input;
  switch (v.kind) {
    case "fold": {
      const r = fold(
        inp.text as string,
        inp.language as Language,
        inp.scheme as FoldScheme,
        { acknowledgeLossy: inp.acknowledgeLossy === true },
      );
      const exp = v.expected as { folded?: string; offsets?: number[] };
      return (
        (exp.folded === undefined || r.folded === exp.folded) &&
        (exp.offsets === undefined || JSON.stringify(r.offsets) === JSON.stringify(exp.offsets))
      );
    }
    case "equal":
      return equal(inp.a as string, inp.b as string, inp.language as Language) === v.expected;
    case "error": {
      const exp = v.expected as { reason: string };
      try {
        if (inp.op === "equal") equal(inp.a as string, inp.b as string, inp.language as Language);
        else fold(inp.text as string, inp.language as Language, inp.scheme as FoldScheme, { acknowledgeLossy: inp.acknowledgeLossy === true });
        return false; // expected an error, got none
      } catch (e) {
        return e instanceof EquivalenceError && e.reason === exp.reason;
      }
    }
    default:
      throw new Error(`unknown folding vector kind: ${v.kind}`);
  }
}

function main(): number {
  if (!existsSync(PATH)) {
    console.log("JS folding conformance: SKIP (no tests/vectors/folding.json yet)");
    return 0;
  }
  const doc = JSON.parse(readFileSync(PATH, "utf8")) as { vectors: FoldingVector[] };
  let gating = 0;
  const failures: FoldingVector[] = [];
  for (const v of doc.vectors) {
    if (v.gating) gating++;
    if (v.gating && !check(v)) failures.push(v);
  }
  console.log(`JS folding conformance: ${doc.vectors.length} vectors (${gating} gating), ${failures.length} gating failures`);
  for (const v of failures.slice(0, 8)) console.log(`   GATING ${v.kind} input=${JSON.stringify(v.input)}`);
  if (failures.length > 0) {
    console.log("::error::Principle I/X — folding gating vectors must pass");
    return 1;
  }
  console.log("JS folding conformance: PASS");
  return 0;
}

process.exit(main());
