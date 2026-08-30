# Ethiopic Primitives Constitution

## Core Principles

### I. Conformance Fixtures Are Authored, Never Generated (NON-NEGOTIABLE)
The agent MUST NOT create, modify, extend, delete, or regenerate any file under `tests/vectors/`. These are read-only external input; the obligation is to make the implementation satisfy them. The agent MAY write tests for wiring, error handling, type contracts, and I/O. The agent MUST NOT write any test that asserts a date conversion result, a fiscal period boundary, or a numeral value. Rationale: Ethiopic conversion has a large family of plausible-but-wrong algorithms — wrong epoch, wrong leap rule, wrong new-year predicate — each of which converts *today* correctly and fails elsewhere. A published library (Ethio-Intl) is wrong on 48.9% of days while shipping two mutually contradictory conversion functions. An agent authoring both implementation and expectations encodes the same error twice and reports green.

### II. Anchor Provenance
Every vector MUST carry a `source` array naming an external authority and a `gating` boolean. Gating vectors require at least one Tier-1 or Tier-2 source with `result: "agree"`. Tier 1 = Ethiopian government publication (MoFED, Negarit Gazeta holiday proclamations, Ethiopian Statistical Service). Tier 2 = Unicode CLDR/ICU, or Reingold & Dershowitz *Calendrical Calculations*. Tier 3 = corroborating only (liturgical calendars, almanacs). No public release may occur while a gating vector lacks external provenance. Rationale: a conformance suite built on unverified anchors confers false authority on whichever implementations share its error.

### III. Measure Before Reimplementing
Any task implementing functionality available in an existing package MUST cite a measured failure of that package against the vectors. `py-ethiopian-date-converter` passed 16,801/16,801 days in both directions and is a DEPENDENCY, NOT A REFERENCE — reimplementing Python calendar conversion is prohibited absent new measured evidence. Rationale: duplication is this ecosystem's dominant pathology; a dozen-plus independent implementations already exist.

### IV. Language Is Required, Never Defaulted (NON-NEGOTIABLE)
Every function performing script equivalence, folding, or comparison MUST take an explicit `language` parameter with no default, no inference, and no "auto" mode. `GE_EZ` MUST raise on any folding operation — all Ge'ez characters are phonemically distinct. `TIGRINYA` MUST raise unless the caller passes an explicit lossy-operation acknowledgement — the four glottal characters that collapse in Amharic are distinct in Tigrinya. Rationale: Amharic folding applied blind to other Ge'ez-script languages destroys phonemic information and degrades cross-lingual transfer.

### V. Source Text Is Immutable
Folding MUST return a parallel representation plus a character-level offset map to the original, never a bare replacement string. Corpora, indexes, and training data MUST retain raw text. Folding is permitted at index-key construction and at metric computation; it is PROHIBITED at ingestion. Any artifact produced with folding applied MUST record which scheme was used (`H_ONLY` or `HSL`) — there MUST NOT be a `DEFAULT`.

### VI. Pagumē Is a First-Class Period
Month 13 MUST be representable in every type, serialization, and return value. Functions MUST NOT return a type that cannot express month 13 — returning `datetime.date` is prohibited, being the defect that makes `ethiopian-date` 1.0 raise on ~1.4% of dates. Fiscal period 13 MUST be a distinct accounting period, never merged into 12. Day arithmetic and aging MUST compute in real days across the Pagumē boundary.

### VII. Ge'ez Numeral Domain Constraints
The system has no zero, no negatives, no fractions. `to_geez(0)` MUST raise — it MUST NOT return ፩ or an empty string. Negative and fractional inputs MUST raise. Monetary values MUST default to Arabic numerals. Rationale: a shipped library currently maps zero to the glyph for one; silent coercion in a numeral system is data corruption.

### VIII. Layer 0 Is Deterministic
No component may call a language model, make a network request, or depend on ambient locale, timezone, or system clock for its result. Every function MUST be pure and produce identical output offline, in a browser, and in a serverless runtime.

### IX. A Green Suite Is Not Evidence (NON-NEGOTIABLE)
Acceptance for any conversion component requires BOTH: all gating vectors pass, AND a day-by-day sweep across at least 1990–2035 in both directions with zero mismatches and zero exceptions. Spot-checks on the current date MUST NOT appear as acceptance criteria in any task. Rationale: both known-broken implementations convert today correctly.

### X. Cross-Language Agreement
Where a capability ships in more than one language, all implementations MUST run the same vector files. Divergence between runners is a release blocker, not a known issue.

## Additional Constraints

Scope is Layer 0 only: calendar, fiscal logic, numerals, script equivalence. Out of scope for v1: Islamic and Oromo calendars, movable religious feasts, currency formatting, translation. Licence MUST be permissive (MIT or Apache-2.0) — adoption by existing Ethiopian AI projects is the strategy, and a copyleft licence blocks it.

## Development Workflow

CI MUST fail on any diff touching `tests/vectors/`; the path is CODEOWNERS-protected. CI MUST run the full sweep required by Principle IX on every commit. Every PR description MUST state which principles it was checked against. Conflicts between an artifact and this constitution MUST be surfaced explicitly by the agent, never resolved silently.

## Governance

This constitution supersedes all specs, plans, and tasks; where they conflict, the constitution wins and the artifact is revised. Amendments require a version bump and written rationale in the commit message. Principles I, IV, and IX are non-negotiable and MUST NOT be amended to add exceptions, defaults, or agent-authored fixtures. All PRs and reviews MUST verify compliance.

**Version**: 1.0.0 | **Ratified**: 2026-08-30 | **Last Amended**: 2026-08-30
