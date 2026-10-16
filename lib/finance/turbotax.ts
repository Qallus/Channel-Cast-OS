// The TurboTax simulator: the workbook re-cut into the order the TurboTax
// interview asks for it (My Info → Wages & Income → Deductions & Credits →
// Federal Review → State), screen by screen, with each value formatted to
// paste straight into the matching box. Pure data — the panel only renders it.
//
// Screen names follow TurboTax's desktop/online interview; wording varies a
// little by edition and year, so each screen also names the form and line.

import { categoryOf, SCHEDULE_C_LINES } from "./categories.ts";
import { ageAtYearEnd, deductibleAmount, inYear, type TaxInput, type TaxSummary } from "./tax.ts";
import { FILING_STATUS_LABEL } from "./tax-tables.ts";

export type TtField = {
  id: string;
  label: string;
  /** What to paste: digits only for money ("1234.56"), plain text otherwise. */
  copy: string;
  /** How it's shown. */
  display: string;
  note?: string;
  kind: "money" | "text" | "choice";
};

export type TtScreen = {
  id: string;
  title: string;
  /** Where TurboTax keeps it, e.g. "Wages & Income › Self-Employment › Business expenses". */
  path: string;
  form?: string;
  help?: string;
  fields: TtField[];
  /** When a screen repeats per item (each W-2, each asset, each dependent). */
  groups?: { title: string; fields: TtField[] }[];
  warn?: string;
};

export type TtStep = { id: string; title: string; screens: TtScreen[] };

