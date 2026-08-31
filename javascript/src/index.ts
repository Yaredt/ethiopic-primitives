/**
 * @ethiopic-primitives/calendar — deterministic Ethiopian calendar conversion.
 *
 * Layer 0: pure functions only. No model calls, no network, no dependence on
 * ambient locale, timezone, or the system clock (Constitution Principle VIII).
 */

export {
  gregorianToJdn,
  jdnToGregorian,
  jdnWeekday,
  type GregorianDate,
} from "./jdn.ts";

export {
  EthiopianDate,
  Era,
  ETHIOPIC_EPOCH_JDN,
} from "./calendar.ts";

export {
  fiscalYearFor,
  fiscalYearBounds,
  fiscalQuarter,
  fiscalPeriod,
  agingBucket,
  type AgingResult,
} from "./fiscal.ts";

export { FiscalConvention, type Quarter } from "./fiscal-convention.ts";

export {
  toGeez,
  fromGeez,
  formatMoney,
  GeezNumeralError,
  GEEZ_MAX,
  type GeezNumeralReason,
  type MoneyOptions,
} from "./numerals.ts";

export {
  fold,
  equal,
  foldedEqual,
  keysEqual,
  Language,
  FoldScheme,
  EquivalenceError,
  type EquivalenceReason,
  type FoldResult,
  type FoldOptions,
} from "./equivalence.ts";
