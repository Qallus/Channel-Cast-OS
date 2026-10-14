// Year-specific tax constants. Sources: IRS Rev. Proc. 2024-40 (2025) and
// Rev. Proc. 2025-32 (2026) as amended by P.L. 119-21 (the 2025 reconciliation
// act), IR-2025-128 (2026 mileage), SSA (wage base), Arizona DOR Form 140 (2025).
// A figure marked in `estimated` could not be confirmed from a primary source
// when this was written. The guide prints that list so nobody files on a guess.

import type { FilingStatus, TaxYear } from "./types.ts";

type ByStatus<T> = Record<FilingStatus, T>;

export type YearTable = {
  year: TaxYear;
  standardDeduction: ByStatus<number>;
  /** Upper edge of each bracket for 10, 12, 22, 24, 32, 35%; 37% above the last. */
  brackets: ByStatus<number[]>;
  ssWageBase: number;
  mileageRate: number;
  ctcPerChild: number;
  ctcRefundablePerChild: number;
  odcPerDependent: number;
  ctcPhaseoutStart: ByStatus<number>;
  /** EITC by number of qualifying children (0–3+). */
  eitc: { maxCredit: number[]; phaseInRate: number[]; phaseoutRate: number[]; phaseoutStart: number[]; mfjBump: number; investmentLimit: number };
  saltCap: number;
  saltPhaseStart: number;
  qbiThreshold: ByStatus<number>;
  qbiPhaseRange: ByStatus<number>;
  overtimeMax: ByStatus<number>;
  overtimePhaseStart: ByStatus<number>;
  carLoanMax: number;
  carLoanPhaseStart: ByStatus<number>;
  /** 2026+: charitable deduction for people who take the standard deduction. */
  nonItemizerCharity: ByStatus<number>;
  /** 2026+: itemized charitable gifts only count above 0.5% of AGI. */
  charityFloorPct: number;
  qualifyingRelativeIncomeLimit: number;
  az: { rate: number; depCreditUnder17: number; depCredit17Plus: number; depPhaseStart: ByStatus<number> };
  estimated: string[];
};

const S = (single: number, hoh: number, mfj: number, mfs: number): ByStatus<number> =>
  ({ single, head_of_household: hoh, married_joint: mfj, married_separate: mfs });

export const TAX_TABLES: Record<TaxYear, YearTable> = {
  2025: {
    year: 2025,
    standardDeduction: S(15750, 23625, 31500, 15750),
    brackets: {
      single: [11925, 48475, 103350, 197300, 250525, 626350],
      head_of_household: [17000, 64850, 103350, 197300, 250500, 626350],
      married_joint: [23850, 96950, 206700, 394600, 501050, 751600],
      married_separate: [11925, 48475, 103350, 197300, 250525, 375800],
    },
    ssWageBase: 176100,
    mileageRate: 0.70,
    ctcPerChild: 2200,
    ctcRefundablePerChild: 1700,
    odcPerDependent: 500,
    ctcPhaseoutStart: S(200000, 200000, 400000, 200000),
    eitc: {
      maxCredit: [649, 4328, 7152, 8046],
      phaseInRate: [0.0765, 0.34, 0.40, 0.45],
      phaseoutRate: [0.0765, 0.1598, 0.2106, 0.2106],
      phaseoutStart: [10620, 23350, 23350, 23350],
      mfjBump: 7110,
      investmentLimit: 11950,
    },
    saltCap: 40000,
    saltPhaseStart: 500000,
    qbiThreshold: S(197300, 197300, 394600, 197300),
    qbiPhaseRange: S(50000, 50000, 100000, 50000),
    overtimeMax: S(12500, 12500, 25000, 0),
    overtimePhaseStart: S(150000, 150000, 300000, 150000),
    carLoanMax: 10000,
    carLoanPhaseStart: S(100000, 100000, 200000, 100000),
    nonItemizerCharity: S(0, 0, 0, 0),
    charityFloorPct: 0,
    qualifyingRelativeIncomeLimit: 5200,
    az: { rate: 0.025, depCreditUnder17: 100, depCredit17Plus: 25, depPhaseStart: S(200000, 200000, 400000, 200000) },
    estimated: [
      "EITC amounts for 0, 1 or 3+ children are from the IRS 2025 table; the 2-child figures were double-checked.",
    ],
  },
  2026: {
    year: 2026,
    standardDeduction: S(16100, 24150, 32200, 16100),
    brackets: {
      single: [12400, 50400, 105700, 201775, 256225, 640600],
      head_of_household: [17700, 67450, 105700, 201775, 256200, 640600],
      married_joint: [24800, 100800, 211400, 403550, 512450, 768700],
      married_separate: [12400, 50400, 105700, 201775, 256225, 384350],
    },
    ssWageBase: 184500,
    mileageRate: 0.725,
    ctcPerChild: 2200,
    ctcRefundablePerChild: 1700,
    odcPerDependent: 500,
    ctcPhaseoutStart: S(200000, 200000, 400000, 200000),
    eitc: {
      // 2-child row from Rev. Proc. 2025-32; the others are the 2025 rows indexed by the same ratio.
      maxCredit: [664, 4427, 7316, 8231],
      phaseInRate: [0.0765, 0.34, 0.40, 0.45],
      phaseoutRate: [0.0765, 0.1598, 0.2106, 0.2106],
      phaseoutStart: [10860, 23890, 23890, 23890],
      mfjBump: 7270,
      investmentLimit: 12200,
    },
    saltCap: 40400,
    saltPhaseStart: 505000,
    qbiThreshold: S(201750, 201750, 403500, 201750),
    qbiPhaseRange: S(75000, 75000, 150000, 75000),
    overtimeMax: S(12500, 12500, 25000, 0),
    overtimePhaseStart: S(150000, 150000, 300000, 150000),
    carLoanMax: 10000,
    carLoanPhaseStart: S(100000, 100000, 200000, 100000),
    nonItemizerCharity: S(1000, 1000, 2000, 1000),
    charityFloorPct: 0.005,
    qualifyingRelativeIncomeLimit: 5300,
    az: { rate: 0.025, depCreditUnder17: 100, depCredit17Plus: 25, depPhaseStart: S(200000, 200000, 400000, 200000) },
    estimated: [
      "EITC for 0, 1 and 3+ children, the EITC married bump and investment-income limit (2-child amounts are confirmed).",
      "QBI threshold ($201,750 HOH) and the qualifying-relative income limit ($5,300).",
      "Arizona standard deduction assumed to keep matching the federal amount (Arizona confirms conformity each spring).",
    ],
  },
};

export const RATES = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];

export const FILING_STATUS_LABEL: Record<FilingStatus, string> = {
  single: "Single",
  head_of_household: "Head of household",
  married_joint: "Married filing jointly",
  married_separate: "Married filing separately",
};
