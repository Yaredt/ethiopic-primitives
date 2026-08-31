// Homophone search — fold to MATCH/LOCATE, never to mutate (Principle V).
// Returns raw [start,end) code-point spans; the description is never rewritten.
import { fold, Language } from "../lib/index.js";

/**
 * Raw (unfolded) substring spans — used for GE_EZ, which never folds. Exact,
 * code-point-level matching.
 */
function rawSpans(description, query) {
  const d = Array.from(description);
  const q = Array.from(query);
  const spans = [];
  if (q.length === 0) return spans;
  for (let i = 0; i + q.length <= d.length; i++) {
    let match = true;
    for (let j = 0; j < q.length; j++) {
      if (d[i + j] !== q[j]) { match = false; break; }
    }
    if (match) spans.push([i, i + q.length]);
  }
  return spans;
}

/**
 * Find all raw spans in `description` that match `query` under the given language/
 * scheme. For GE_EZ, folding is unavailable → exact raw substring. Otherwise fold
 * both (may throw EquivalenceError, e.g. tigrinya_requires_ack), locate the folded
 * query in the folded description, and map folded indices back to raw positions via
 * the offset map. Folding is length-preserving 1:1, so offsets are the identity, but
 * we go through them for correctness and future-proofing.
 */
export function findSpans(description, query, { language, scheme, acknowledgeLossy }) {
  if (!query) return [];
  if (language === Language.GE_EZ) return rawSpans(description, query);

  const fq = fold(query, language, scheme, { acknowledgeLossy });
  const fd = fold(description, language, scheme, { acknowledgeLossy });
  const fdCps = Array.from(fd.folded);
  const fqCps = Array.from(fq.folded);
  const spans = [];
  if (fqCps.length === 0) return spans;
  for (let i = 0; i + fqCps.length <= fdCps.length; i++) {
    let match = true;
    for (let j = 0; j < fqCps.length; j++) {
      if (fdCps[i + j] !== fqCps[j]) { match = false; break; }
    }
    if (match) {
      const startRaw = fd.offsets[i];
      const endRaw = fd.offsets[i + fqCps.length - 1] + 1;
      spans.push([startRaw, endRaw]);
    }
  }
  return spans;
}

/** True if the description has at least one match (query folded appropriately). */
export function matches(description, query, opts) {
  return findSpans(description, query, opts).length > 0;
}
