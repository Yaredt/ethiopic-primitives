# Ethiopic Primitives — Layer 0 Specification

**Version:** 0.1 (draft)
**Status:** For review
**Scope:** Deterministic, model-free primitives for Ethiopian calendar, numerals, and Ge'ez script handling.

---

## 1. Purpose and Design Rules

> **Revised in v0.3.** A prior-art survey (§1.1) found that calendar conversion and Ge'ez numerals are already implemented many times over. The scope has narrowed accordingly.

### 1.1 Prior art — measured, not assumed

Candidate libraries were tested against 182 generated conformance vectors and a day-by-day sweep from 1990 to 2035 (16,801 dates, both directions). Results:

| Library | Lang | Accuracy | Pagumē (month 13) | Last commit |
|---|---|---|---|---|
| `py-ethiopian-date-converter` 0.1.1 | Python | **0 errors / 16,801 days**, both directions | Handled correctly | Mar 2025 |
| `ethiopian-date` 1.0 | Python | Arithmetic correct | **Crashes** — 322 failures | 2017 origin |
| Ethio-Intl | TypeScript | **48.9% of days wrong** | Incorrect | Dec 2025, then dead |

**`py-ethiopian-date-converter` is correct.** It passed every vector and every day in the sweep. Depend on it; do not reimplement Python calendar conversion.

**`ethiopian-date` is correct but structurally limited.** It returns a `datetime.date`, which cannot represent month 13, so it raises on every Pagumē day — roughly 1.4% of dates, concentrated in early September. Usable if Pagumē is special-cased upstream; a latent production bug otherwise.

**Ethio-Intl is broken.** Three defects found:

1. `src/utils/date.ts` — the new-year rule tests whether the *current* Gregorian year is a leap year; the rule depends on the *following* year. Result: off-by-one on 48.9% of days in 2005–2030. It converts today's date correctly, which is presumably why this went unnoticed.
2. Two independent, conflicting conversion implementations ship in the same package. `src/utils/calendar.ts` line 75 sets the Ethiopian year to `year + 8` (should be `year - 7`, a 15-year error) while line 139 uses `year - 8` for the reverse — the file disagrees with itself.
3. `src/utils/numerals.ts` maps `0` to ፩, the glyph for **one**. Ge'ez has no zero. Converting zero silently returns one.

Its git history explains the pattern: 51 commits inside six days in December 2025, then nothing for eight months. It was launched, not maintained.

### 1.1.1 Note on method

The reference implementation used above was itself wrong twice before it was right — first a bad epoch constant, then an off-by-one at the leap boundary — and one apparent library failure during testing turned out to be a caller error, not a library defect. This arithmetic looks trivial and is not. That is the entire argument for §1.2 gap 3.

### 1.1.2 Verdict on building

| Component | Build? | Why |
|---|---|---|
| Python calendar conversion | **No** | Solved and verified |
| JS/TS calendar conversion | **Yes** | The maintained option is 48.9% wrong |
| Ge'ez numerals | **Yes, small** | Existing TS implementation has a zero defect |
| Fiscal logic | **Yes** | Absent from every library surveyed |
| Equivalence engine (§4) | **Yes** | Nothing implements the §4.4 design |
| Conformance suite | **Yes — first** | Nothing exists; cheapest; highest leverage |

### 1.2 What is actually missing

Three gaps survived the survey:

1. **Fiscal logic.** Every library converts dates. None implement fiscal year, fiscal quarter, period 13, or aging across the Pagumē boundary. This logic currently lives only inside proprietary ERPs.
2. **The equivalence engine** (§4). No published implementation is language-aware, scheme-labelled, and offset-mapped.
3. **Conformance.** A dozen-plus independent implementations, five languages, no shared test vectors, each with its own epoch constant. Nobody knows whether they agree. Since epoch errors surface only inside Pagumē and at year boundaries, silent disagreement is likely.

Gap 3 is the strongest position. A published conformance suite makes every existing library better, requires no one to switch dependencies, and makes its author the reference point for correctness in this domain. It is also cheap.

### 1.3 Design rules

Three rules govern every decision below:

1. **No model calls.** Layer 0 is pure functions. It must run offline, in a browser, on a phone, and in a serverless function with no network access.
2. **Never lose the original.** Folding produces a parallel form. The source text is always retained.
3. **Language-aware, not language-blind.** Amharic and Tigrinya do not share the same equivalence rules. A single global "normalize" function is a bug.

