/**
 * Numeral parity dump (JS). Reads integers (one per line) on stdin and prints,
 * for each, `n,toGeez(n),fromGeez(toGeez(n))`. Used by tools/numerals_parity.py
 * to compare JS against Python both directions. Emits no authored values — only
 * the functions' own output (Principle I).
 */

import { toGeez, fromGeez } from "../src/index.ts";

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
});
process.stdin.on("end", () => {
  const out: string[] = [];
  for (const line of buf.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const n = Number(t);
    const g = toGeez(n);
    out.push(`${n},${g},${fromGeez(g)}`);
  }
  process.stdout.write(out.join("\n") + "\n");
});
