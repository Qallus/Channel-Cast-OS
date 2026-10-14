// The tax engine: ledger + logs + profile → Schedule C per business, Schedule SE,
// federal Form 1040 estimate, and Arizona Form 140 estimate. Pure functions, no
// I/O, so the same numbers drive the dashboard, the printed guide and the AI.
//
// It is an organizer's estimate, not a filed return. Simplifications are listed
// in `notes` on the result so they print alongside the numbers.

import { CATEGORIES, categoryOf, type CategoryDef } from "./categories.ts";
import { RATES, TAX_TABLES, type YearTable } from "./tax-tables.ts";
import type { Dependent, FilingStatus, FinEntry, FinProfile, MileageTrip, TaxYear, TimeLog } from "./types.ts";

const r2 = (n: number) => Math.round(n * 100) / 100;
const pos = (n: number) => Math.max(0, n);

export function inYear(date: string | undefined, year: number): boolean {
  return Boolean(date && date.slice(0, 4) === String(year));
}

/** Age on Dec 31 of the tax year; null when the birth date is unknown. */
export function ageAtYearEnd(birthDate: string, year: number): number | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(birthDate || "")) return null;
  return year - Number(birthDate.slice(0, 4));
}

/** The deductible part of one entry: business-use share × category limit (meals 50%). */
export function deductibleAmount(e: FinEntry, cat: CategoryDef): number {
  const use = e.businessUsePct == null ? 100 : Math.min(100, Math.max(0, e.businessUsePct));
  return (Number(e.amount) || 0) * (use / 100) * ((cat.deductiblePct ?? 100) / 100);
}

export function bracketTax(taxable: number, brackets: number[]): number {
  let tax = 0;
  let lower = 0;
  for (let i = 0; i < RATES.length; i++) {
    const upper = i < brackets.length ? brackets[i] : Infinity;
    if (taxable <= lower) break;
    tax += (Math.min(taxable, upper) - lower) * RATES[i];
    lower = upper;
  }
  return r2(tax);
}

export function marginalRate(taxable: number, brackets: number[]): number {
  for (let i = 0; i < brackets.length; i++) if (taxable <= brackets[i]) return RATES[i];
  return RATES[RATES.length - 1];
}

// ── Dependents ────────────────────────────────────────────────────────────
export type DependentResult = {
  id: string;
  name: string;
  age: number | null;
  credit: "ctc" | "odc" | "none";
  federalAmount: number;
  azCredit: number;
  qualifyingChild: boolean;
  qualifiesForHoh: boolean;
  reasons: string[];
};

const CHILD_RELATIONSHIPS = new Set(["son", "daughter", "stepchild", "foster_child", "sibling"]);

