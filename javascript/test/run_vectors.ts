/**
 * Conformance runner (JS): drive every vector in the shared fixture through the
 * implementation, both directions. The vectors are the acceptance criteria
 * (Constitution Principle I); this file asserts nothing of its own.
 *
 * Exit code 0 iff every gating vector round-trips both ways. Prints one summary
 * line whose shape matches the Python runner so a cross-language harness can diff them.
 */

import { EthiopianDate, type GregorianDate } from "../src/index.ts";
import { loadVectors, type CalendarVector } from "./harness.ts";

interface Failure {
  vector: CalendarVector;
  direction: "g2e" | "e2g";
  got: unknown;
}

function checkVector(v: CalendarVector): Failure[] {
  const [ey, em, ed] = v.ethiopic;
  const [gy, gm, gd] = v.gregorian;
  const failures: Failure[] = [];

  // Gregorian -> Ethiopic
  const e = EthiopianDate.fromGregorian({ year: gy, month: gm, day: gd });
  if (e.year !== ey || e.month !== em || e.day !== ed) {
    failures.push({ vector: v, direction: "g2e", got: [e.year, e.month, e.day] });
  }

  // Ethiopic -> Gregorian
  const g: GregorianDate = new EthiopianDate(ey, em, ed).toGregorian();
  if (g.year !== gy || g.month !== gm || g.day !== gd) {
    failures.push({ vector: v, direction: "e2g", got: [g.year, g.month, g.day] });
  }
  return failures;
}

function main(): number {
  const doc = loadVectors();
  const vectors = doc.vectors;
  let gating = 0;
  const failures: Failure[] = [];

  for (const v of vectors) {
    if (v.gating) gating++;
    for (const f of checkVector(v)) {
      // A non-gating vector failure is still reported but does not gate release.
      if (v.gating) failures.push(f);
      else failures.push(f);
    }
  }

  const gatingFailures = failures.filter((f) => f.vector.gating);
  console.log(
    `JS conformance: ${vectors.length} vectors (${gating} gating), ` +
      `${gatingFailures.length} gating failures, ${failures.length - gatingFailures.length} non-gating failures`,
  );
  for (const f of failures.slice(0, 8)) {
    console.log(
      `   ${f.vector.gating ? "GATING" : "info  "} ${f.direction} ` +
        `eth=${JSON.stringify(f.vector.ethiopic)} greg=${JSON.stringify(f.vector.gregorian)} got=${JSON.stringify(f.got)}`,
    );
  }

  if (gatingFailures.length > 0) {
    console.log("::error::Principle I/X — gating vectors must pass in every runner");
    return 1;
  }
  console.log("JS conformance: PASS");
  return 0;
}

process.exit(main());
