// Financing — the personal + small-business tax workbook behind Billing → Financing.
//
// Everything here is plain data. It is stored through /api/finance (admin-only,
// scoped to the signed-in user) — never through the open /api/crm store, and never
// seeded from the repo: the repo is public and these records carry family and tax
// details.

export type TaxYear = 2024 | 2025 | 2026 | 2027;
export const TAX_YEARS: TaxYear[] = [2024, 2025, 2026, 2027];

export type FilingStatus = "single" | "head_of_household" | "married_joint" | "married_separate";

/** A free-form label/value pair. Every record carries a repeater of these for anything the form didn't anticipate. */
export type CustomField = { id: string; label: string; value: string };

/** One ledger line. Positive amounts; the category decides whether it is money in or out. */
export type FinEntry = {
  id: string;
  ownerId?: string;
  date: string;            // ISO yyyy-mm-dd
  description: string;
  amount: number;          // always ≥ 0
  direction?: "in" | "out"; // as it appeared on the statement — a hint while the row is uncategorized
  category: string;        // a CategoryId, or a custom category id from the profile
  business?: string;       // Business.id — which Schedule C it lands on
  account?: string;        // "Amex Business Gold", "Chase checking", …
  vendor?: string;
  businessUsePct?: number; // 0–100; a mixed-use purchase (phone, laptop) only counts this share
  tags?: string[];
  custom?: CustomField[];
  notes?: string;
  receiptPath?: string;    // private storage path — opened through a signed link
  source?: "manual" | "csv" | "statement" | "receipt" | "invoice" | "ai";
  importKey?: string;      // date|amount|description fingerprint, used to skip duplicates on re-import
  reviewed?: boolean;
  createdAt: string;
};

/** IRS-grade mileage log row (date, places, purpose, miles). */
export type MileageTrip = {
  id: string;
  ownerId?: string;
  date: string;
  from: string;
  to: string;
  purpose: string;
  miles: number;
  roundTrip?: boolean;
  business?: string;
  vehicle?: string;
  custom?: CustomField[];
  createdAt: string;
};

/** Time log. Unbilled time is tracked for insight only — the IRS doesn't let you deduct the value of your own labor. */
export type TimeLog = {
  id: string;
  ownerId?: string;
  date: string;
  client: string;
  description: string;
  hours: number;
  rate: number;
  billed: boolean;         // false = given away / written off
  category?: "client" | "rnd" | "sales" | "admin";
  business?: string;
  custom?: CustomField[];
  createdAt: string;
};

export type Dependent = {
  id: string;
  name: string;
  relationship: "son" | "daughter" | "stepchild" | "foster_child" | "fiancee" | "partner" | "parent" | "sibling" | "other";
  birthDate: string;          // ISO; age at Dec 31 decides CTC (<17) vs. other-dependent credit
  monthsLivedWithYou: number; // 0–12
  hasSsn: boolean;            // CTC requires an SSN valid for work
  grossIncome?: number;       // qualifying-relative test
  student?: boolean;
  disabled?: boolean;
  ssnLast4?: string;          // last four only — never the full number
  notes?: string;
};

export type W2Job = {
  id: string;
  employer: string;
  ein?: string;
  wages: number;              // box 1
  fedWithheld: number;        // box 2
  ssWages: number;            // box 3
  medicareWages: number;      // box 5
  stateWages: number;         // box 16
  stateWithheld: number;      // box 17
  retirement401k?: number;    // box 12 code D/E — already excluded from box 1
  qualifiedOvertime?: number; // the "half" premium of FLSA overtime — the 2025–2028 overtime deduction
  custom?: CustomField[];
};

export type Business = {
  id: string;
  name: string;
  entity: "sole_prop" | "single_member_llc";
  einLast4?: string;
  activity: string;           // principal business or profession
  naicsCode?: string;         // Schedule C line B
  startedYear?: number;       // used by the hobby-loss check
  accountingMethod: "cash" | "accrual";
  isServiceBusiness?: boolean; // consulting/professional — matters for QBI above the threshold
};

export type EstimatedPayment = { id: string; date: string; jurisdiction: "federal" | "arizona"; amount: number; note?: string };

export type HomeOffice = {
  enabled: boolean;
  method: "simplified" | "actual";
  homeSqft: number;
  officeSqft: number;
  business?: string;          // which Schedule C carries Form 8829 / the simplified deduction
  monthsUsed: number;         // 1–12
};

export type Vehicle = {
  method: "standard" | "actual";
  description: string;
  placedInService?: string;
  totalMiles: number;         // all miles driven in the year — business % = business miles / total
  commuteMiles?: number;
};

/** "Contains ADOBE → Software" rules applied on import before the AI ever sees a row. */
export type CategoryRule = { id: string; match: string; category: string; business?: string; businessUsePct?: number };