**Revised deliverable:** a conformance suite (shared JSON test vectors plus runners), a fiscal-logic package, and the equivalence engine. Not a general-purpose calendar library.

---

## 2. Module A — Calendar

### 2.1 Structure

The Ethiopian calendar has 13 months: twelve of exactly 30 days, plus **Pagumē**, a short month of 5 days (6 in a leap year).

| # | Name (Latin) | Ge'ez | Days |
|---|---|---|---|
| 1 | Mäskäräm | መስከረም | 30 |
| 2 | Ṭəqəmt | ጥቅምት | 30 |
| 3 | Ḫədar | ኅዳር | 30 |
| 4 | Taḫśaś | ታኅሣሥ | 30 |
| 5 | Ṭərr | ጥር | 30 |
| 6 | Yäkatit | የካቲት | 30 |
| 7 | Mägabit | መጋቢት | 30 |
| 8 | Miyazya | ሚያዝያ | 30 |
| 9 | Gənbot | ግንቦት | 30 |
| 10 | Säne | ሰኔ | 30 |
| 11 | Ḥamle | ሐምሌ | 30 |
| 12 | Nähase | ነሐሴ | 30 |
| 13 | Pagumē | ጳጉሜን | 5 or 6 |

**Leap rule:** Pagumē has 6 days when `ethiopian_year % 4 == 3`. This is a pure Julian-style rule with no century exception, which means Ethiopian and Gregorian leap years drift relative to each other. Do not attempt to derive one from the other.

**Year offset:** The Ethiopian year is 7 or 8 behind the Gregorian, depending on whether the Gregorian date falls before or after Ethiopian New Year (Mäskäräm 1), which lands on 11 September in most years and 12 September in the year preceding an Ethiopian leap year.

### 2.2 Conversion algorithm

Convert through Julian Day Number in both directions. Do not do month-by-month arithmetic — it accumulates errors around Pagumē.

```
ETHIOPIC_EPOCH_JDN = 1723856   # Mäskäräm 1, year 1 (Amete Mihret)

to_jdn(year, month, day):
    return ETHIOPIC_EPOCH_JDN
         + 365 * (year - 1)
         + floor(year / 4)
         + 30 * (month - 1)
         + (day - 1)

from_jdn(jdn):
    r = (jdn - ETHIOPIC_EPOCH_JDN) mod 1461
    n = (r mod 365) + 365 * floor(r / 1460)
    year  = 4 * floor((jdn - ETHIOPIC_EPOCH_JDN) / 1461) + floor(r / 365) - floor(r / 1460) + 1
    month = floor(n / 30) + 1
    day   = (n mod 30) + 1
    return (year, month, day)
```

Gregorian ↔ JDN uses the standard proleptic Gregorian algorithm from any date library.

**Implementation note:** The epoch constant above is the conventional Amete Mihret value, but *verify it against the anchor cases in §2.5 before trusting it*. Off-by-one epoch errors are the single most common bug in Ethiopian calendar libraries, and they only surface at year boundaries and in Pagumē.

Also support **Amete Alem**, the alternative era used in some religious contexts, as a flag. It differs from Amete Mihret by 5,500 years.

### 2.3 Fiscal calendar — **primary deliverable**

The Ethiopian fiscal year runs **Hamle 1 through Sene 30**, equivalently 8 July to 7 July Gregorian. This is confirmed by the Ministry of Finance's own Citizens' Budget documents, which define the Ethiopian Fiscal Year in exactly those terms, and it appears consistently in payroll and tax guidance. Treat MoFED as the citable authority.

No open-source package implements this. It is the highest-value function in the module.

Required functions:

- `fiscal_year_for(date) -> int` — returns the fiscal year label
- `fiscal_year_bounds(fy) -> (start_date, end_date)`
- `fiscal_quarter(date) -> 1..4` — Q1 begins Hamle 1
- `fiscal_period(date) -> 1..13` — note that period 13 (Pagumē) is a real accounting period, not an adjustment period, and must not be silently merged into period 12
- `aging_bucket(invoice_date, as_of, buckets=[30,60,90])` — computed in real days across the Pagumē boundary

