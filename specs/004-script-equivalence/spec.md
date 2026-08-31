# Feature Specification: Ge'ez-Script Equivalence & Folding

**Feature Branch**: `004-script-equivalence`

**Created**: 2026-08-30

**Status**: Draft (implementation to follow; acceptance gated later by an externally authored fixture)

**Input**: User description: "Ge'ez-script equivalence and folding (the last Layer-0 module). Per-language script normalization for Amharic, Tigrinya, and Ge'ez, honoring Constitution Principles IV and V. Explicit `language` required (no default/inference/auto); GE_EZ raises on folding; TIGRINYA raises unless the caller acknowledges a lossy operation. Folding returns a parallel representation plus a character-level offset map, never a bare replacement string; prohibited at ingestion; every folded artifact records its scheme (H_ONLY or HSL), with no DEFAULT. Layer 0 deterministic; conformance vectors are authored external input; every language runs the same vector files."

## Clarifications

### Session 2026-08-30

- Q: Is folding length-preserving 1:1, or can it change the string's length? → A: Length-preserving 1:1 — each input character maps to exactly one folded character; offset map is a per-position index map (identity when nothing folds). Length-changing normalization is out of scope for v1.
- Q: Is GE_EZ valid for a non-folding equivalence (exact/normalized compare), or rejected everywhere? → A: Valid for a non-lossy compare (exact/normalized equality of two Ge'ez strings); only a fold requested for GE_EZ raises.
- Q: Where do the H_ONLY/HSL equivalence-class tables come from in v1? → A: Shipping working folding in v1 with the class tables derived from a cited authority; the external folding.json independently validates, and tests assert only structure/contracts, never class membership (Principle I). *(Provenance corrected 2026-08-31 per analysis finding P1: the source is documented Amharic/Tigrinya orthographic homophone data, NOT ICU/CLDR collation — collation encodes sort order and keeps homophone letters distinct. See FR-013 / A1.)*

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fold Amharic text for a search index, keeping the original intact (Priority: P1)

A search or retrieval system indexing Amharic content needs a *folded* key so that words spelled with any of the historically interchangeable Ge'ez homophone characters — *fidäl* (Ethiopic syllabic characters), e.g. the several forms that all sound like "h", "s", or "ʾ" in Amharic — collate and match as equivalent. The system must fold **only** to build the index key or compute a match — the stored document, the corpus, and anything a human reads must remain the raw original (Principle V). Because the folded string can be shorter or re-shaped, the caller also needs a **character-level offset map** back into the original so a match on the folded key can be highlighted at the right place in the source.

**Why this priority**: Cross-spelling equivalence is the whole reason this module exists; without it, the same Amharic word spelled two legitimate ways fails to match. It is the foundational capability every other scenario builds on.

**Independent Test**: Fold a set of Amharic strings that contain homophone variants under an explicit scheme; confirm variants that should collate produce identical folded keys, that the returned offset map lets every folded position be traced back to a source character, and that the original input string is returned unchanged alongside the folded form.

**Acceptance Scenarios**:

1. **Given** an Amharic string and an explicit language and scheme, **When** it is folded, **Then** the result carries both the folded representation and a character-level offset map back to the original, and the original string is unmodified.
2. **Given** two Amharic strings that differ only by interchangeable homophone characters, **When** each is folded under the same scheme, **Then** their folded keys are equal. *(Validated by the external `folding.json`, not by interim agent tests — asserting which characters collate is class membership, owned by the fixture per Principle I / FR-011.)*
3. **Given** two Amharic strings that are genuinely different words, **When** each is folded, **Then** their folded keys differ (folding does not over-collapse).

---

### User Story 2 - Language must be explicit; Ge'ez refuses to fold (Priority: P1)

A caller operating on Ge'ez-script text must state which language the text is in — Amharic, Tigrinya, or Ge'ez — because the equivalence classes differ by language. There is no default and no auto-detection (Principle IV). For **Ge'ez** (`GE_EZ`), every character is phonemically distinct, so any folding operation MUST raise rather than silently destroy information.

**Why this priority**: Applying Amharic folding blind to another Ge'ez-script language destroys phonemic distinctions and degrades cross-lingual transfer — the exact harm Principle IV (non-negotiable) exists to prevent. Enforcing explicit language and the Ge'ez refusal is as important as the folding itself.

**Independent Test**: Confirm every equivalence/folding function rejects a call that omits the language; confirm a fold requested for `GE_EZ` raises with an explicit error and never returns a folded string.

**Acceptance Scenarios**:

1. **Given** any folding or equivalence call, **When** the language argument is omitted, **Then** the operation raises rather than assuming a language.
2. **Given** a fold requested for `GE_EZ`, **When** it is called, **Then** it raises an explicit error identifying Ge'ez as non-foldable, and returns no folded output.
3. **Given** an unsupported or unknown language value, **When** it is passed, **Then** the operation raises rather than falling back to a default.

---

### User Story 3 - Tigrinya folding is refused unless the caller acknowledges the loss (Priority: P1)

For **Tigrinya** (`TIGRINYA`), the four glottal characters that collapse together in Amharic are phonemically **distinct**. Folding Tigrinya as if it were Amharic is lossy. The system MUST refuse a Tigrinya fold unless the caller passes an explicit lossy-operation acknowledgement; with that acknowledgement, the fold proceeds and the result records that a lossy scheme was applied.

**Why this priority**: Tigrinya is the highest-risk silent-corruption case — the text folds "successfully" while quietly erasing distinctions a Tigrinya reader depends on. The explicit acknowledgement turns a silent data loss into a conscious, auditable caller decision.

**Independent Test**: Confirm a Tigrinya fold without the acknowledgement raises; confirm the same fold **with** the acknowledgement succeeds, returns the folded form plus offset map, and records the scheme used.

**Acceptance Scenarios**:

1. **Given** a Tigrinya fold **without** the lossy-operation acknowledgement, **When** it is called, **Then** it raises an explicit error naming the lossy collapse it would cause.
2. **Given** a Tigrinya fold **with** the explicit acknowledgement, **When** it is called, **Then** it returns a folded representation plus offset map and records which scheme was applied.
3. **Given** two Tigrinya strings differing only in one of the four glottal characters, **When** folded under an acknowledged lossy scheme, **Then** they collate as equal; and the same two strings compared **without** folding are unequal. *(The "collate as equal" half is validated by the external `folding.json`, not interim agent tests — it asserts class membership, owned by the fixture per Principle I / FR-011.)*

---

### User Story 4 - The scheme is always named; folding never happens at ingestion (Priority: P2)

Every folded artifact — an index key, a similarity score, a cached comparison — MUST record which folding scheme produced it: `H_ONLY` (collapse only the "h" homophone family) or `HSL` (a broader collapse). There is no `DEFAULT` scheme (Principle V). Folding is permitted only where a folded value is the *purpose* — index-key construction and metric/similarity computation — and is PROHIBITED at ingestion: raw corpora, stored documents, and training data retain their original text.

**Why this priority**: Losing track of which scheme folded an artifact makes two folded keys incomparable and silently wrong; folding at ingestion permanently destroys the source. Both are Principle V violations, but they surface only under integration, so this is a strong P2 rather than a foundational P1.

**Independent Test**: Confirm every folded result carries a non-empty, explicit scheme tag (never "default"); confirm the two schemes produce distinguishable keys where they differ; confirm the documented ingestion path stores raw text and never a folded form.

**Acceptance Scenarios**:

1. **Given** any folded result, **When** it is produced, **Then** it carries an explicit scheme tag of `H_ONLY` or `HSL` and never a defaulted/unspecified scheme.
2. **Given** a string whose folded forms differ between `H_ONLY` and `HSL`, **When** folded under each, **Then** the two folded keys differ and each is tagged with the scheme that produced it. *(That the keys differ is validated by the external `folding.json`, not interim agent tests — it asserts class membership per Principle I / FR-011; the scheme **tagging** is asserted by interim tests.)*
3. **Given** two folded keys produced under different schemes, **When** they are compared for equality, **Then** the comparison is only meaningful within a single scheme (a scheme mismatch is surfaced, not silently compared).

---

### User Story 5 - Same equivalence answers in every language runtime (Priority: P2)

A team using the TypeScript package on the frontend and the Python package on the backend needs both to fold and compare identically for the same input, language, scheme, and acknowledgement — verified by the same shared fixtures.

**Why this priority**: Cross-language agreement is the project's core guarantee (Principle X), but it becomes fixture-testable only once the external folding fixture exists; until then, agreement is enforced by a cross-language sweep over generated inputs.

**Independent Test**: Run both language runners over the shared folding fixture (once provided) and confirm zero divergence on the gating set; before the fixture exists, confirm both languages produce identical folded keys, offset maps, scheme tags, and raise/acknowledge behavior across a generated input sweep.

**Acceptance Scenarios**:

1. **Given** the shared folding fixture, **When** both language runners execute it, **Then** both report zero gating failures.
2. **Given** any input, language, scheme, and acknowledgement, **When** each equivalence function is called in both languages, **Then** the folded key, the offset map, the scheme tag, and the raise/acknowledge outcome are identical.

### Edge Cases

- **Empty string**: folding an empty string returns an empty folded representation with an empty (valid) offset map and the requested scheme tag — not an error.
- **Text with no foldable characters**: the folded key equals the original character-for-character and the offset map is the identity mapping; still tagged with the scheme.
- **Mixed content** (Ge'ez-script letters interleaved with digits, ASCII, punctuation, whitespace): non-Ge'ez characters pass through unchanged and are represented in the offset map at their original positions.
- **Combining marks / normalization**: the equivalence rule is defined at the abstract-character (code-point) level, not the byte level. Because folding is length-preserving 1:1 (v1), differently-composed Unicode input is the caller's responsibility to normalize *before* folding; the module does not recompose sequences.
- **Offset map fidelity**: every position in the folded output maps to a valid source position, and every source character is accounted for, so a highlight over a folded match can be projected back onto the original span exactly.
- **Scheme mismatch on compare**: comparing an `H_ONLY` key against an `HSL` key is a caller error surfaced explicitly, not a silent false/true.
- **Ge'ez requested for a non-folding operation**: `GE_EZ` may still be a valid language for a *non-lossy* equivalence check (e.g., exact comparison); only *folding* raises. (See Assumptions.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every function that folds, normalizes, or compares Ge'ez-script text MUST require an explicit `language` argument (Amharic, Tigrinya, or Ge'ez) with no default, no inference, and no auto-detection; a missing or unknown language MUST raise (Constitution Principle IV).
- **FR-002**: A fold requested for `GE_EZ` MUST raise an explicit error and MUST NOT return a folded string — all Ge'ez characters are phonemically distinct (Principle IV).
- **FR-003**: A fold requested for `TIGRINYA` MUST raise unless the caller passes an explicit lossy-operation acknowledgement; with the acknowledgement it proceeds and records that a lossy scheme was applied (Principle IV).
- **FR-004**: Folding MUST return a parallel representation **plus** a character-level offset map back to the original input; it MUST NOT return a bare replacement string, and the original input MUST be returned/left unchanged (Principle V).
- **FR-005**: Every folded artifact MUST record the scheme that produced it — `H_ONLY` or `HSL` — and there MUST NOT be a `DEFAULT` scheme; a fold call MUST require the scheme to be stated explicitly (Principle V).
- **FR-006**: The system MUST define folding as permitted at index-key construction and at metric/similarity computation, and MUST document ingestion as a path that retains raw text and never stores a folded form (Principle V).
- **FR-007**: Two inputs of the same language that differ only by that language's interchangeable homophone characters MUST produce equal folded keys under a given scheme; genuinely distinct words MUST NOT collide (correct equivalence, no over-collapse).
- **FR-008**: Comparing two folded keys produced under different schemes MUST be surfaced as a scheme mismatch rather than silently returning equal/unequal.
- **FR-009**: All equivalence/folding computations MUST be deterministic and pure — identical inputs yield identical outputs with no dependence on network, ambient locale, timezone, or the system clock (Principle VIII).
- **FR-010**: Where the capability ships in more than one language, all implementations MUST expose the same equivalence surface and MUST run the identical shared folding fixture; divergence on the gating set is a release blocker (Principle X).
- **FR-011**: Acceptance MUST be driven exclusively by an externally authored folding fixture; the implementation and its automated tests MUST NOT assert any hand-authored equivalence-class membership or folded value (Constitution Principle I). Until that fixture exists, automated tests are limited to structural invariants (offset-map fidelity, scheme tagging), error/acknowledge contracts, and cross-language self-consistency.
- **FR-012**: Folding MUST be length-preserving 1:1 — each input character maps to exactly one folded character, and the offset map is a per-position index map equal to the identity when nothing folds (Principle V). Length-changing normalization is out of scope for v1.
- **FR-013**: The `H_ONLY`/`HSL` equivalence-class tables MUST be derived from **documented Amharic (and, for the Tigrinya-distinct set, Tigrinya) orthographic homophone data** — a cited linguistic reference and/or the Unicode Ethiopic block documentation — **not** from ICU/CLDR collation (collation encodes sort order and keeps homophone letters distinct, so it does not supply folding classes). The tables MUST NOT be invented and MUST live in a single location so a correction from the external fixture is a one-place change; the external `folding.json` is the independent validator of exact class membership (Constitution Principles II & III).

### Key Entities

- **Language**: an explicit member of {Amharic, Tigrinya, Ge'ez}. No default, no "auto". Ge'ez forbids folding; Tigrinya folding requires acknowledgement.
- **Folding scheme**: one of {`H_ONLY`, `HSL`}. No `DEFAULT`. Names the equivalence classes applied; every folded artifact carries its scheme.
- **Lossy-operation acknowledgement**: an explicit caller-supplied token/flag that authorizes a fold known to discard phonemic distinctions (required for Tigrinya).
- **Folded result**: a value carrying the folded representation, a character-level offset map to the original, and the scheme tag — never a bare string.
- **Offset map**: a length-preserving, per-position character-level mapping from each position in the folded representation back to the corresponding position in the original input (identity when nothing folds), so a folded-key match can be projected onto the source exactly.
- **Folding vector (external, read-only)**: a provenance-tagged record pairing an input (text + language + scheme + acknowledgement) with its expected outcome (folded key, offset map, or a specified error). Owned by the fixture, authored externally, never by the implementation (Principle I).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the gating folding vectors pass in every shipped language (once the fixture exists).
- **SC-002**: 100% of folding operations for `GE_EZ`, and 100% of Tigrinya folds without acknowledgement, raise — and return a folded string in 0% of cases.
- **SC-003**: 100% of calls that omit the language, or pass an unknown language, raise (no silent default).
- **SC-004**: For 100% of folded results, the offset map round-trips: every folded position maps to a valid source position and every source character is represented, so a match span projects back onto the original exactly.
- **SC-005**: 100% of folded results carry an explicit `H_ONLY` or `HSL` scheme tag; 0% carry a defaulted/unspecified scheme.
- **SC-006**: The TypeScript and Python implementations agree on 100% of a generated input sweep — folded key, offset map, scheme tag, and raise/acknowledge outcome — and on 100% of the gating folding vectors once provided.
- **SC-007**: The implementation contains zero automated tests that assert a hand-authored equivalence-class membership or folded value (Principle I compliance verifiable by inspection).

## Assumptions

The following are **informed guesses that require validation against a cited orthographic source** (documented Amharic/Tigrinya orthography and/or the Unicode Ethiopic block documentation — not ICU/CLDR collation, which keeps homophone letters distinct). The externally authored `folding.json` will confirm or correct them; the implementation is structured so an equivalence-class change touches one place.

- **A1 — Scheme definitions** *(source clarified 2026-08-30; provenance corrected 2026-08-31)*: `H_ONLY` collapses only the "h"-homophone family (the several Ge'ez forms that share the "h" sound in Amharic); `HSL` additionally collapses the "s" and "l" homophone families (and the Amharic glottal set). The v1 class tables are **derived from documented Amharic/Tigrinya orthographic homophone data** (a cited linguistic reference and/or the Unicode Ethiopic block documentation) — **not** from ICU/CLDR collation, which keeps homophone letters distinct. v1 ships working folding with cited provenance; the external `folding.json` independently validates the exact membership. The class tables live in one place so a fixture correction is a single-location change, and no test asserts class membership (Principle I).
- **A2 — Tigrinya's distinct set**: the four glottal characters that collapse in Amharic are the specific characters Tigrinya keeps distinct; the acknowledgement gates exactly those collapses. *To validate against the same sources.*
- **A3 — Ge'ez non-folding comparison** *(clarified 2026-08-30)*: `GE_EZ` **is** a valid language for a non-lossy **exact code-point comparison** of two Ge'ez strings (no Unicode normalization is applied — callers normalize first if needed); only a *folding* operation for `GE_EZ` raises (Principle IV). This is a settled decision, not a pending assumption.
- **A4 — Offset-map shape** *(clarified 2026-08-30)*: folding is **length-preserving 1:1** — each input character maps to exactly one folded character. The offset map is therefore a per-position index map at the abstract-character (code-point) level, identical across languages (Principle X) and equal to the identity mapping when nothing folds. Length-changing normalization (e.g. recomposing multi-code-point sequences) is **out of scope for v1**; callers needing it normalize before folding.
- The folding fixture (`tests/vectors/folding.json`) does not yet exist; it is authored externally and must carry `source` provenance and a `gating` flag per Principle II before any public release. Until it exists, acceptance is limited to structural invariants, error/acknowledge contracts, and cross-language self-consistency (Principle I).
- Calendar, fiscal, and numeral features are separate and out of scope here. Translation, transliteration to Latin, and non-Ge'ez scripts are explicitly out of scope for v1.
- Source corpora that could seed the fixture (e.g. the geezorg lexical archive) are CC-BY-SA licensed; any use as vector provenance must resolve the licence tension with the project's permissive-licence requirement before release.
