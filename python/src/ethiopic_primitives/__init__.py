"""ethiopic-primitives — deterministic Ethiopian calendar Layer-0 primitives.

Calendar conversion is delegated to ``py-ethiopian-date-converter`` (Constitution
Principle III); this package adapts it to the shared, cross-language surface and
runs the same JSON conformance vectors as the JavaScript implementation.
"""

from .calendar import EthiopianDate, Era
from .fiscal import (
    AgingResult,
    aging_bucket,
    fiscal_period,
    fiscal_quarter,
    fiscal_year_bounds,
    fiscal_year_for,
)
from .numerals import (
    GEEZ_MAX,
    GeezNumeralError,
    format_money,
    from_geez,
    to_geez,
)
from .equivalence import (
    EquivalenceError,
    FoldResult,
    FoldScheme,
    Language,
    equal,
    fold,
    folded_equal,
    keys_equal,
)

__all__ = [
    "EquivalenceError",
    "FoldResult",
    "FoldScheme",
    "Language",
    "equal",
    "fold",
    "folded_equal",
    "keys_equal",
    "EthiopianDate",
    "Era",
    "AgingResult",
    "aging_bucket",
    "fiscal_period",
    "fiscal_quarter",
    "fiscal_year_bounds",
    "fiscal_year_for",
    "GEEZ_MAX",
    "GeezNumeralError",
    "format_money",
    "from_geez",
    "to_geez",
]
