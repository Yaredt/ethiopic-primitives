"""Ethiopian calendar — a thin wrapper over ``py-ethiopian-date-converter``.

Constitution Principle III: ``py-ethiopian-date-converter`` passed 16,801/16,801
days in both directions and is a DEPENDENCY, NOT A REFERENCE. This module MUST
NOT reimplement calendar conversion; it only adapts the dependency's API to the
shared Layer-0 surface and adds the Amete Alem era offset (pure +/- 5500 years,
which is era arithmetic, not calendar conversion).

Principle VI: month 13 (Pagumē) is first-class. ``EthiopianDate`` carries
``month: 1..13`` and never collapses Pagumē; ``to_gregorian`` returns a
``datetime.date`` (Gregorian has no 13th month), but the *Ethiopian* type here is
never a ``datetime.date``.

Principle VIII: pure and deterministic. No network, no locale, no ambient clock.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import date, datetime

from ethiopian_date_converter.ethiopian_date_convertor import (
    create_ethiopian_date_from_parts,
    ethiopian_month_length,
    is_valid_ethiopian_date,
    to_ethiopian,
    to_gregorian,
)

_ALEM_OFFSET = 5500


class Era(enum.Enum):
    """Ethiopian eras. Amete Alem runs 5500 years ahead of Amete Mihret."""

    AMETE_MIHRET = "AMETE_MIHRET"
    AMETE_ALEM = "AMETE_ALEM"


def _to_mihret_year(year: int, era: Era) -> int:
    return year - _ALEM_OFFSET if era is Era.AMETE_ALEM else year


def _from_mihret_year(mihret_year: int, era: Era) -> int:
    return mihret_year + _ALEM_OFFSET if era is Era.AMETE_ALEM else mihret_year


@dataclass(frozen=True)
class EthiopianDate:
    """An Ethiopian calendar date. ``month`` is 1..13; 13 is Pagumē.

    Immutable. Conversion is delegated entirely to the dependency; this class
    performs no date arithmetic of its own beyond the era offset.
    """

    year: int
    month: int
    day: int
    era: Era = Era.AMETE_MIHRET

    def __post_init__(self) -> None:
        if not all(isinstance(v, int) for v in (self.year, self.month, self.day)):
            raise TypeError("year, month and day must be ints")
        if not (1 <= self.month <= 13):
            raise ValueError(f"month must be 1..13 (13 = Pagumē), got {self.month}")
        # Validate via the dependency, in Amete Mihret numbering.
        mihret_year = _to_mihret_year(self.year, self.era)
        if not is_valid_ethiopian_date(self.day, self.month, mihret_year):
            raise ValueError(
                f"invalid Ethiopian date {self.year}-{self.month:02d}-{self.day:02d} "
                f"({self.era.value})"
            )

    # -- conversion (delegated) ------------------------------------------

    def to_gregorian(self) -> date:
        """This date as a proleptic Gregorian ``datetime.date``."""
        eth = create_ethiopian_date_from_parts(
            self.day, self.month, _to_mihret_year(self.year, self.era)
        )
        return to_gregorian(eth).date()

    @classmethod
    def from_gregorian(cls, d: date, era: Era = Era.AMETE_MIHRET) -> "EthiopianDate":
        """Convert a Gregorian ``date`` to Ethiopian, in the requested era."""
        eth = to_ethiopian(datetime(d.year, d.month, d.day))
        return cls(_from_mihret_year(eth.year, era), eth.month, eth.day, era)

    # -- arithmetic (delegated through the dependency) -------------------

    def add_days(self, n: int) -> "EthiopianDate":
        """A new date ``n`` real days later (delegated via Gregorian)."""
        if not isinstance(n, int):
            raise TypeError("n must be an int")
        return EthiopianDate.from_gregorian(
            date.fromordinal(self.to_gregorian().toordinal() + n), self.era
        )

    def add_months(self, n: int) -> "EthiopianDate":
        """A new date ``n`` months later, clamping the day into the target month.

        Matches the TypeScript ``addMonths`` semantics: adding a month to a 30-day
        month that lands on Pagumē clamps to Pagumē 5 or 6. The 13-month structure
        and month length come from the dependency (``ethiopian_month_length``);
        this method only does the month/year rollover and the clamp.
        """
        if not isinstance(n, int):
            raise TypeError("n must be an int")
        zero_based = (self.month - 1) + n
        year_delta, month_index = divmod(zero_based, 13)  # Python divmod floors
        month = month_index + 1
        year = self.year + year_delta
        length = ethiopian_month_length(month, _to_mihret_year(year, self.era))
        day = min(self.day, length)
        return EthiopianDate(year, month, day, self.era)

    def days_until(self, other: "EthiopianDate") -> int:
        """Whole days from this date to ``other`` (``other - self``)."""
        return other.to_gregorian().toordinal() - self.to_gregorian().toordinal()

    # -- calendar predicates ---------------------------------------------

    def is_leap_year(self) -> bool:
        """True when this year is an Ethiopian leap year (Pagumē has 6 days)."""
        return _to_mihret_year(self.year, self.era) % 4 == 3

    def weekday(self) -> int:
        """Day of week: 0 = Monday .. 6 = Sunday (ISO-8601)."""
        return self.to_gregorian().weekday()

    def to_era(self, era: Era) -> "EthiopianDate":
        """This same instant expressed in another era."""
        if era is self.era:
            return self
        mihret_year = _to_mihret_year(self.year, self.era)
        return EthiopianDate(_from_mihret_year(mihret_year, era), self.month, self.day, era)

    def __str__(self) -> str:
        return f"{self.year}-{self.month:02d}-{self.day:02d}"
