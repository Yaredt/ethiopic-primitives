// Fixed seed ledger (illustrative content, NOT a conformance vector — Principle I).
// Raw {year, month, day, description, amount}; ledger.js builds the EthiopianDate so
// date validation lives in one place. Descriptions include Pagumē (month 13) and
// Amharic homophone variants (e.g. the "h" family) so the folded search is meaningful
// on first load. The app asserts no folded/collated result as truth.
export const SEED = [
  { year: 2016, month: 1, day: 5, description: "የቢሮ ኪራይ — Meskerem office rent", amount: 12000 },
  { year: 2016, month: 5, day: 20, description: "የሀኪም ምክር (advice, spelled with ሀ)", amount: 300 },
  { year: 2016, month: 8, day: 15, description: "የሰነድ ማተሚያ — document printing", amount: 250 },
  { year: 2016, month: 10, day: 30, description: "ደመወዝ — Sene 30 salary", amount: 45000 },
  { year: 2016, month: 13, day: 3, description: "የፓጉሜ ወጪ — Pagumē (month 13) expense", amount: 800 },
  { year: 2017, month: 1, day: 2, description: "የሐኪም ክፍያ (payment, spelled with ሐ)", amount: 1500 },
  { year: 2017, month: 3, day: 11, description: "የመኪና ጥገና — vehicle maintenance", amount: 6400 },
];
