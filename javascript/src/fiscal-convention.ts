/**
 * Fiscal conventions A1/A2/A3 — the single swap point.
 *
 * These three rules are NOT settled by a Tier-1 source yet (see
 * specs/002-fiscal-logic/research.md). They are informed defaults, isolated here
 * so that a disagreement surfaced by the externally authored `tests/vectors/fiscal.json`
 * is corrected in this one file — never by editing the fiscal functions.
 */

/** A fiscal quarter. */
export type Quarter = 1 | 2 | 3 | 4;

export const FiscalConvention = {
  /**
   * A1 — fiscal-year label = the Ethiopian year in which the opening Hamle 1 falls
   * (start-year labelling). Alternative to validate: end-year (startYear + 1).
   */
  labelForStartYear(startYear: number): number {
    return startYear;
  },
  /** Inverse of {@link labelForStartYear}. */
  startYearForLabel(label: number): number {
    return label;
  },

  /**
   * A2 — accounting period = Ethiopian calendar month number, so Meskerem = 1 …
   * Nähase = 12, Pagumē = 13. Makes "period 13 is Pagumē" literally true.
   * Alternative to validate: fiscal-chronological numbering from Hamle = 1.
   */
  periodOf(month: number): number {
    if (month < 1 || month > 13) {
      throw new RangeError(`month must be 1..13, got ${month}`);
    }
    return month;
  },

  /**
   * A3 — quarters are three-month blocks of the twelve 30-day months in
   * fiscal-chronological order from Hamle; Pagumē (month 13), which falls between
   * Nähase and Meskerem, joins Q1. Alternative to validate: Pagumē → Q4.
   *
   * Q1 = Hamle(11), Nähase(12), Meskerem(1) [+ Pagumē(13)]
   * Q2 = Tikimt(2), Hidar(3), Tahsas(4)
   * Q3 = Tir(5), Yekatit(6), Megabit(7)
   * Q4 = Miyazya(8), Ginbot(9), Sene(10)
   */
  quarterOf(month: number): Quarter {
    switch (month) {
      case 11:
      case 12:
      case 1:
      case 13:
        return 1;
      case 2:
      case 3:
      case 4:
        return 2;
      case 5:
      case 6:
      case 7:
        return 3;
      case 8:
      case 9:
      case 10:
        return 4;
      default:
        throw new RangeError(`month must be 1..13, got ${month}`);
    }
  },
} as const;
