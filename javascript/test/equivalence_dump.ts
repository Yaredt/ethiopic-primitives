/**
 * Equivalence parity dump (JS). Reads JSON-encoded input strings (one per line) on
 * stdin and, for each, prints a token row exercising a fixed case matrix across
 * languages, schemes, and the raise/acknowledge paths. Used by
 * tools/equivalence_parity.py to compare JS against Python. Emits no authored class
 * values — only the functions' own output / error reasons (Principle I).
 *
 * The case matrix MUST stay in lock-step with tools/equivalence_parity.py.
 */

import { fold, equal, foldedEqual, Language, FoldScheme, EquivalenceError } from "../src/index.ts";

function tok(fn: () => string): string {
  try {
    return fn();
  } catch (e) {
    if (e instanceof EquivalenceError) return `E:${e.reason}`;
    throw e;
  }
}

function row(t: string): string {
  return [
    tok(() => `F:${fold(t, Language.AMHARIC, FoldScheme.H_ONLY).folded}`),
    tok(() => `F:${fold(t, Language.AMHARIC, FoldScheme.HSL).folded}`),
    tok(() => `F:${fold(t, Language.TIGRINYA, FoldScheme.HSL, { acknowledgeLossy: true }).folded}`),
    tok(() => `F:${fold(t, Language.GE_EZ, FoldScheme.H_ONLY).folded}`), // → E:geez_not_foldable
    tok(() => `F:${fold(t, Language.TIGRINYA, FoldScheme.HSL).folded}`), // → E:tigrinya_requires_ack
    tok(() => `B:${equal(t, t, Language.AMHARIC) ? 1 : 0}`),
    tok(() => `B:${foldedEqual(t, t, Language.AMHARIC, FoldScheme.HSL) ? 1 : 0}`),
    tok(() => `O:${fold(t, Language.AMHARIC, FoldScheme.H_ONLY).offsets.join(",")}`),
  ].join("|");
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
});
process.stdin.on("end", () => {
  const out: string[] = [];
  for (const line of buf.split("\n")) {
    if (line.trim() === "") continue;
    const t = JSON.parse(line) as string;
    out.push(row(t));
  }
  process.stdout.write(out.join("\n") + "\n");
});