const cents = (n: number) => Math.round(n * 100) / 100;
const plain = (n: number) => { const c = cents(n); return Number.isInteger(c) ? String(c) : c.toFixed(2); };
const shown = (n: number) => cents(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

let seq = 0;
const money = (label: string, amount: number, note?: string): TtField => ({ id: `f${++seq}`, label, copy: plain(amount), display: shown(amount), note, kind: "money" });
const text = (label: string, value: string | number | undefined, note?: string): TtField => {
  const v = value == null || value === "" ? "" : String(value);
  return { id: `f${++seq}`, label, copy: v, display: v || "—", note, kind: "text" };
};
const choice = (label: string, value: string, note?: string): TtField => ({ id: `f${++seq}`, label, copy: value, display: value, note, kind: "choice" });

const RELATIONSHIP: Record<string, string> = {
  son: "Son", daughter: "Daughter", stepchild: "Stepchild", foster_child: "Foster child", fiancee: "Other (not related) — member of household",
  partner: "Other (not related) — member of household", parent: "Parent", sibling: "Brother/Sister", other: "Other",
};

export function buildTurboTax(input: TaxInput, s: TaxSummary): TtStep[] {
  seq = 0;
  const { profile } = input;
  const year = s.year;
  const entries = input.entries.filter((e) => inYear(e.date, year));
  const primary = profile.businesses[0]?.id;
  const bizOf = (b?: string) => b || primary;
  const sumWhere = (pred: (catId: string) => boolean, biz?: string, mode: "raw" | "business" | "deductible" = "business") =>
    entries.reduce((t, e) => {
      if (!pred(e.category) || (biz && bizOf(e.business) !== biz)) return t;
      const c = categoryOf(e.category, profile.customCategories);
      if (mode === "raw") return t + e.amount;
      if (mode === "deductible") return t + deductibleAmount(e, c);
      return t + e.amount * ((e.businessUsePct ?? 100) / 100);
    }, 0);

  // ── My Info ─────────────────────────────────────────────────────────────
  const myInfo: TtScreen[] = [
    {
      id: "you", title: "Tell us about yourself", path: "My Info › Your info", form: "Form 1040 page 1",
      fields: [
        text("Name", profile.taxpayer.name),
        text("Date of birth", profile.taxpayer.birthDate ?? ""),
        text("Occupation", profile.taxpayer.occupation),
        choice("State you lived in on Dec 31", "Arizona", "Full-year Arizona resident; no other state income"),
        choice("Filing status", FILING_STATUS_LABEL[s.filingStatus], s.filingStatus === "head_of_household" ? "TurboTax decides this from your answers — say you're unmarried, paid over half the cost of the home, and your kids lived with you" : undefined),
      ],
      warn: s.filingStatus === "head_of_household" && !s.hohQualified ? "None of your dependents as entered qualify you for head of household — fix the dependents first." : undefined,
    },
    {
      id: "dependents", title: "Let's add your dependents", path: "My Info › Dependents", form: "Form 1040 page 1 · Schedule 8812",
      help: "Add each person. TurboTax asks a run of yes/no questions; the answers below are the ones that match your profile.",
      fields: [],
      groups: profile.dependents.map((d) => {
        const r = s.dependents.find((x) => x.id === d.id);
        const age = ageAtYearEnd(d.birthDate, year);
        return {
          title: `${d.name || "Dependent"} — expect ${r?.credit === "ctc" ? "Child Tax Credit" : r?.credit === "odc" ? "Credit for Other Dependents" : "no credit"}`,
          fields: [
            text("Name", d.name),
            text("Date of birth", d.birthDate, age != null ? `Age ${age} on Dec 31, ${year}` : "Needed — decides the credit"),
            choice("Relationship", RELATIONSHIP[d.relationship] ?? "Other"),
            text("Months lived with you", d.monthsLivedWithYou),
            text("SSN", d.ssnLast4 ? `•••-••-${d.ssnLast4}` : "", "Type the full number from their card — only the last 4 is stored here"),
            choice("Did they pay for over half their own support?", "No"),
            ...(d.relationship === "fiancee" || d.relationship === "partner" ? [money(`Their gross income in ${year}`, d.grossIncome ?? 0, "Must be under the qualifying-relative limit"), choice("Did they live with you all year?", (d.monthsLivedWithYou ?? 0) >= 12 ? "Yes" : "No")] : []),
            ...(d.student ? [choice("Full-time student?", "Yes")] : []),
          ],
        };
      }),
    },
  ];

  // ── Wages & Income ──────────────────────────────────────────────────────
  const wages: TtScreen[] = [];
  if (profile.w2Jobs.length) {
    wages.push({
      id: "w2", title: "Let's get the info from your W-2", path: "Wages & Income › Wages and Salaries › W-2", form: "Form W-2",
      help: "Pick “Type it in myself”. Boxes 4 and 6 (Social Security and Medicare withheld) come straight off the paper W-2 — they aren't stored here.",
      fields: [],
      groups: profile.w2Jobs.map((j) => ({
        title: j.employer || "W-2",
        fields: [
          text("Employer name", j.employer), text("Employer EIN (box b)", j.ein ?? "", "From your W-2"),
          money("Box 1 — Wages, tips, other comp.", j.wages), money("Box 2 — Federal income tax withheld", j.fedWithheld),
          money("Box 3 — Social Security wages", j.ssWages), money("Box 5 — Medicare wages", j.medicareWages),
          ...(j.retirement401k ? [money("Box 12 — code D (401k)", j.retirement401k)] : []),
          choice("Box 15 — State", "AZ"), money("Box 16 — State wages", j.stateWages), money("Box 17 — State income tax", j.stateWithheld),
          ...(j.qualifiedOvertime ? [money("Qualified overtime premium", j.qualifiedOvertime, "TurboTax asks about overtime after the W-2 boxes")] : []),
          ...(j.custom ?? []).filter((c) => c.label).map((c) => text(c.label, c.value)),
        ],
      })),
    });
  }

  for (const sc of s.schedules) {
    const biz = profile.businesses.find((b) => b.id === sc.businessId);
    const bid = sc.businessId;
    const prefix = `Wages & Income › Self-Employment › ${sc.businessName}`;
    wages.push({
      id: `biz-${bid}`, title: "Tell us about your business", path: `${prefix} › Business info`, form: "Schedule C lines A–J",
      fields: [
        text("Business name", biz?.name), text("Principal business or profession", biz?.activity), text("Business code (NAICS)", biz?.naicsCode ?? "", "TurboTax can search for it by description"),
        text("EIN", biz?.einLast4 ? `••-•••${biz.einLast4}` : "", "Leave blank if you use your SSN"),
        choice("Accounting method", biz?.accountingMethod === "accrual" ? "Accrual" : "Cash"),
        choice("Did you materially participate?", "Yes"),
        choice("Did you start or acquire this business in " + year + "?", biz?.startedYear === year ? "Yes" : "No"),
        choice("Did you make payments that require a 1099?", sumWhere((id) => id === "exp_contract_labor", bid) >= 600 ? "Yes — and did/will you file them? Yes" : "No"),
      ],
    });

    const otherIncome = sc.otherIncome;
    wages.push({
      id: `inc-${bid}`, title: "Business income", path: `${prefix} › Income`, form: "Schedule C Part I",
      help: "Enter any 1099-NEC / 1099-K first, then put the rest under “General income” so the total matches.",
      fields: [
        money("Total gross receipts (all income)", sc.grossReceipts, "Line 1 — 1099 amounts + general income must add up to this"),
        ...(sc.returns ? [money("Returns and allowances", sc.returns)] : []),
        ...(otherIncome ? [money("Other income", otherIncome, "Line 6 — e.g. card rewards, refunds of deducted costs")] : []),
        ...(sc.cogs ? [money("Cost of goods sold", sc.cogs, "TurboTax asks under Inventory / Cost of goods sold")] : []),
      ],
    });

    // Expenses: one field per line, with meals and the "other" list broken out.
    const expFields: TtField[] = [];
    for (const l of SCHEDULE_C_LINES) {
      if (l.line === "C9" || l.line === "C13" || l.line === "C24b" || l.line === "C27a") continue;
      const amt = sumWhere((id) => categoryOf(id, profile.customCategories).line === l.line && categoryOf(id, profile.customCategories).kind === "expense" && id !== "exp_parking" && id !== "inc_returns" && id !== "cogs", bid);
      if (amt > 0) expFields.push(money(l.label, amt, `Schedule C line ${l.line.slice(1)}`));
    }
    const mealsTotal = sumWhere((id) => id === "exp_meals", bid);
    if (mealsTotal > 0) expFields.push(money("Business meals — total spent", mealsTotal, `If TurboTax asks for the deductible amount instead, enter ${shown(mealsTotal / 2)} (50%)`));
    const otherByCat = new Map<string, number>();
    for (const e of entries) {
      if (bizOf(e.business) !== bid) continue;
      const c = categoryOf(e.category, profile.customCategories);
      if (c.kind !== "expense" || c.line !== "C27a") continue;
      otherByCat.set(c.label, (otherByCat.get(c.label) ?? 0) + e.amount * ((e.businessUsePct ?? 100) / 100));
    }
    wages.push({
      id: `exp-${bid}`, title: "Let's enter your business expenses", path: `${prefix} › Expenses`, form: "Schedule C Part II",
      help: "Each tile in TurboTax's expense list matches a row here. Mixed-use items are already cut to the business share.",
      fields: expFields.length ? expFields : [text("No expenses recorded", "")],
      groups: otherByCat.size ? [{
        title: "Other miscellaneous expenses — add each as its own line (description + amount)",
        fields: [...otherByCat.entries()].sort((a, b) => b[1] - a[1]).map(([label, amt]) => money(label, amt)),
      }] : undefined,
    });

    if (sc.vehicle.businessMiles > 0 || sumWhere((id) => id === "exp_parking", bid) > 0 || sumWhere((id) => id === "exp_vehicle", bid, "raw") > 0) {
      const parking = sumWhere((id) => id === "exp_parking", bid);
      const totalMiles = Math.max(profile.vehicle.totalMiles || 0, sc.vehicle.businessMiles);
      wages.push({
        id: `veh-${bid}`, title: "Tell us about your vehicle", path: `${prefix} › Vehicles`, form: "Schedule C line 9 · Part IV / Form 4562 Part V",
        fields: [
          text("Vehicle description", profile.vehicle.description), text("Date placed in service for business", profile.vehicle.placedInService ?? ""),
          choice("Method", sc.vehicle.method === "standard" ? "Standard mileage rate" : "Actual expenses"),
          text("Total miles driven in the year", Math.round(totalMiles)), text("Business miles", Math.round(sc.vehicle.businessMiles), `Deduction ≈ ${shown(sc.vehicle.businessMiles * sc.vehicle.rate)} at ${(sc.vehicle.rate * 100).toFixed(1)}¢`),
          text("Commuting miles", Math.round(profile.vehicle.commuteMiles ?? 0)),
          money("Parking fees and tolls", parking, "Entered separately — deductible on top of the mileage rate"),
          ...(sc.vehicle.method === "actual" ? [money("Gas, repairs, insurance, registration (total)", sumWhere((id) => id === "exp_vehicle", bid, "raw"))] : []),
          choice("Do you have evidence / is it written?", "Yes / Yes", "Your mileage log"),
          choice("Available for personal use? Another vehicle?", "Answer for your situation"),
        ],
      });
    }

    if (sc.homeOffice.method !== "none") {
      const ho = profile.homeOffice;
      const raw = (id: string) => sumWhere((x) => x === id, undefined, "raw");
      wages.push({
        id: `home-${bid}`, title: "Home office", path: `${prefix} › Business Use of Home`, form: ho.method === "simplified" ? "Schedule C line 30 (simplified)" : "Form 8829",
        help: ho.method === "actual" ? "TurboTax wants WHOLE-home amounts here and applies the office percentage itself. Your mortgage interest and property tax go here, not under Deductions & Credits." : "Choose the simplified method when TurboTax offers it.",
        fields: [
          choice("Method", ho.method === "simplified" ? "Simplified method" : "Regular (actual expense) method"),
          text("Square footage of the office", Math.round(ho.officeSqft)), text("Square footage of the whole home", Math.round(ho.homeSqft)),
          text("Months used for business", ho.monthsUsed),
          ...(ho.method === "actual" ? [
            money("Mortgage interest (whole home)", raw("home_mortgage_interest")), money("Real estate taxes (whole home)", raw("home_property_tax")),
            money("Homeowners insurance", raw("home_insurance")), money("Utilities", raw("home_utilities")), money("Repairs & maintenance", raw("home_repairs")),
            money("HOA dues", raw("home_hoa")), money("Rent", raw("home_rent")),
          ] : []),
        ],
        warn: sc.homeOffice.disallowed > 0 ? `${shown(sc.homeOffice.disallowed)} of the home office is limited by income this year — TurboTax will show the same limit.` : undefined,
      });
    }

    const assets = entries.filter((e) => e.category === "exp_equipment" && bizOf(e.business) === bid);
    if (assets.length) {
      wages.push({
        id: `assets-${bid}`, title: "Business assets", path: `${prefix} › Assets/Depreciation`, form: "Form 4562 (Section 179)",
        help: "Add each item. When TurboTax asks, choose to deduct it in full this year (Section 179 / “expense it”). Under $2,500 per item can also go straight to Supplies under the de minimis election.",
        fields: [],
        groups: assets.map((a) => ({
          title: a.description,
          fields: [
            text("Description", a.description), choice("Asset type", "Computers, office furniture, equipment"),
            money("Cost", a.amount), text("Date placed in service", a.date), text("Business-use percentage", `${a.businessUsePct ?? 100}`),
            choice("Deduct the full cost this year?", "Yes — Section 179"),
          ],
        })),
      });
    }

    wages.push({
      id: `check-${bid}`, title: "Business summary — check against TurboTax", path: `${prefix} › Summary`, form: "Schedule C line 31",
      fields: [
        money("Gross income", sc.grossIncome), money("Total expenses", sc.totalExpenses),
        money(sc.netProfit < 0 ? "Net loss" : "Net profit", sc.netProfit, "TurboTax's business summary should be within a few dollars of this"),
        ...(sc.netProfit < 0 ? [choice("Is all your investment at risk?", "Yes")] : []),
      ],
    });
  }

  if (s.otherIncome || s.capitalGains) {
    wages.push({
      id: "other-income", title: "Investment & other income", path: "Wages & Income › Interest / Investments / Other", form: "1099-INT, 1099-B, Schedule D",
      fields: [
        ...(s.otherIncome ? [money("Interest and other income", s.otherIncome, "Enter each 1099 as issued")] : []),
        ...(s.capitalGains ? [money("Net capital gain (loss)", s.capitalGains, "Enter each 1099-B; this is the expected net")] : []),
      ],
    });
  }

  // ── Deductions & Credits ────────────────────────────────────────────────
  const deductions: TtScreen[] = [];
  const homeActual = s.schedules.some((x) => x.homeOffice.method === "actual");
  const mortgage = sumWhere((id) => id === "home_mortgage_interest", undefined, "raw");
  const propTax = sumWhere((id) => id === "home_property_tax", undefined, "raw");
  if (mortgage || propTax) {
    deductions.push({
      id: "home", title: "Your home", path: "Deductions & Credits › Your Home", form: "Form 1098 · Schedule A",
      help: homeActual ? "You already entered these whole-home amounts in the home office section — TurboTax moves the personal share here. Don't enter them twice." : "Enter the Form 1098 amounts exactly as printed.",
      fields: [money("Mortgage interest (Form 1098 box 1)", mortgage), money("Property (real estate) taxes", propTax)],
    });
  }
  const charity = sumWhere((id) => id === "per_charity", undefined, "raw");
  if (charity) deductions.push({ id: "charity", title: "Charitable donations", path: "Deductions & Credits › Charitable Donations", form: "Schedule A / Schedule 1-A", fields: [money("Cash donations (total)", charity, "Add each charity by name in TurboTax")] });
  const medical = sumWhere((id) => id === "per_medical", undefined, "raw");
  if (medical) deductions.push({ id: "medical", title: "Medical expenses", path: "Deductions & Credits › Medical", form: "Schedule A", fields: [money("Medical & dental paid", medical, "Only the part over 7.5% of AGI helps")] });
  const vlt = sumWhere((id) => id === "per_vehicle_tax", undefined, "raw");
  if (vlt) deductions.push({ id: "vlt", title: "Personal property taxes (car registration)", path: "Deductions & Credits › Car Registration Fees", fields: [money("Vehicle license tax (VLT) portion", vlt)] });

  const care = (profile.adjustments.childcareExpenses || 0) + sumWhere((id) => id === "per_childcare", undefined, "raw");
  if (care) deductions.push({ id: "care", title: "Child and dependent care", path: "Deductions & Credits › Child and Dependent Care Credit", form: "Form 2441", help: "Have each provider's name, address and EIN/SSN ready.", fields: [money("Amount paid for care", care), text("Expected credit", shown(s.dependentCareCredit))] });

  const adj = profile.adjustments;
  const retire: TtField[] = [
    ...(adj.retirementContrib ? [money("SEP / Solo 401(k) contribution", adj.retirementContrib, "Self-Employment › Retirement plans (or Deductions & Credits › Retirement)")] : []),
    ...(adj.seHealthInsurance ? [money("Self-employed health insurance premiums", adj.seHealthInsurance, "Asked inside your business, under health insurance")] : []),
    ...(adj.traditionalIra ? [money("Traditional IRA contribution", adj.traditionalIra)] : []),
    ...(adj.hsa ? [money("HSA contributions (outside payroll)", adj.hsa, "Form 8889")] : []),
    ...(adj.studentLoanInterest ? [money("Student loan interest (1098-E)", adj.studentLoanInterest)] : []),
    ...(adj.carLoanInterest && year >= 2025 ? [money("Car loan interest (new US-assembled vehicle)", adj.carLoanInterest, "Schedule 1-A")] : []),
  ];
  if (retire.length) deductions.push({ id: "retire", title: "Retirement, health & other adjustments", path: "Deductions & Credits › Retirement and Investments / Medical", form: "Schedule 1", fields: retire });

  const fedEst = [
    ...entries.filter((e) => e.category === "pay_fed_estimate").map((e) => ({ date: e.date, amount: e.amount })),
    ...profile.estimatedPayments.filter((p) => p.jurisdiction === "federal" && inYear(p.date, year)).map((p) => ({ date: p.date, amount: p.amount })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const azEst = [
    ...entries.filter((e) => e.category === "pay_az_estimate").map((e) => ({ date: e.date, amount: e.amount })),
    ...profile.estimatedPayments.filter((p) => p.jurisdiction === "arizona" && inYear(p.date, year)).map((p) => ({ date: p.date, amount: p.amount })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  if (fedEst.length || azEst.length) {
    deductions.push({
      id: "estimates", title: "Estimated taxes paid", path: "Deductions & Credits › Estimates and Other Taxes Paid", form: "Form 1040 line 26 · AZ 140",
      fields: [],
      groups: [
        ...(fedEst.length ? [{ title: "Federal estimated payments", fields: fedEst.map((p) => money(`Paid ${p.date}`, p.amount)) }] : []),
        ...(azEst.length ? [{ title: "Arizona estimated payments", fields: azEst.map((p) => money(`Paid ${p.date}`, p.amount)) }] : []),
      ],
    });
  }

  deductions.push({
    id: "credits", title: "Credits TurboTax should find on its own", path: "Deductions & Credits › Your Tax Breaks", form: "Schedule 8812 · Schedule EIC",
    help: "These come from your dependents and income — nothing to type, but check the amounts.",
    fields: [
      money("Child Tax Credit (nonrefundable)", s.ctcNonrefundable), money("Credit for Other Dependents", s.odc),
      money("Additional Child Tax Credit (refundable)", s.actc), money("Earned Income Credit", s.eitc),
      ...(s.dependentCareCredit ? [money("Child & dependent care credit", s.dependentCareCredit)] : []),
      money("Standard or itemized deduction TurboTax picks", s.deduction, s.usesItemized ? "Itemized beats standard for you" : "Standard deduction"),
      money("Qualified business income deduction", s.qbi.deduction),
    ],
  });

  // ── Federal review ──────────────────────────────────────────────────────
  const review: TtScreen[] = [{
    id: "fed-review", title: "Your federal return — what TurboTax should show", path: "Federal Review › Tax Summary (View your 1040)",
    help: "Open Tools › View Tax Summary in TurboTax. If a line is off by more than about $50, the matching section above is where to look.",
    fields: [
      money("Line 1a — Wages", s.w2Wages), money("Line 8 — Additional income (Schedule 1)", s.netProfit + s.otherIncome),
      money("Line 11 — Adjusted gross income", s.agi), money("Line 12 — Deduction", s.deduction), money("Line 13 — QBI deduction", s.qbi.deduction),
      money("Line 15 — Taxable income", s.taxableIncome), money("Line 16 — Tax", s.incomeTax), money("Line 19 — Child / other dependent credit", s.ctcNonrefundable + s.odc),
      money("Line 23 — Other taxes (self-employment)", s.seTax + s.additionalMedicare), money("Line 24 — Total tax", s.totalTax),
      money("Line 25a — Withholding", s.federalWithheld), money("Line 26 — Estimated payments", s.federalEstimates),
      money("Line 27 — Earned income credit", s.eitc), money("Line 28 — Additional child tax credit", s.actc),
      money(s.federalBalance > 0 ? "Line 37 — Amount you owe" : "Line 34 — Refund", Math.abs(s.federalBalance)),
    ],
    warn: s.table.estimated.some((x) => x.startsWith("ALL ")) ? `${year} figures are projected — TurboTax will use the official numbers.` : undefined,
  }];

  // ── State ───────────────────────────────────────────────────────────────
  const under17 = s.dependents.filter((d) => d.credit !== "none" && d.age != null && d.age < 17).length;
  const over17 = s.dependents.filter((d) => d.credit !== "none" && !(d.age != null && d.age < 17)).length;
  const state: TtScreen[] = [{
    id: "az", title: "Arizona return", path: "State Taxes › Arizona", form: "AZ Form 140",
    help: "TurboTax carries your federal numbers over. You mostly confirm residency, dependents and credits.",
    fields: [
      choice("Residency", "Full-year resident"),
      text("Dependents under 17 (box 10a)", under17), text("Dependents 17 or older (box 10b)", over17),
      money("Arizona withholding (W-2 box 17)", s.az.withheld), money("Arizona estimated payments", s.az.estimates),
      ...(adj.arizonaCharitableCredit ? [money("QCO / QFCO charitable credit", adj.arizonaCharitableCredit, "Form 321 / 352")] : []),
      ...(adj.arizonaPrivateSchoolCredit ? [money("School tuition organization credit", adj.arizonaPrivateSchoolCredit, "Form 323 / 348")] : []),
      money("Expected Arizona taxable income", s.az.taxable), money("Expected Arizona tax", s.az.tax), money("Expected dependent tax credit", s.az.dependentCredit),
      money(s.az.balance > 0 ? "Expected amount owed" : "Expected refund", Math.abs(s.az.balance)),
    ],
  }];

  return [
    { id: "info", title: "My Info", screens: myInfo },
    { id: "income", title: "Wages & Income", screens: wages },
    { id: "deductions", title: "Deductions & Credits", screens: deductions },
    { id: "review", title: "Federal Review", screens: review },
    { id: "state", title: "State Taxes", screens: state },
  ];
}