### 2.4 API surface

```python
EthiopianDate(year, month, day, era=Era.AMETE_MIHRET)
  .to_gregorian() -> date
  .from_gregorian(d) -> EthiopianDate     # classmethod
  .add_days(n) -> EthiopianDate
  .add_months(n) -> EthiopianDate         # clamps into Pagumē correctly
  .weekday() -> int
  .is_leap_year() -> bool
  .format(pattern, locale) -> str
  .parse(text, locale) -> EthiopianDate   # classmethod
```

`format` and `parse` must handle at minimum: Ge'ez script month names, Latin transliterations, and numeric forms with both Arabic and Ge'ez numerals. Accept ambiguous two-digit years only with an explicit pivot argument — never guess.

### 2.5 Required test anchors

Every implementation must pass these before release:

- Mäskäräm 1, 2000 → 11 September 2007
- Pagumē 6, 2003 → 11 September 2011 (leap year, 6-day Pagumē)
- Pagumē 5, 2004 → 10 September 2012 (non-leap)
- Round-trip every date from Ethiopian year 1900 to 2100 through Gregorian and back
- Fiscal year boundary: Sene 30 and Hamle 1 of consecutive years must land in different fiscal years
- Day-count between Nähase 30 and Mäskäräm 1 must equal 6 in a leap year and 5 otherwise

---

## 3. Module B — Ge'ez Numerals

### 3.1 System

Ge'ez numerals are additive-multiplicative with **no zero** and no positional notation.

Base symbols: ፩1 ፪2 ፫3 ፬4 ፭5 ፮6 ፯7 ፰8 ፱9 ፲10 ፳20 ፴30 ፵40 ፶50 ፷60 ፸70 ፹80 ፺90 ፻100 ፼10000

Numbers are built by combining tens and units (፳፩ = 21), with ፻ as a multiplier for hundreds and ፼ for ten-thousands. Larger values nest multiplicatively, which makes parsing genuinely non-trivial above 10,000.

### 3.2 Functions

```
to_geez(n: int) -> str          # n >= 1
from_geez(s: str) -> int
is_valid_geez_numeral(s) -> bool
```

**Explicit constraints:**

- There is no representation for zero. `to_geez(0)` raises, it does not return an empty string.
- There is no representation for negatives or fractions. Accounting applications must handle sign and decimals in Arabic numerals and use Ge'ez only for display of whole positive quantities.
- **Currency amounts should default to Arabic numerals.** Ge'ez numerals in financial contexts are largely ceremonial and formal. Offer the conversion; do not make it the default.

### 3.3 Test anchors

`1, 9, 10, 11, 20, 21, 99, 100, 101, 110, 999, 1000, 9999, 10000, 10001, 100000, 1000000` — round-trip all of them, plus fuzz round-trip across 1..10^7.

---

## 4. Module C — Script Equivalence

> **Revised in v0.2** following review of Nigatu et al. (EMNLP 2025), *A Case Against Implicit Standards*, and Belay et al. (ICT4DA 2021). The module was originally specified as "normalization." That framing was wrong and has been changed.

### 4.1 The problem

Ge'ez script is an abugida: each character encodes a consonant plus one of seven vowels, so each base consonant has at least seven forms, plus labiovelars. Amharic has 33 base characters, Tigrinya 32, Ge'ez 26.

Through historical phoneme mergers, modern Amharic pronounces several distinct characters identically. Typists use them interchangeably. Exact-match retrieval therefore fails silently: a word indexed one way is queried another.

**Equivalence groups (Amharic only):**

| Group | Characters | Count |
|---|---|---|
| h-series | ሀ ሃ ሐ ሓ ኀ ኃ ኻ | 7 |
| glottal | አ ኣ ዐ ዓ | 4 |
| s-series | ሰ ሠ | 2 |
| ts-series | ጸ ፀ | 2 |

Each applies across all seven vowel orders. Note the h-series and glottal groups are larger than commonly assumed — earlier drafts of this spec listed five and two respectively.

### 4.2 The critical constraint

These groups are **not** equivalent outside Amharic.

- **Tigrinya:** all four glottal characters have distinct sounds. Folding them destroys information.
- **Ge'ez:** every character is distinct. No folding is valid under any circumstances.

### 4.3 Why this is not a normalization module