export function classifyDependent(dep: Dependent, year: TaxYear, t: YearTable): DependentResult {
  const age = ageAtYearEnd(dep.birthDate, year);
  const reasons: string[] = [];
  const isChildRel = CHILD_RELATIONSHIPS.has(dep.relationship);
  const livedHalf = (dep.monthsLivedWithYou ?? 0) > 6;
  const youngEnough = age != null && (age < 19 || (age < 24 && dep.student) || dep.disabled);
  const qualifyingChild = isChildRel && livedHalf && Boolean(youngEnough);

  let credit: DependentResult["credit"] = "none";
  if (qualifyingChild && age != null && age < 17 && dep.hasSsn) {
    credit = "ctc";
    reasons.push(`Qualifying child under 17 — Child Tax Credit $${t.ctcPerChild.toLocaleString()}.`);
  } else if (qualifyingChild) {
    credit = "odc";
    reasons.push(age == null ? "Birth date missing — counted as other dependent until it's entered." : `Qualifying child age ${age} — $${t.odcPerDependent} credit for other dependents.`);
  } else if (isChildRel && !livedHalf) {
    reasons.push("Lived with you 6 months or less — not your qualifying child this year (custody rules may apply; Form 8332).");
  } else {
    // Qualifying relative: a non-relative must live with you the entire year.
    const allYear = (dep.monthsLivedWithYou ?? 0) >= 12;
    const incomeOk = (dep.grossIncome ?? 0) < t.qualifyingRelativeIncomeLimit;
    if (dep.relationship === "fiancee" || dep.relationship === "partner" || dep.relationship === "other") {
      if (!allYear) reasons.push("A non-relative must live with you all 12 months to be your dependent.");
      if (!incomeOk) reasons.push(`Gross income must be under $${t.qualifyingRelativeIncomeLimit.toLocaleString()} for ${year}.`);
      reasons.push("You must provide more than half of their total support for the year.");
    } else if (!incomeOk) {
      reasons.push(`Gross income must be under $${t.qualifyingRelativeIncomeLimit.toLocaleString()} for ${year}.`);
    }
    if (allYear && incomeOk) {
      credit = "odc";
      reasons.unshift(`Qualifying relative — $${t.odcPerDependent} credit for other dependents (if you provide over half their support).`);
    }
  }

  const federalAmount = credit === "ctc" ? t.ctcPerChild : credit === "odc" ? t.odcPerDependent : 0;
  const azCredit = credit === "none" ? 0 : age != null && age < 17 ? t.az.depCreditUnder17 : t.az.depCredit17Plus;
  // A qualifying child, or a dependent *relative*, makes you a head of household. A fiancée never does.
  const nonRelative = ["fiancee", "partner", "other"].includes(dep.relationship);
  const qualifiesForHoh = qualifyingChild || (credit === "odc" && !nonRelative && (dep.relationship === "parent" || livedHalf));
  if (dep.relationship === "fiancee" || dep.relationship === "partner") reasons.push("Does not make you eligible for head of household — your children do.");
  return { id: dep.id, name: dep.name, age, credit, federalAmount, azCredit, qualifyingChild, qualifiesForHoh, reasons };
}

// ── Schedule C ────────────────────────────────────────────────────────────
export type ScheduleCLine = { line: string; label: string; amount: number; entries: number };
export type ScheduleC = {
  businessId: string;
  businessName: string;
  grossReceipts: number;   // line 1
  returns: number;         // line 2
  cogs: number;            // line 4
  otherIncome: number;     // line 6
  grossIncome: number;     // line 7
  lines: ScheduleCLine[];  // Part II, by line
  vehicle: { method: "standard" | "actual"; businessMiles: number; rate: number; amount: number; businessPct: number };
  homeOffice: { method: "simplified" | "actual" | "none"; amount: number; disallowed: number; officePct: number; mortgageInterestShare: number; propertyTaxShare: number };
  totalExpenses: number;   // line 28 (+ line 30 home office)
  netProfit: number;       // line 31
};

export type TaxInput = {
  profile: FinProfile;
  entries: FinEntry[];
  trips: MileageTrip[];
  time: TimeLog[];
};

export type TaxSummary = {
  year: TaxYear;
  filingStatus: FilingStatus;
  table: YearTable;
  schedules: ScheduleC[];
  netProfit: number;
  // Schedule SE
  seNetEarnings: number;
  seTax: number;
  seDeduction: number;
  additionalMedicare: number;
  // Income & adjustments
  w2Wages: number;
  otherIncome: number;
  capitalGains: number;
  adjustments: { label: string; amount: number }[];
  agi: number;
  // Deductions
  itemized: { salt: number; mortgageInterest: number; charity: number; medical: number; total: number };
  standardDeduction: number;
  usesItemized: boolean;
  deduction: number;
  belowLine: { label: string; amount: number }[];
  qbi: { qbi: number; deduction: number; limited: boolean; carryforward: number };
  taxableIncome: number;
  incomeTax: number;
  marginalRate: number;
  // Credits
  dependents: DependentResult[];
  ctcNonrefundable: number;
  actc: number;
  odc: number;
  dependentCareCredit: number;
  eitc: number;
  totalTax: number;
  // Payments
  federalWithheld: number;
  federalEstimates: number;
  federalPayments: number;
  federalBalance: number; // + owe, − refund
  effectiveRate: number;
  // Arizona
  az: { agi: number; deduction: number; taxable: number; tax: number; dependentCredit: number; otherCredits: number; liability: number; withheld: number; estimates: number; balance: number };
  hohQualified: boolean;
  earnedIncome: number;
  notes: string[];
};