export type CustomCategory = { id: string; label: string; kind: "income" | "expense" | "personal"; line: string };

export type PriorYearResult = { id: string; year: number; netProfit: number };

export type FinProfile = {
  id: "profile";
  ownerId?: string;
  taxYear: TaxYear;
  taxpayer: { name: string; occupation: string; birthDate?: string; blind?: boolean };
  filingStatus: FilingStatus;
  state: "AZ";
  dependents: Dependent[];
  w2Jobs: W2Job[];
  businesses: Business[];
  estimatedPayments: EstimatedPayment[];
  homeOffice: HomeOffice;
  vehicle: Vehicle;
  /** Above-the-line adjustments and other inputs the ledger doesn't carry. */
  adjustments: {
    retirementContrib: number;     // SEP-IRA / Solo 401(k) employer contributions
    traditionalIra: number;
    seHealthInsurance: number;     // self-employed health premiums
    hsa: number;
    studentLoanInterest: number;
    carLoanInterest: number;       // 2025–2028: new US-assembled personal vehicle
    otherIncome: number;           // 1099-MISC prizes, etc.
    capitalGains: number;          // net; negative for a loss
    priorYearFederalTax: number;   // drives the safe-harbor estimate
    priorYearAgi: number;
    childcareExpenses: number;     // Form 2441
    arizonaPrivateSchoolCredit?: number;
    arizonaCharitableCredit?: number;
  };
  priorYears: PriorYearResult[];
  rules: CategoryRule[];
  customCategories: CustomCategory[];
  custom: CustomField[];
  updatedAt?: string;
};

export const FINANCE_COLLECTIONS = ["fin_entries", "fin_trips", "fin_time", "fin_profile"] as const;
export type FinanceCollection = (typeof FINANCE_COLLECTIONS)[number];
export const isFinanceCollection = (v: string): v is FinanceCollection => (FINANCE_COLLECTIONS as readonly string[]).includes(v);

export function newId(prefix = "fin"): string {
  const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

/**
 * Starting point for a new profile. Generic labels only — the real names and
 * dates are filled in on the Tax profile tab and live in the database.
 */
export function defaultProfile(): FinProfile {
  return {
    id: "profile",
    taxYear: 2026,
    taxpayer: { name: "", occupation: "" },
    filingStatus: "head_of_household",
    state: "AZ",
    dependents: [
      { id: newId("dep"), name: "Child 1", relationship: "son", birthDate: "", monthsLivedWithYou: 12, hasSsn: true },
      { id: newId("dep"), name: "Child 2", relationship: "daughter", birthDate: "", monthsLivedWithYou: 12, hasSsn: true },
      { id: newId("dep"), name: "Fiancée", relationship: "fiancee", birthDate: "", monthsLivedWithYou: 12, hasSsn: true, grossIncome: 0 },
    ],
    w2Jobs: [],
    businesses: [{ id: "biz_main", name: "Channel Cast", entity: "single_member_llc", activity: "Audio advertising network / software", accountingMethod: "cash", isServiceBusiness: false }],
    estimatedPayments: [],
    homeOffice: { enabled: false, method: "simplified", homeSqft: 0, officeSqft: 0, business: "biz_main", monthsUsed: 12 },
    vehicle: { method: "standard", description: "", totalMiles: 0 },
    adjustments: {
      retirementContrib: 0, traditionalIra: 0, seHealthInsurance: 0, hsa: 0, studentLoanInterest: 0, carLoanInterest: 0,
      otherIncome: 0, capitalGains: 0, priorYearFederalTax: 0, priorYearAgi: 0, childcareExpenses: 0,
    },
    priorYears: [],
    rules: [],
    customCategories: [],
    custom: [],
  };
}

/** Fill any fields an older saved profile is missing, so new features never crash on old data. */
export function normalizeProfile(p: Partial<FinProfile> | null | undefined): FinProfile {
  const d = defaultProfile();
  if (!p) return d;
  return {
    ...d,
    ...p,
    id: "profile",
    taxpayer: { ...d.taxpayer, ...(p.taxpayer ?? {}) },
    homeOffice: { ...d.homeOffice, ...(p.homeOffice ?? {}) },
    vehicle: { ...d.vehicle, ...(p.vehicle ?? {}) },
    adjustments: { ...d.adjustments, ...(p.adjustments ?? {}) },
    dependents: p.dependents ?? d.dependents,
    w2Jobs: p.w2Jobs ?? [],
    businesses: p.businesses?.length ? p.businesses : d.businesses,
    estimatedPayments: p.estimatedPayments ?? [],
    priorYears: p.priorYears ?? [],
    rules: p.rules ?? [],
    customCategories: p.customCategories ?? [],
    custom: p.custom ?? [],
  };
}
