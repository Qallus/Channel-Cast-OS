/**
 * Mortgage vs. first-position HELOC math. Pure functions, no React.
 *
 * The payment is deliberately split: P&I is always derived from balance, rate
 * and months remaining, while taxes, insurance, mortgage insurance and HOA are
 * entered separately. Treating a quoted PITI number as principal and interest
 * would wildly overstate how fast the loan pays off.
 */

/** Simulations stop here; 50 years is long enough that anything beyond it is "never". */
export const MAX_MONTHS = 600;

export type Scenario = {
  /** Months to payoff, or null when the balance never reaches zero. */
  months: number | null;
  interest: number;
  /** Mortgage insurance paid over the life of the scenario; always 0 for a HELOC. */
  miPaid: number;
  /** Balance at the end of each year; index 0 is the starting balance. */
  series: number[];
  /** HELOC only: month-1 interest, i.e. the interest-only minimum payment. */
  firstInt?: number;
};

export type LoanType = "Conventional" | "FHA" | "VA" | "USDA";

export const LOAN_TYPES: LoanType[] = ["Conventional", "FHA", "VA", "USDA"];

export const MI_HINTS: Record<LoanType, string> = {
  Conventional:
    "PMI can usually be cancelled once the balance reaches 80% of the original value, and must drop at 78%. Estimate how many months that takes and enter it.",
  FHA: "FHA MIP stays for the life of the loan if the down payment was under 10%. With 10% or more down it ends after 11 years (132 months). Only a refinance removes it early.",
  VA: "VA loans have no monthly mortgage insurance. Leave it at 0.",
  USDA: "USDA annual fee stays for the life of the loan.",
};

/** Level P&I payment for a balance at an annual rate over a number of months. */
export function monthlyPayment(balance: number, annualRate: number, months: number): number {
  const i = annualRate / 12;
  if (months <= 0) return 0;
  if (i === 0) return balance / months;
  return (balance * i) / (1 - Math.pow(1 + i, -months));
}

/**
 * Fixed P&I amortization with optional extra principal.
 *
 * `extraFn` receives this month's mortgage insurance amount and returns the
 * extra principal to apply, so the extra grows automatically once MI drops off.
 * `miEnds` of null means mortgage insurance runs for the life of the loan.
 */
export function amortize(
  balance: number,
  annualRate: number,
  pi: number,
  extraFn: (miThisMonth: number) => number,
  mi: number,
  miEnds: number | null,
): Scenario {
  const i = annualRate / 12;
  let bal = balance;
  let interest = 0;
  let miPaid = 0;
  let m = 0;
  const series = [balance];
  while (bal > 0.005 && m < MAX_MONTHS) {
    const miThisMonth = miEnds === null || m < miEnds ? mi : 0;
    const int = bal * i;
    const pay = Math.min(pi + extraFn(miThisMonth), bal + int);
    if (pay <= int) break; // payment never covers interest, so the balance never falls
    interest += int;
    miPaid += miThisMonth;
    bal = bal + int - pay;
    m++;
    if (m % 12 === 0) series.push(Math.max(bal, 0));
  }
  const done = bal <= 0.005;
  if (done && m % 12 !== 0) series.push(0);
  return { months: done ? m : null, interest, miPaid, series };
}

/**
 * First-position HELOC. All take-home income is deposited each month and living
 * expenses, taxes, insurance and HOA are drawn back out. Interest is charged on
 * the average balance for the month — income lands at the start, draws bleed out
 * through the month — which is where the acceleration comes from.
 */
export function helocScenario(
  balance: number,
  annualRate: number,
  income: number,
  draws: number,
  annualFee: number,
): Scenario {
  const i = annualRate / 12;
  let bal = balance;
  let interest = 0;
  let m = 0;
  let firstInt: number | undefined;
  const series = [balance];
  while (bal > 0.005 && m < MAX_MONTHS) {
    if (m > 0 && m % 12 === 0) bal += annualFee;
    const avg = Math.max(bal - income + draws / 2, 0);
    const int = avg * i;
    if (firstInt === undefined) firstInt = int;
    interest += int;
    bal = bal - income + draws + int;
    m++;
    if (m % 12 === 0) series.push(Math.max(bal, 0));
    if (bal >= balance * 1.5) break; // runaway balance, treat as never
  }
  const done = bal <= 0.005;
  if (done && m % 12 !== 0) series.push(0);
  return { months: done ? m : null, interest, miPaid: 0, series, firstInt };
}

