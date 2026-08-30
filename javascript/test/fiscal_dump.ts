/**
 * Emit fiscal results as CSV for a range of Ethiopian years, for cross-language
 * parity checking (Principle X). Prints one line per date and per aging pair.
 * This asserts nothing; `tools/fiscal_parity.py` diffs this against the Python
 * output. No hand-authored fiscal value appears here.
 *
 * Usage: node --experimental-strip-types test/fiscal_dump.ts --from 1990 --to 2000
 */

import {
  EthiopianDate,
  fiscalYearFor,
  fiscalQuarter,
  fiscalPeriod,
  agingBucket,
} from "../src/index.ts";

function parseRange(argv: string[]): { lo: number; hi: number } {
  let lo = 1990;
  let hi = 2000;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from") lo = Number(argv[++i]);
    else if (argv[i] === "--to") hi = Number(argv[++i]);
  }
  return { lo, hi };
}

const { lo, hi } = parseRange(process.argv.slice(2));
const out: string[] = [];

for (let ey = lo; ey <= hi; ey++) {
  for (let em = 1; em <= 13; em++) {
    const len = EthiopianDate.daysInMonth(ey, em);
    for (let ed = 1; ed <= len; ed++) {
      const d = new EthiopianDate(ey, em, ed);
      out.push(`D,${ey},${em},${ed},${fiscalYearFor(d)},${fiscalQuarter(d)},${fiscalPeriod(d)}`);
    }
  }
  // Aging pair that crosses Pagumē: Nähase 25 of ey -> Meskerem 5 of ey+1.
  if (ey < hi) {
    const inv = new EthiopianDate(ey, 12, 25);
    const asof = new EthiopianDate(ey + 1, 1, 5);
    const a = agingBucket(inv, asof);
    out.push(`A,${ey},${a.days},${a.bucketIndex},${a.label}`);
  }
}

process.stdout.write(out.join("\n") + "\n");
