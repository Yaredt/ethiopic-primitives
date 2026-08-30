"""Ethiopian fiscal logic — pure derivation on top of the calendar core.

Mirrors ``javascript/src/fiscal.ts`` exactly. The Ethiopian fiscal year runs
Hamle 1 (month 11) through Sene 30 (month 10 of the following year), per MoFED.

No calendar conversion or day counting happens here; everything reduces to a
date's (year, month) or to the calendar core's ``days_until`` (Constitution
Principle III). Pagumē (month 13) is a first-class accounting period
(Principle VI).

The three unverified conventions A1/A2/A3 live in ``_Convention`` below — the
single swap point. A disagreement surfaced by the externally authored
``tests/vectors/fiscal.json`` is corrected here, never in the fiscal functions
(see specs/002-fiscal-logic/research.md).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from .calendar import EthiopianDate

# Hamle — first month of the fiscal year (Ethiopian calendar month 11).
_HAMLE = 11


class _Convention:
    """A1/A2/A3 — informed defaults, isolated for one-file validation."""

    @staticmethod
    def label_for_start_year(start_year: int) -> int:
        # A1 — start-year labelling. Alternative to validate: start_year + 1.
        return start_year

    @staticmethod
    def start_year_for_label(label: int) -> int:
        return label

    @staticmethod
    def period_of(month: int) -> int:
        # A2 — period = calendar month; Pagumē = 13. Alternative: chrono from Hamle.
        if not (1 <= month <= 13):
            raise ValueError(f"month must be 1..13, got {month}")
        return month

    @staticmethod
    def quarter_of(month: int) -> int:
        # A3 — 3-month blocks of the 30-day months from Hamle; Pagumē(13) -> Q1.
        if month in (11, 12, 1, 13):
            return 1
        if month in (2, 3, 4):
            return 2
        if month in (5, 6, 7):
            return 3
        if month in (8, 9, 10):
            return 4
        raise ValueError(f"month must be 1..13, got {month}")


@dataclass(frozen=True)
class AgingResult:
    """The result of aging one invoice as of a reporting date."""

    days: int          # real elapsed days from invoice to as-of (calendar core)
    bucket_index: int  # 0-based; the last index (== len(thresholds)) is overflow
    label: str         # e.g. "0-30", "31-60", "61-90", "90+"


def fiscal_year_for(date: EthiopianDate) -> int:
    """The fiscal-year label containing ``date`` (Hamle 1 – Sene 30)."""
    start_year = date.year if date.month >= _HAMLE else date.year - 1
    return _Convention.label_for_start_year(start_year)


def fiscal_year_bounds(fy: int) -> tuple[EthiopianDate, EthiopianDate]:
    """Start (Hamle 1) and end (Sene 30 of the next year) of fiscal year ``fy``."""
    start_year = _Convention.start_year_for_label(fy)
    return (
        EthiopianDate(start_year, _HAMLE, 1),
        EthiopianDate(start_year + 1, 10, 30),
    )


def fiscal_quarter(date: EthiopianDate) -> int:
    """Fiscal quarter (1–4) of ``date``; Q1 begins Hamle 1."""
    return _Convention.quarter_of(date.month)


def fiscal_period(date: EthiopianDate) -> int:
    """Accounting period (1–13) of ``date``; period 13 is Pagumē, never merged."""
    return _Convention.period_of(date.month)


def aging_bucket(
    invoice: EthiopianDate,
    as_of: EthiopianDate,
    buckets: Sequence[int] = (30, 60, 90),
) -> AgingResult:
    """Age an invoice as of a reporting date, in REAL elapsed days across Pagumē.

    ``buckets`` are ascending upper bounds (default 30/60/90). Returns the first
    bucket whose bound the age does not exceed, else the overflow bucket. Raises
    if ``as_of`` precedes ``invoice`` (a negative age is a caller error).
    """
    days = invoice.days_until(as_of)
    if days < 0:
        raise ValueError(f"as-of date precedes invoice date (age {days} days)")
    ordered = sorted(buckets)
    bucket_index = next((i for i, t in enumerate(ordered) if days <= t), len(ordered))
    return AgingResult(days=days, bucket_index=bucket_index, label=_bucket_label(ordered, bucket_index))


def _bucket_label(ordered: list[int], index: int) -> str:
    if not ordered:
        return "0+"
    if index == 0:
        return f"0-{ordered[0]}"
    if index >= len(ordered):
        return f"{ordered[-1] + 1}+"
    return f"{ordered[index - 1] + 1}-{ordered[index]}"