/** Total out-of-pocket cost used for the "saved vs." comparisons. */
export function cost(s: Scenario): number {
  return s.interest + s.miPaid;
}

/* ── Inputs and wiring ───────────────────────────────────────────────── */

/**
 * Raw form state. Numbers are already parsed; `mortPayment` and `miEnds` are
 * null when the field is blank (auto-computed P&I / MI for the life of the loan).
 */
export type HelocInputs = {
  loanType: LoanType;
  homeValue: number;
  balance: number;
  /** Annual rate as a percentage, e.g. 3 for 3%. */
  mortRate: number;
  monthsLeft: number;
  /** Principal & interest only — never PITI. Null means use the computed value. */
  mortPayment: number | null;
  taxes: number;
  insurance: number;
  mi: number;
  hoa: number;
  miEnds: number | null;
  income: number;
  expenses: number;
  /** Annual rate as a percentage, e.g. 8.25 for 8.25%. */
  helocRate: number;
  /** Max combined LTV as a percentage, e.g. 90 for 90%. */
  maxLtv: number;
  closing: number;
  annualFee: number;
};

export const DEFAULT_INPUTS: HelocInputs = {
  loanType: "FHA",
  homeValue: 450000,
  balance: 200000,
  mortRate: 3,
  monthsLeft: 324,
  mortPayment: null,
  taxes: 250,
  insurance: 150,
  mi: 140,
  hoa: 0,
  miEnds: null,
  income: 9500,
  expenses: 5500,
  helocRate: 8.25,
  maxLtv: 90,
  closing: 3500,
  annualFee: 75,
};

export type HelocResults = {
  /** P&I actually used — the override when present, otherwise `autoPI`. */
  pi: number;
  autoPI: number;
  escrow: number;
  piti: number;
  /** Cash flow before any housing cost. */
  cfGross: number;
  /** Left over after the full PITI payment. */
  cfNet: number;
  /** Pulled from the line each month under the HELOC scenario. */
  helocDraws: number;
  /** Effective HELOC payment: everything income does not have to cover. */
  cfHeloc: number;
  lineNeeded: number;
  /** Combined LTV of the line needed against today's home value. */
  cltv: number;
  /** Today's mortgage balance against home value. */
  ltvNow: number;
  ltvOk: boolean;
  base: Scenario;
  extra: Scenario;
  heloc: Scenario;
  /** Monthly payment shown on the extra-principal card (PITI + extra). */
  extraPayment: number;
  /** Fewest months among the three scenarios, or null if none ever pay off. */
  bestMonths: number | null;
};

/** Everything the UI needs, derived from the form state in one pass. */
export function computeScenarios(input: HelocInputs): HelocResults {
  const mortRate = input.mortRate / 100;
  const helocRate = input.helocRate / 100;
  const maxLtv = input.maxLtv / 100;

  const autoPI = monthlyPayment(input.balance, mortRate, input.monthsLeft);
  const pi = input.mortPayment || autoPI;
  const escrow = input.taxes + input.insurance + input.mi + input.hoa;
  const piti = pi + escrow;

  const cfGross = input.income - input.expenses;
  const cfNet = cfGross - piti;
  const helocDraws = input.expenses + input.taxes + input.insurance + input.hoa;
  const cfHeloc = input.income - helocDraws;

  const lineNeeded = input.balance + input.closing;
  const cltv = input.homeValue ? lineNeeded / input.homeValue : 0;
  const ltvNow = input.homeValue ? input.balance / input.homeValue : 0;

  const base = amortize(input.balance, mortRate, pi, () => 0, input.mi, input.miEnds);
  // Extra principal is whatever is left after the month's real PITI, so it grows
  // the month mortgage insurance drops off.
  const extra = amortize(
    input.balance,
    mortRate,
    pi,
    (miNow) => Math.max(cfGross - pi - input.taxes - input.insurance - input.hoa - miNow, 0),
    input.mi,
    input.miEnds,
  );
  const heloc = helocScenario(lineNeeded, helocRate, input.income, helocDraws, input.annualFee);

  const best = Math.min(...[base, extra, heloc].map((s) => s.months ?? Infinity));

  return {
    pi,
    autoPI,
    escrow,
    piti,
    cfGross,
    cfNet,
    helocDraws,
    cfHeloc,
    lineNeeded,
    cltv,
    ltvNow,
    ltvOk: cltv <= maxLtv,
    base,
    extra,
    heloc,
    extraPayment: Math.max(cfGross - input.taxes - input.insurance - input.hoa, piti),
    bestMonths: best === Infinity ? null : best,
  };
}
