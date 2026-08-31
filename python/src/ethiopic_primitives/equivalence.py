"""Ge'ez-script equivalence & folding — per-language, deterministic, Layer 0.

Mirrors ``javascript/src/equivalence.ts`` exactly. Honors Constitution Principles
IV and V:
 - Language is MANDATORY and explicit — no default, no inference, no "auto".
   ``GE_EZ`` raises on any fold; ``TIGRINYA`` raises on a fold unless the caller
   passes an explicit lossy acknowledgement.
 - Folding returns a PARALLEL representation plus a per-position offset map back to
   the original — never a bare string — and never mutates the input. Every folded
   result records its scheme (``H_ONLY``/``HSL``); there is no DEFAULT. Comparing
   keys across schemes is surfaced as ``scheme_mismatch``.

Folding is length-preserving 1:1, so the offset map is the identity in v1. Class
membership is owned by the external ``tests/vectors/folding.json`` (Principle I).
"""

from __future__ import annotations

from dataclasses import dataclass

from ._equivalence_classes import class_map


class Language:
    AMHARIC = "AMHARIC"
    TIGRINYA = "TIGRINYA"
    GE_EZ = "GE_EZ"


class FoldScheme:
    H_ONLY = "H_ONLY"
    HSL = "HSL"


_KNOWN_LANGUAGES = frozenset({Language.AMHARIC, Language.TIGRINYA, Language.GE_EZ})
_KNOWN_SCHEMES = frozenset({FoldScheme.H_ONLY, FoldScheme.HSL})


class EquivalenceError(ValueError):
    """The single typed error the equivalence surface raises; carries ``reason``."""

    def __init__(self, reason: str, message: str) -> None:
        super().__init__(message)
        self.reason = reason


@dataclass(frozen=True)
class FoldResult:
    folded: str          # same code-point count as the input
    offsets: tuple       # offsets[i] is the source index of folded char i (identity in v1)
    scheme: str          # the scheme that produced this result (never defaulted)
    language: str        # the language it was folded under


def _require_language(language) -> None:
    if language is None:
        raise EquivalenceError("missing_language", "language is required — no default, no inference (Principle IV)")
    if language not in _KNOWN_LANGUAGES:
        raise EquivalenceError("unknown_language", f"unknown language: {language!r}")


def _require_scheme(scheme) -> None:
    if scheme is None:
        raise EquivalenceError("missing_scheme", "scheme is required — there is no DEFAULT (Principle V)")
    if scheme not in _KNOWN_SCHEMES:
        raise EquivalenceError("unknown_scheme", f"unknown scheme: {scheme!r}")


def fold(text: str, language: str, scheme: str, *, acknowledge_lossy: bool = False) -> FoldResult:
    """Fold ``text`` under an explicit ``language`` and ``scheme``. Length-preserving
    1:1. Raises for a missing/unknown language or scheme, for ``GE_EZ`` (never folds),
    and for ``TIGRINYA`` unless ``acknowledge_lossy`` is True. Input is not mutated.
    """
    _require_language(language)
    _require_scheme(scheme)
    if language == Language.GE_EZ:
        raise EquivalenceError(
            "geez_not_foldable",
            "Ge'ez characters are phonemically distinct; folding is prohibited (Principle IV)",
        )
    if language == Language.TIGRINYA and acknowledge_lossy is not True:
        raise EquivalenceError(
            "tigrinya_requires_ack",
            "Tigrinya folding is lossy (its glottal characters are distinct); pass acknowledge_lossy=True to proceed",
        )
    m = class_map(scheme)
    folded_chars = []
    offsets = []
    for i, ch in enumerate(text):  # Python iterates by code point
        rep = m.get(ord(ch))
        folded_chars.append(ch if rep is None else chr(rep))
        offsets.append(i)
    return FoldResult(folded="".join(folded_chars), offsets=tuple(offsets), scheme=scheme, language=language)


def equal(a: str, b: str, language: str) -> bool:
    """Non-lossy comparison — exact code-point equality, no folding, no Unicode
    normalization. Valid for every language including ``GE_EZ``. Language is required
    as a Principle IV guard even though the result does not depend on it.
    """
    _require_language(language)
    return a == b


def folded_equal(a: str, b: str, language: str, scheme: str, *, acknowledge_lossy: bool = False) -> bool:
    """Fold both operands under one scheme and compare the folded keys. Subject to
    the same language rules as :func:`fold`."""
    fa = fold(a, language, scheme, acknowledge_lossy=acknowledge_lossy)
    fb = fold(b, language, scheme, acknowledge_lossy=acknowledge_lossy)
    return fa.folded == fb.folded


def keys_equal(x: FoldResult, y: FoldResult) -> bool:
    """Compare two already-folded results. Raises ``scheme_mismatch`` if they were
    folded under different schemes (Principle V / FR-008)."""
    if x.scheme != y.scheme:
        raise EquivalenceError("scheme_mismatch", f"cannot compare keys across schemes: {x.scheme} vs {y.scheme}")
    return x.folded == y.folded