The empirical evidence says folding at ingestion time is usually a net loss. Nigatu et al. trained English–Amharic MT under three settings:

| Setting | Transformer BLEU | NLLB-600M BLEU |
|---|---|---|
| No normalization | **12.32** | 19.09 |
| Homophone-only | 9.31 | **19.71** |
| Homophone + similar + labialized | 6.22 | 17.13 |

Un-normalized won outright for the from-scratch model. The aggressive scheme was worst in both. Gains where they existed were under one BLEU point.

Cross-lingual transfer was worse. Amharic base models trained on normalized data, transferred to Tigrinya and Ge'ez, degenerated into repeating tokens to the sequence limit and emitted characters that do not exist in the Ge'ez alphabet.

There is also **no standard scheme** in the literature. Published tools variously fold same-sound characters only; same-sound plus labiovelars; or same-sound plus labiovelars plus same-base-consonant characters. "Normalized Amharic" as a dataset description carries almost no information.

### 4.4 Design consequence

Folding is a **comparison operation**, not a storage transformation. Store text as written. Fold only at the moment two strings are compared.

```
equivalence_class(char, language) -> ClassId
equal_under_equivalence(a, b, language, scheme) -> bool
fold(text, language, scheme) -> FoldedText   # for index keys only
```

- `language` is **required**. No default. Raises for GE_EZ.
- `scheme` is **required** and explicitly named — `H_ONLY` or `HSL` — so that any downstream corpus records which was used. There is no `DEFAULT`.
- For Tigrinya, `fold` raises unless called with `acknowledge_lossy=True`.
- `FoldedText` carries a character-level offset map back to the source.

**Retrieval pattern:** index the folded form as a secondary key alongside the raw text; return and display the raw. This gets recall without the corpus ever being rewritten.

**Evaluation pattern:** apply folding to both prediction and reference at scoring time, never to training data. This is the post-inference intervention from Nigatu et al., worth up to +1.03 BLEU with no loss of spelling variation in the model.

### 4.5 Other functions

```
detect_script(text) -> Script          # Ethiopic / Latin / mixed
detect_language(text) -> Language      # heuristic, character-frequency based
transliterate(text, scheme) -> str     # SERA and a phonetic scheme, both directions
segment_words(text) -> list[str]       # respects ፡ ። ፣ ፤ ፥ ፦
```

Word segmentation must handle both the traditional word separator (፡) and modern space-separated text, since real-world documents mix them.

### 4.6 Unicode coverage

Handle all four blocks: Ethiopic (U+1200–U+137F), Supplement (U+1380–U+139F), Extended (U+2D80–U+2DDF), Extended-A (U+AB00–U+AB2F). Test with text drawn from all of them.

### 4.7 Prior art to reconcile with

- `github.com/hhnigatu/geez_script_normalization` — code and data from the EMNLP paper
- Yimam et al. (2021) HSL script — the aggressive scheme, useful as a reference implementation to test against even though it performs worst
- Kidanemariam (2019), Amharic NLP Tools — the conservative same-sound-only scheme

### 4.3 Other functions

```
detect_script(text) -> Script          # Ethiopic / Latin / mixed
detect_language(text) -> Language      # heuristic, character-frequency based
transliterate(text, scheme) -> str     # SERA and a phonetic scheme, both directions
segment_words(text) -> list[str]       # respects ፡ ። ፣ ፤ ፥ ፦
```

Word segmentation must handle both the traditional word separator (፡) and modern space-separated text, since real-world documents mix them.

### 4.4 Unicode coverage

Handle all four blocks: Ethiopic (U+1200–U+137F), Supplement (U+1380–U+139F), Extended (U+2D80–U+2DDF), Extended-A (U+AB00–U+AB2F). Test with text drawn from all of them.

---

## 5. Packaging and Delivery

**Repository layout**

```
ethiopic-primitives/
  core/           # language-independent spec + shared test vectors (JSON)
  python/
  javascript/
  service/        # FastAPI wrapper, OpenAPI schema
  tests/vectors/  # shared across both implementations
```

The shared test vector files are the point. Both implementations run the same JSON fixtures, so the Python and JS packages cannot drift.

**Licence:** Apache 2.0 or MIT. Permissive matters here — you want the existing Ethiopian AI startups to adopt this without a legal conversation, because adoption is the whole strategy.

