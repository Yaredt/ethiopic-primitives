# Phase 0 Research: Fiscal Logic

The fiscal-year *definition* (Hamle 1 – Sene 30) is settled by MoFED. Three *conventions* around it are genuinely underspecified in the public record; each is resolved here to an informed default and isolated behind the convention layer so an external fixture can flip it in one place.

## Decision 1 — Delegate everything to the calendar core

- **Decision**: Every fiscal function computes from a date's `(year, month, day)` and the calendar core's day arithmetic (`toJdn`/`daysUntil`). No fiscal function performs calendar conversion or day counting of its own.
- **Rationale**: Principle III forbids a second conversion path; the calendar core is already verified against 181 gating vectors and the sweep. Reusing it means fiscal correctness inherits calendar correctness.
- **Alternatives considered**: Independent day counting inside `aging_bucket` (rejected — would re-derive, and risk diverging from, the verified day arithmetic).

## Decision 2 (A1) — Fiscal-year label = the Ethiopian year of Hamle 1 (start-year)

- **Decision**: The fiscal year that begins on Hamle 1 of Ethiopian year *Y* is labelled *Y*. So a date from Hamle 1 *Y* through Sene 30 *Y+1* has `fiscal_year_for = Y`.
- **Rationale**: The feature-001 calendar vectors annotate `eth 1996-11-1` as "fiscal year start (Hamle 1)" — the natural reading is that Hamle 1 1996 opens FY 1996. Start-year labelling also makes `fiscal_year_bounds(Y).start` fall in calendar year `Y`, which is the least surprising mapping.
- **Alternatives considered**: End-year labelling (FY = *Y+1*). Plausible in jurisdictions that name a fiscal year by where it ends; must be confirmed against MoFED. **Isolated in the convention layer.**
- **Validation hook**: a single `fiscal.json` vector pairing any date in Hamle 1 1996 … Sene 30 1997 with its official label decides A1.

## Decision 3 (A2) — Period number = Ethiopian calendar month (Pagumē = 13)

- **Decision**: `fiscal_period(date) = date.month`, i.e. Meskerem = 1 … Nähase = 12, Pagumē = 13.
- **Rationale**: The spec states outright that "period 13 is Pagumē"; the only numbering under which that sentence is literally true is calendar-month numbering. It also guarantees Pagumē (month 13) can never collide with a 30-day month's period (Principle VI), satisfying SC-003 by construction.
- **Alternatives considered**: Fiscal-chronological numbering from Hamle = 1 (Hamle = 1, Nähase = 2, Pagumē = 3, Meskerem = 4, …, Sene = 13). Under this scheme "period 13" would be Sene, contradicting the spec's own statement — so it is the less likely reading, but it is a real ERP convention and must be confirmed. **Isolated in the convention layer.**
- **Validation hook**: one `fiscal.json` vector giving the official period of any Pagumē date (and of a Sene date) decides A2.

## Decision 4 (A3) — Quarters: four groups of three 30-day months; Pagumē joins Q1

- **Decision**: Map the twelve 30-day months into four quarters of three, in fiscal-chronological order starting at Hamle:
  - Q1 = Hamle, Nähase, Meskerem · Q2 = Tikimt, Hidar, Tahsas · Q3 = Tir, Yekatit, Megabit · Q4 = Miyazya, Ginbot, Sene.
  Pagumē falls chronologically between Nähase and Meskerem (inside Q1's span), so it is assigned to **Q1**.
- **Rationale**: 13 months do not divide into 4 quarters; keeping quarters as clean three-month blocks of the regular months matches how quarterly reporting is usually structured, and assigning the intra-year Pagumē sliver to the quarter it chronologically sits in (Q1) is the most defensible arithmetic-free rule.
- **Alternatives considered**: Pagumē → Q4 as a "year-end" period (rejected as default because Pagumē is chronologically mid-fiscal-year, not at its end; but this is exactly the sort of accounting-practice choice MoFED may define otherwise). **Isolated in the convention layer.**
- **Validation hook**: one `fiscal.json` vector giving the official quarter of any Pagumē date decides A3.

## Decision 5 — Aging computed in real days; backward span is explicit

- **Decision**: `aging_bucket(invoice, as_of, buckets=[30,60,90])` computes `days = calendar.daysUntil(invoice → as_of)` in real days and returns the first bucket whose upper bound the age does not exceed, else the overflow bucket ("90+"). If `as_of < invoice`, the function raises (a negative age is a caller error, not a bucket).
- **Rationale**: Real-day counting across Pagumē is the entire reason fiscal aging belongs in this module (FR-005). Raising on a backward span makes the FR-006 edge case explicit rather than silently returning bucket 1.
- **Alternatives considered**: Clamping a backward span to bucket 1 (rejected — hides a likely data error); month×30 approximation (rejected outright — the defect this feature exists to prevent).

## Decision 6 — Interim cross-language evidence via a parity sweep

- **Decision**: Until `fiscal.json` exists, demonstrate Principle X with `tools/fiscal_parity.py`: generate a decade of dates, run every fiscal function in both languages, assert identical outputs.
- **Rationale**: Cross-language agreement must be verifiable now; a parity sweep asserts "JS == PY", never an authored fiscal value, so it is Principle-I-safe.
- **Alternatives considered**: Deferring all Principle-X evidence to the fixture (rejected — leaves agreement unverified indefinitely).

## Open items (tracked, resolved later by the fixture / a human)

- **A1/A2/A3** — confirmed or corrected by the externally authored `tests/vectors/fiscal.json` (one vector each suffices). Until then they are documented defaults, not facts.
- **Principle II Tier-1 provenance** — MoFED Citizens' Budget to be added to vector provenance before public release.