function primaryBusinessId(p: FinProfile): string {
  return p.businesses[0]?.id ?? "biz_main";
}

function buildScheduleC(bizId: string, bizName: string, input: TaxInput, t: YearTable, homePool: { mortgage: number; propertyTax: number; other: number }): ScheduleC {
  const { profile } = input;
  const year = profile.taxYear;
  const mine = (b?: string) => (b || primaryBusinessId(profile)) === bizId;
  const entries = input.entries.filter((e) => inYear(e.date, year) && mine(e.business));

  let grossReceipts = 0, returns = 0, cogs = 0, otherIncome = 0, vehicleActual = 0;
  const byLine = new Map<string, ScheduleCLine>();
  const add = (line: string, label: string, amount: number) => {
    const cur = byLine.get(line) ?? { line, label, amount: 0, entries: 0 };
    cur.amount += amount;
    cur.entries += 1;
    byLine.set(line, cur);
  };

  for (const e of entries) {
    const cat = categoryOf(e.category, profile.customCategories);
    const amt = Number(e.amount) || 0;
    if (cat.kind === "income") {
      if (cat.line === "C1") grossReceipts += amt; else otherIncome += amt;
      continue;
    }
    if (cat.kind !== "expense") continue;
    if (cat.id === "inc_returns") { returns += amt; continue; }
    if (cat.id === "cogs") { cogs += deductibleAmount(e, cat); continue; }
    if (cat.vehicleExpense) { vehicleActual += amt; continue; }
    const label = CATEGORIES.find((c) => c.line === cat.line)?.lineLabel ?? cat.lineLabel;
    add(cat.line, label, deductibleAmount(e, cat));
  }

  // Vehicle: standard mileage or the business share of actual costs.
  const trips = input.trips.filter((x) => inYear(x.date, year) && mine(x.business));
  const businessMiles = trips.reduce((s, x) => s + (Number(x.miles) || 0) * (x.roundTrip ? 2 : 1), 0);
  const totalMiles = Math.max(profile.vehicle.totalMiles || 0, businessMiles);
  const businessPct = totalMiles > 0 ? businessMiles / totalMiles : 0;
  const vehicleAmount = profile.vehicle.method === "standard" ? businessMiles * t.mileageRate : vehicleActual * businessPct;
  if (vehicleAmount > 0) add("C9", "Sch. C line 9 — Car & truck", vehicleAmount);

  const grossIncome = grossReceipts - returns - cogs + otherIncome;
  let expenses = 0;
  for (const l of byLine.values()) { l.amount = r2(l.amount); expenses += l.amount; }

  // Home office — attached to one business, never allowed to create a loss
  // (the mortgage-interest and property-tax share is the exception on Form 8829).
  const ho = profile.homeOffice;
  const homeOffice: ScheduleC["homeOffice"] = { method: "none", amount: 0, disallowed: 0, officePct: 0, mortgageInterestShare: 0, propertyTaxShare: 0 };
  const hoBiz = ho.business || primaryBusinessId(profile);
  if (ho.enabled && hoBiz === bizId && ho.officeSqft > 0) {
    const tentative = pos(grossIncome - expenses);
    const months = Math.min(12, Math.max(1, ho.monthsUsed || 12));
    if (ho.method === "simplified") {
      const full = Math.min(300, ho.officeSqft) * 5 * (months / 12);
      homeOffice.method = "simplified";
      homeOffice.amount = r2(Math.min(full, tentative));
      homeOffice.disallowed = r2(full - homeOffice.amount);
    } else if (ho.homeSqft > 0) {
      const pct = Math.min(1, ho.officeSqft / ho.homeSqft);
      homeOffice.method = "actual";
      homeOffice.officePct = pct;
      homeOffice.mortgageInterestShare = r2(homePool.mortgage * pct);
      homeOffice.propertyTaxShare = r2(homePool.propertyTax * pct);
      const otherShare = homePool.other * pct;
      const allowedOther = Math.min(otherShare, pos(tentative - homeOffice.mortgageInterestShare - homeOffice.propertyTaxShare));
      homeOffice.amount = r2(homeOffice.mortgageInterestShare + homeOffice.propertyTaxShare + allowedOther);
      homeOffice.disallowed = r2(otherShare - allowedOther);
    }
  }

  const totalExpenses = r2(expenses + homeOffice.amount);
  return {
    businessId: bizId,
    businessName: bizName,
    grossReceipts: r2(grossReceipts),
    returns: r2(returns),
    cogs: r2(cogs),
    otherIncome: r2(otherIncome),
    grossIncome: r2(grossIncome),
    lines: [...byLine.values()].sort((a, b) => a.line.localeCompare(b.line, undefined, { numeric: true })),
    vehicle: { method: profile.vehicle.method, businessMiles: r2(businessMiles), rate: t.mileageRate, amount: r2(vehicleAmount), businessPct },
    homeOffice,
    totalExpenses,
    netProfit: r2(grossIncome - totalExpenses),
  };
}

