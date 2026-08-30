/**
 * Principle IX sweep (JS): a green vector run is NOT acceptance — both
 * known-broken libraries convert today correctly. This walks every Gregorian day
 * across a range, converts to Ethiopic and back, and converts every Ethiopic day
 * across a matching range to Gregorian and back. Zero mismatches, zero exceptions.
 *
 * Mirrors `tools/full_sweep.py`. No hand-written conversion result appears here;
 * the only assertion is self-consistency of the round trip.
 */

import { EthiopianDate, gregorianToJdn, jdnToGregorian } from "../src/index.ts";

function parseRange(argv: string[]): { lo: number; hi: number } {
  let lo = 1990;
  let hi = 2035;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from") lo = Number(argv[++i]);
    else if (argv[i] === "--to") hi = Number(argv[++i]);
  }
  return { lo, hi };
}

function main(): number {
  const { lo, hi } = parseRange(process.argv.slice(2));

  let total = 0;
  let mismatches = 0;
  let exceptions = 0;
  const examples: string[] = [];

  // Direction 1: Gregorian -> Ethiopic -> Gregorian, day by day.
  const startJdn = gregorianToJdn(lo, 1, 1);
  const endJdn = gregorianToJdn(hi, 12, 31);
  for (let jdn = startJdn; jdn <= endJdn; jdn++) {
    total++;
    try {
      const e = EthiopianDate.fromJdn(jdn);
      const back = e.toJdn();
      if (back !== jdn) {
        mismatches++;
        if (examples.length < 5) {
          examples.push(`g2e2g ${JSON.stringify(jdnToGregorian(jdn))} -> ${e.toString()} -> jdn ${back}`);
        }
      }
    } catch (err) {
      exceptions++;
      if (examples.length < 5) examples.push(`g2e EXC at jdn ${jdn}: ${String(err).slice(0, 60)}`);
    }
  }

  // Direction 2: Ethiopic -> Gregorian -> Ethiopic, day by day across the same span.
  const eLo = EthiopianDate.fromJdn(startJdn);
  const eHi = EthiopianDate.fromJdn(endJdn);
  for (let jdn = eLo.toJdn(); jdn <= eHi.toJdn(); jdn++) {
    total++;
    try {
      const e = EthiopianDate.fromJdn(jdn);
      const g = e.toGregorian();
      const back = EthiopianDate.fromGregorian(g);
      if (back.toJdn() !== jdn) {
        mismatches++;
        if (examples.length < 5) examples.push(`e2g2e ${e.toString()} -> ${JSON.stringify(g)} -> ${back.toString()}`);
      }
    } catch (err) {
      exceptions++;
      if (examples.length < 5) examples.push(`e2g EXC at jdn ${jdn}: ${String(err).slice(0, 60)}`);
    }
  }

  console.log(
    `Principle IX sweep ${lo}-${hi}: ${total} conversions, ${mismatches} mismatches, ${exceptions} exceptions`,
  );
  for (const x of examples) console.log("  ", x);

  if (mismatches > 0 || exceptions > 0) {
    console.log("::error::Principle IX violation — sweep must be zero-tolerance");
    return 1;
  }
  console.log("Principle IX (JS): PASS");
  return 0;
}

process.exit(main());
