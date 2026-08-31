/**
 * Ge'ez homophone equivalence-class tables (the single swap point).
 *
 * PROVENANCE (research R1; NOT ICU/CLDR collation — collation encodes sort order
 * and keeps these letters distinct). These are the documented "redundant" Amharic
 * fidäl: base consonants that are phonemically homophonous in Amharic. Each base
 * occupies 7 consecutive vowel orders in the Unicode Ethiopic block (U+1200–U+137F);
 * folding maps a homophone base to a canonical representative base, PRESERVING the
 * vowel order.
 *
 * Exact class membership is owned and validated by the external
 * tests/vectors/folding.json (Principle I). If that fixture disagrees, correct the
 * families below — this file only, never the fold functions, never the tests.
 *
 * Families (representative ← homophones), by base start code point:
 *   H (h-family):        ሀ U+1200 ← ሐ U+1210, ኀ U+1280
 *   S (s-family):        ሰ U+1230 ← ሠ U+1220
 *   L (laryngeal/glottal): አ U+12A0 ← ዐ U+12D0
 * H_ONLY folds H only; HSL folds H + S + L. The ejective ṣ pair (ጸ U+1338 / ፀ
 * U+1340) is a candidate the fixture may add to HSL; it is left out of v1 pending
 * that validation. The 8th (labiovelar) forms are likewise fixture territory.
 */

/** Standard vowel orders per base consonant. */
const ORDERS = 7;

/** [representativeBaseStart, [homophoneBaseStarts…]] */
type Family = readonly [number, readonly number[]];

const H_FAMILY: Family = [0x1200, [0x1210, 0x1280]];
const S_FAMILY: Family = [0x1230, [0x1220]];
const L_FAMILY: Family = [0x12a0, [0x12d0]];

function addFamily(map: Map<number, number>, [rep, sources]: Family): void {
  for (const src of sources) {
    for (let o = 0; o < ORDERS; o++) map.set(src + o, rep + o);
  }
}

const H_ONLY_MAP = new Map<number, number>();
addFamily(H_ONLY_MAP, H_FAMILY);

const HSL_MAP = new Map<number, number>();
addFamily(HSL_MAP, H_FAMILY);
addFamily(HSL_MAP, S_FAMILY);
addFamily(HSL_MAP, L_FAMILY);

/** The code-point → representative map for a scheme. Representatives are absent
 *  from the map (they fold to themselves), which keeps folding idempotent. */
export function classMap(scheme: "H_ONLY" | "HSL"): ReadonlyMap<number, number> {
  return scheme === "HSL" ? HSL_MAP : H_ONLY_MAP;
}