/** Optional overrides used for what-if comparisons ("without the business", "+$10k revenue"). */
export type Scenario = { excludeBusiness?: boolean; extraRevenue?: number; extraExpenses?: number; extraRetirement?: number };

export function computeTaxes(input: TaxInput, scenario: Scenario = {}): TaxSummary {
  const { profile } = input;
  const year = profile.taxYear;
  const t = TAX_TABLES[year] ?? TAX_TABLES[2026];
  const status = profile.filingStatus;
  const notes: string[] = [];
  const entriesY = input.entries.filter((e) => inYear(e.date, year));

  const sumCat = (pred: (c: CategoryDef) => boolean, useDeductible = false) =>
    entriesY.reduce((s, e) => {
      const c = categoryOf(e.category, profile.customCategories);
      return pred(c) ? s + (useDeductible ? deductibleAmount(e, c) : Number(e.amount) || 0) : s;
    }, 0);

  // Home expense pool (for Form 8829 actual method and the Schedule A split).
  const homeMortgage = sumCat((c) => c.id === "home_mortgage_interest");
  const homePropertyTax = sumCat((c) => c.id === "home_property_tax");
  const homeOther = sumCat((c) => Boolean(c.homeExpense) && c.id !== "home_mortgage_interest" && c.id !== "home_property_tax");

  // ── Schedule C per business ─────────────────────────────────────────────
  let schedules = scenario.excludeBusiness ? [] : profile.businesses.map((b) =>
    buildScheduleC(b.id, b.name, input, t, { mortgage: homeMortgage, propertyTax: homePropertyTax, other: homeOther }));
  if (!scenario.excludeBusiness && (scenario.extraRevenue || scenario.extraExpenses) && schedules[0]) {
    const s0 = { ...schedules[0] };
    s0.grossReceipts += scenario.extraRevenue ?? 0;
    s0.grossIncome += scenario.extraRevenue ?? 0;
    s0.totalExpenses += scenario.extraExpenses ?? 0;
    s0.netProfit = r2(s0.grossIncome - s0.totalExpenses);
    schedules = [s0, ...schedules.slice(1)];
  }
  const netProfit = r2(schedules.reduce((s, x) => s + x.netProfit, 0));
  const hoMortgageShare = schedules.reduce((s, x) => s + x.homeOffice.mortgageInterestShare, 0);
  const hoPropertyTaxShare = schedules.reduce((s, x) => s + x.homeOffice.propertyTaxShare, 0);

  // ── W-2s ────────────────────────────────────────────────────────────────
  const w2 = profile.w2Jobs;
  const w2Wages = w2.reduce((s, j) => s + (Number(j.wages) || 0), 0);
  const w2SsWages = w2.reduce((s, j) => s + (Number(j.ssWages) || 0), 0);
  const w2MedicareWages = w2.reduce((s, j) => s + (Number(j.medicareWages) || 0), 0);
  const federalWithheld = w2.reduce((s, j) => s + (Number(j.fedWithheld) || 0), 0);
  const azWithheld = w2.reduce((s, j) => s + (Number(j.stateWithheld) || 0), 0);
  const overtime = w2.reduce((s, j) => s + (Number(j.qualifiedOvertime) || 0), 0);

  // ── Schedule SE ─────────────────────────────────────────────────────────
  const nese = netProfit > 0 ? netProfit * 0.9235 : 0;
  let seTax = 0;
  if (nese >= 400) {
    const ssRoom = pos(t.ssWageBase - w2SsWages);
    seTax = Math.min(nese, ssRoom) * 0.124 + nese * 0.029;
  }
  seTax = r2(seTax);
  const seDeduction = r2(seTax / 2);
  const addlMedThreshold = status === "married_joint" ? 250000 : status === "married_separate" ? 125000 : 200000;
  const additionalMedicare = r2(pos(w2MedicareWages + nese - addlMedThreshold) * 0.009);

  // ── Income & adjustments ────────────────────────────────────────────────
  const adj = profile.adjustments;
  const interestAndOther = (Number(adj.otherIncome) || 0);
  const capLossLimit = status === "married_separate" ? -1500 : -3000;
  const capitalGains = Math.max(capLossLimit, Number(adj.capitalGains) || 0);
  if ((Number(adj.capitalGains) || 0) < capLossLimit) notes.push(`Capital loss beyond ${Math.abs(capLossLimit).toLocaleString()} carries forward to next year.`);
  if (capitalGains > 0) notes.push("Capital gains are taxed at ordinary rates in this estimate; long-term gains are usually taxed lower.");

  const seHealthCap = pos(netProfit - seDeduction);
  const seHealth = Math.min(Number(adj.seHealthInsurance) || 0, seHealthCap);
  const retirement = (Number(adj.retirementContrib) || 0) + (scenario.extraRetirement ?? 0);
  const adjustments = [
    { label: "Deductible part of self-employment tax", amount: seDeduction },
    { label: "Self-employed health insurance", amount: seHealth },
    { label: "SEP / Solo 401(k) contributions", amount: scenario.excludeBusiness ? 0 : retirement },
    { label: "Traditional IRA", amount: Number(adj.traditionalIra) || 0 },
    { label: "HSA contributions", amount: Number(adj.hsa) || 0 },
    { label: "Student loan interest (max $2,500)", amount: Math.min(2500, Number(adj.studentLoanInterest) || 0) },
  ].filter((a) => a.amount > 0);
  const totalIncome = w2Wages + netProfit + interestAndOther + capitalGains;
  const agi = r2(totalIncome - adjustments.reduce((s, a) => s + a.amount, 0));

  // ── Itemized vs standard ────────────────────────────────────────────────
  const fedEstimatesLedger = sumCat((c) => c.id === "pay_fed_estimate");
  const azEstimatesLedger = sumCat((c) => c.id === "pay_az_estimate");
  const fedEstimates = r2(fedEstimatesLedger + profile.estimatedPayments.filter((p) => p.jurisdiction === "federal" && inYear(p.date, year)).reduce((s, p) => s + p.amount, 0));
  const azEstimates = r2(azEstimatesLedger + profile.estimatedPayments.filter((p) => p.jurisdiction === "arizona" && inYear(p.date, year)).reduce((s, p) => s + p.amount, 0));

  const stateIncomeTax = azWithheld + azEstimates + sumCat((c) => c.id === "per_state_tax");
  const personalPropertyTax = pos(homePropertyTax - hoPropertyTaxShare) + sumCat((c) => c.id === "per_vehicle_tax");
  const capBase = status === "married_separate" ? t.saltCap / 2 : t.saltCap;
  const phaseStart = status === "married_separate" ? t.saltPhaseStart / 2 : t.saltPhaseStart;
  const floor = status === "married_separate" ? 5000 : 10000;
  const saltCap = Math.max(floor, capBase - 0.3 * pos(agi - phaseStart));
  const salt = Math.min(saltCap, stateIncomeTax + personalPropertyTax);
  const mortgageInterest = pos(homeMortgage - hoMortgageShare);
  const charityRaw = sumCat((c) => c.id === "per_charity");
  const charityItemized = pos(charityRaw - agi * t.charityFloorPct);
  const medical = pos(sumCat((c) => c.id === "per_medical") - agi * 0.075);
  const itemizedTotal = r2(salt + mortgageInterest + charityItemized + medical);
  const standardDeduction = t.standardDeduction[status];
  const usesItemized = itemizedTotal > standardDeduction;
  const deduction = usesItemized ? itemizedTotal : standardDeduction;

  // ── Below-the-line deductions (2025–2028 additions) ─────────────────────
  const belowLine: { label: string; amount: number }[] = [];
  if (overtime > 0) {
    const max = pos(t.overtimeMax[status] - Math.ceil(pos(agi - t.overtimePhaseStart[status]) / 1000) * 100);
    belowLine.push({ label: "Qualified overtime deduction", amount: Math.min(overtime, max) });
  }
  if ((Number(adj.carLoanInterest) || 0) > 0) {
    const max = pos(t.carLoanMax - Math.ceil(pos(agi - t.carLoanPhaseStart[status]) / 1000) * 200);
    belowLine.push({ label: "Car loan interest deduction", amount: Math.min(Number(adj.carLoanInterest) || 0, max) });
  }
  if (!usesItemized && t.nonItemizerCharity[status] > 0 && charityRaw > 0) {
    belowLine.push({ label: "Charitable deduction for non-itemizers", amount: Math.min(charityRaw, t.nonItemizerCharity[status]) });
  }

  // ── QBI (§199A) ─────────────────────────────────────────────────────────
  const taxableBeforeQbi = pos(agi - deduction - belowLine.reduce((s, b) => s + b.amount, 0));
  const qbiBase = netProfit - seDeduction - seHealth - (scenario.excludeBusiness ? 0 : retirement);
  let qbiDeduction = 0;
  let limited = false;
  if (qbiBase > 0) {
    qbiDeduction = Math.min(0.2 * qbiBase, 0.2 * pos(taxableBeforeQbi - pos(capitalGains)));
    const over = taxableBeforeQbi - t.qbiThreshold[status];
    if (over > 0) {
      // A sole proprietor with no W-2 payroll and little property loses the deduction across the phase-in range.
      limited = true;
      qbiDeduction *= pos(1 - over / t.qbiPhaseRange[status]);
      notes.push("Income is above the QBI threshold — the 20% deduction is phased out in this estimate (no W-2 payroll in the business).");
    }
  }
  const qbi = { qbi: r2(qbiBase), deduction: r2(qbiDeduction), limited, carryforward: qbiBase < 0 ? r2(-qbiBase) : 0 };
  if (qbi.carryforward > 0) notes.push(`Qualified business loss of $${qbi.carryforward.toLocaleString()} carries forward and reduces next year's QBI deduction.`);

  const taxableIncome = r2(pos(taxableBeforeQbi - qbi.deduction));
  const incomeTax = bracketTax(taxableIncome, t.brackets[status]);
  const mRate = marginalRate(taxableIncome, t.brackets[status]);

  // ── Credits ─────────────────────────────────────────────────────────────
  const dependents = profile.dependents.map((d) => classifyDependent(d, year, t));
  const kids = dependents.filter((d) => d.credit === "ctc").length;
  const others = dependents.filter((d) => d.credit === "odc").length;
  const eitcKids = Math.min(3, dependents.filter((d) => d.qualifyingChild).length);
  const hohQualified = dependents.some((d) => d.qualifiesForHoh);
  if (status === "head_of_household" && !hohQualified) notes.push("Head of household needs a qualifying person who lived with you more than half the year — check the dependents' details.");

  const earnedIncome = r2(w2Wages + (netProfit >= 0 ? netProfit - seDeduction : netProfit));

  // Child & dependent care (Form 2441) — applied before the child tax credit.
  let dependentCareCredit = 0;
  const careKids = dependents.filter((d) => d.age != null && d.age < 13).length;
  if (careKids > 0 && (Number(adj.childcareExpenses) || 0) + sumCat((c) => c.id === "per_childcare") > 0) {
    const expenses = Math.min((Number(adj.childcareExpenses) || 0) + sumCat((c) => c.id === "per_childcare"), careKids >= 2 ? 6000 : 3000, pos(earnedIncome));
    let pct: number;
    if (year >= 2026) {
      pct = Math.max(0.35, 0.50 - Math.ceil(pos(agi - 15000) / 2000) * 0.01);
      const second = status === "married_joint" ? 150000 : 75000;
      const step = status === "married_joint" ? 4000 : 2000;
      if (agi > second) pct = Math.max(0.20, 0.35 - Math.ceil((agi - second) / step) * 0.01);
    } else {
      pct = Math.max(0.20, 0.35 - Math.ceil(pos(agi - 15000) / 2000) * 0.01);
    }
    dependentCareCredit = r2(Math.min(expenses * pct, incomeTax));
  }

  const ctcGross = kids * t.ctcPerChild + others * t.odcPerDependent;
  const ctcReduction = Math.ceil(pos(agi - t.ctcPhaseoutStart[status]) / 1000) * 50;
  const ctcAllowed = pos(ctcGross - ctcReduction);
  const taxAfterCare = pos(incomeTax - dependentCareCredit);
  const ctcPlusOdcNonref = Math.min(ctcAllowed, taxAfterCare);
  const kidsShare = ctcGross > 0 ? (kids * t.ctcPerChild) / ctcGross : 0;
  const ctcAllowedKids = ctcAllowed * kidsShare;
  const ctcNonrefundable = r2(Math.min(ctcAllowedKids, ctcPlusOdcNonref));
  const odc = r2(ctcPlusOdcNonref - ctcNonrefundable);
  const actc = r2(Math.min(pos(ctcAllowedKids - ctcNonrefundable), kids * t.ctcRefundablePerChild, 0.15 * pos(earnedIncome - 2500)));

  // EITC
  let eitc = 0;
  const investment = Math.max(0, interestAndOther) + pos(capitalGains);
  if (status !== "married_separate" && earnedIncome > 0 && investment <= t.eitc.investmentLimit) {
    const k = eitcKids;
    const e = t.eitc;
    const phaseIn = Math.min(e.maxCredit[k], earnedIncome * e.phaseInRate[k]);
    const start = e.phaseoutStart[k] + (status === "married_joint" ? e.mfjBump : 0);
    const reducer = Math.max(agi, earnedIncome);
    eitc = r2(pos(phaseIn - pos(reducer - start) * e.phaseoutRate[k]));
  } else if (investment > t.eitc.investmentLimit) {
    notes.push("Investment income is over the EITC limit, so the earned income credit is $0.");
  }

  const totalTax = r2(pos(incomeTax - dependentCareCredit - ctcNonrefundable - odc) + seTax + additionalMedicare);
  const federalPayments = r2(federalWithheld + fedEstimates + actc + eitc);
  const federalBalance = r2(totalTax - federalPayments);

  // ── Arizona Form 140 ────────────────────────────────────────────────────
  const azDeduction = usesItemized ? itemizedTotal : standardDeduction;
  const azTaxable = r2(pos(agi - azDeduction));
  const azTax = r2(azTaxable * t.az.rate);
  const azDepGross = dependents.reduce((s, d) => s + d.azCredit, 0);
  const azOver = pos(agi - t.az.depPhaseStart[status]);
  const azDependentCredit = r2(azDepGross * pos(1 - Math.ceil(azOver / 1000) * 0.05));
  const azOtherCredits = (Number(adj.arizonaCharitableCredit) || 0) + (Number(adj.arizonaPrivateSchoolCredit) || 0);
  const azLiability = r2(pos(azTax - azDependentCredit - azOtherCredits));
  const az = {
    agi, deduction: azDeduction, taxable: azTaxable, tax: azTax, dependentCredit: azDependentCredit, otherCredits: azOtherCredits,
    liability: azLiability, withheld: r2(azWithheld), estimates: azEstimates, balance: r2(azLiability - azWithheld - azEstimates),
  };

  if (profile.vehicle.method === "standard" && sumCat((c) => Boolean(c.vehicleExpense)) > 0) {
    notes.push("Vehicle uses the standard mileage rate, so gas/repairs entered as actual vehicle costs are not deducted (parking and tolls still are).");
  }
  if (schedules.some((s) => s.homeOffice.disallowed > 0)) notes.push("Part of the home office deduction is limited by business income; on the actual method the excess carries forward (Form 8829).");
  if (schedules.some((s) => s.homeOffice.method === "actual")) notes.push("Home depreciation isn't included in the home office estimate — your preparer adds it on Form 8829 line 42.");

  const grossAll = w2Wages + pos(netProfit) + pos(interestAndOther) + pos(capitalGains);
  return {
    year, filingStatus: status, table: t, schedules, netProfit,
    seNetEarnings: r2(nese), seTax, seDeduction, additionalMedicare,
    w2Wages: r2(w2Wages), otherIncome: r2(interestAndOther), capitalGains: r2(capitalGains), adjustments, agi,
    itemized: { salt: r2(salt), mortgageInterest: r2(mortgageInterest), charity: r2(charityItemized), medical: r2(medical), total: itemizedTotal },
    standardDeduction, usesItemized, deduction, belowLine, qbi, taxableIncome, incomeTax, marginalRate: mRate,
    dependents, ctcNonrefundable, actc, odc, dependentCareCredit, eitc, totalTax,
    federalWithheld: r2(federalWithheld), federalEstimates: fedEstimates, federalPayments, federalBalance,
    effectiveRate: grossAll > 0 ? totalTax / grossAll : 0,
    az, hohQualified, earnedIncome, notes,
  };
}

/** Quarterly estimated-tax plan for next year: the safe harbor is 100% of this year's tax (110% when AGI > $150k). */
export function estimatedTaxPlan(s: TaxSummary, nextYear: number) {
  const fedRequired = s.totalTax - s.actc - s.eitc;
  const safeHarbor = pos(fedRequired) * (s.agi > 150000 ? 1.1 : 1.0);
  const fedPerQuarter = Math.ceil(pos(safeHarbor - s.federalWithheld) / 4);
  const azPerQuarter = Math.ceil(pos(s.az.liability - s.az.withheld) / 4);
  const due = [`${nextYear}-04-15`, `${nextYear}-06-15`, `${nextYear}-09-15`, `${nextYear + 1}-01-15`];
  return { safeHarbor: Math.round(safeHarbor), fedPerQuarter, azPerQuarter, due };
}