**Non-goals for v1:** No Islamic or Oromo calendar support. No holiday calendars (they involve movable religious feasts and deserve their own module). No currency formatting. No translation.

---

## 6. Effort and Sequencing

## 6. Build Plan (SpecKit / AI-assisted)

### 6.1 The one rule that matters

**The conformance vectors are the acceptance criteria. The coding agent must not generate its own calendar test cases.**

This is not a stylistic preference. Ethiopic conversion is a domain where a plausible-looking algorithm is wrong ~49% of the time (§1.1) and still passes a smoke test on today's date. An agent asked to write both the implementation and its tests will encode the same wrong epoch or leap rule in both, and the suite will pass green while the library is broken. That is precisely how Ethio-Intl shipped.

The vectors in `ethiopic-conformance-vectors.json` are externally derived and anchor-validated. They go into the repo first, as a fixture, and the agent is told to satisfy them — never to author them.

### 6.2 Two-day shape

**Day 1 — correctness core**

| Task | Notes |
|---|---|
| Land vectors + reference as fixtures | Already exists; commit unchanged |
| `/specify` calendar + numerals contract | API surface from §2.4, §3.2 |
| Generate TS implementation | Must pass all 182 vectors |
| Generate Python binding | Thin wrapper over `py-ethiopian-date-converter`, not a reimplementation |
| Cross-runner harness | Same JSON drives both languages |

**Day 2 — the parts nobody has built**

| Task | Notes |
|---|---|
| Fiscal logic (§2.3) | Hamle 1 – Sene 30, period 13, aging across Pagumē |
| Equivalence engine (§4.4) | Language required, scheme labelled, offset-mapped |
| Packaging + CI | Vectors run on every commit |

### 6.3 What does not compress

Code generation collapses to hours. These do not:

- **Anchor verification.** The vectors are only as good as the anchor dates behind them, which have been cross-checked for internal consistency but not against an Ethiopian government published calendar. This is a human lookup task and it gates everything downstream.
- **Native-speaker review of §4.1.** The equivalence groups come from published literature, but the HSL "similar sounds" set has no principled definition and needs a judgement call from someone who speaks the language.
- **Ecosystem contact.** Filing issues against the libraries the vectors expose, and reaching the maintainers, is calendar-time regardless of coding speed.
- **Maintenance.** Faster building lowers the cost of shipping; it does not lower the cost of still being there in six months. Ethio-Intl's failure was not a shortage of development speed.

### 6.4 Realistic sequencing

Two days of build is credible. Treat the non-code items above as a parallel track starting the same week, because a conformance suite built on unverified anchors is worse than none — it would confer false authority on whichever libraries happen to agree with it.

Ship the vectors publicly before the library. They are useful to the ecosystem on their own, they cost nothing to maintain, and publishing them first tests whether anyone in the ecosystem responds — which is the real signal about whether the library is worth building.

---

## 7. Open Questions

1. ~~Are the phonemic equivalence groups correct and complete for Amharic?~~ **Resolved.** Groups corrected and expanded in §4.1; module redesigned per §4.3–4.4. Residual sub-question: the "similar sound" characters in the HSL scheme have no principled definition in the literature, so if HSL is supported at all it should be a verbatim reimplementation of Yimam et al. rather than an independent judgement call.
2. ~~Do the existing players already have internal versions of this?~~ **Resolved for the open-source layer** (§1.1) — calendar and numerals are heavily duplicated, fiscal logic is absent. Still open for the AI startups specifically: whether Addis AI, EthiopicAI, or Ras have internal equivalence-handling worth reconciling with. Contacts: the Nigatu et al. author list spans Lesan AI, Vella AI, UC Berkeley, and Hamburg.
3. Which transliteration scheme should be canonical? SERA is the established one, but the literature notes there is no standard way of transliterating Ge'ez script into Latin, and researchers have historically invented their own tables. This fragmentation is itself an argument for the conformance-suite approach.
4. ~~Is there a government reference for fiscal period handling?~~ **Resolved.** Ministry of Finance (mofed.gov.et) budget documentation defines EFY as Hamle 1 – Sene 30 / 8 July – 7 July. Remaining sub-question: whether Pagumē is treated as a distinct accounting period or folded into period 12 in official Ethiopian public-sector accounting practice.
