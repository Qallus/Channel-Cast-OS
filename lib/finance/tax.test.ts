import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildInsights } from "./insights.ts";
import { taxGuideHtml } from "./print.ts";
import { bracketTax, classifyDependent, computeTaxes, estimatedTaxPlan, type TaxInput } from "./tax.ts";
import { TAX_TABLES } from "./tax-tables.ts";
import { defaultProfile, type FinEntry, type FinProfile } from "./types.ts";

const entry = (date: string, category: string, amount: number, extra: Partial<FinEntry> = {}): FinEntry =>
  ({ id: `${category}_${date}_${amount}`, date, description: category, amount, category, createdAt: date, ...extra });

function household(): FinProfile {
  const p = defaultProfile();
  p.taxYear = 2026;
  p.dependents = [
    { id: "k1", name: "Kid A", relationship: "son", birthDate: "2018-03-01", monthsLivedWithYou: 12, hasSsn: true },
    { id: "k2", name: "Kid B", relationship: "daughter", birthDate: "2021-07-01", monthsLivedWithYou: 12, hasSsn: true },
    { id: "f", name: "Partner", relationship: "fiancee", birthDate: "", monthsLivedWithYou: 12, hasSsn: true, grossIncome: 0 },
  ];
  p.w2Jobs = [{ id: "w", employer: "Employer", wages: 60000, fedWithheld: 5000, ssWages: 60000, medicareWages: 60000, stateWages: 60000, stateWithheld: 1200 }];
  return p;
}

const near = (a: number, b: number, eps = 0.02) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

describe("bracketTax", () => {
  it("applies 2026 head-of-household brackets", () => {
    near(bracketTax(49808.87, TAX_TABLES[2026].brackets.head_of_household), 5623.06);
    assert.equal(bracketTax(0, TAX_TABLES[2026].brackets.head_of_household), 0);
  });
});

describe("computeTaxes — profitable year", () => {
  const input: TaxInput = {
    profile: household(),
    entries: [
      entry("2026-02-01", "inc_services", 36000),
      entry("2026-03-01", "exp_software", 6000),
      entry("2026-04-01", "exp_equipment", 10000),
      entry("2026-05-01", "exp_meals", 1000),
      entry("2025-05-01", "exp_software", 99999), // other year — ignored
    ],
    trips: [{ id: "t", date: "2026-06-01", from: "Home", to: "Client", purpose: "Install", miles: 1000, createdAt: "" }],
    time: [],
  };
  const s = computeTaxes(input);

  it("builds Schedule C with 50% meals and standard mileage", () => {
    assert.equal(s.schedules[0].grossReceipts, 36000);
    near(s.schedules[0].totalExpenses, 17225);
    near(s.netProfit, 18775);
  });
  it("computes SE tax, AGI, QBI and income tax", () => {
    near(s.seTax, 2652.82);
    near(s.agi, 77448.59);
    near(s.qbi.deduction, 3489.72);
    near(s.taxableIncome, 49808.87);
    near(s.incomeTax, 5623.06);
  });
  it("applies child tax credits and the fiancée's other-dependent credit", () => {
    assert.equal(s.ctcNonrefundable, 4400);
    assert.equal(s.odc, 500);
    assert.equal(s.eitc, 0);
    near(s.totalTax, 3375.88);
    near(s.federalBalance, -1624.12);
    assert.equal(s.hohQualified, true);
  });
  it("computes Arizona at 2.5% with the dependent credit", () => {
    near(s.az.tax, 1332.46);
    assert.equal(s.az.dependentCredit, 225);
    near(s.az.balance, -92.54);
  });
  it("plans next year's estimates", () => {
    const plan = estimatedTaxPlan(s, 2027);
    assert.equal(plan.due.length, 4);
  });
});

describe("computeTaxes — business loss offsets W-2 income", () => {
  const input: TaxInput = {
    profile: household(),
    entries: [entry("2026-02-01", "inc_services", 5000), entry("2026-03-01", "exp_contract_labor", 20000)],
    trips: [],
    time: [],
  };
  const s = computeTaxes(input);
  const w2Only = computeTaxes(input, { excludeBusiness: true });

  it("carries the loss into AGI with no SE tax", () => {
    assert.equal(s.netProfit, -15000);
    assert.equal(s.seTax, 0);
    assert.equal(s.agi, 45000);
    assert.equal(s.incomeTax, 2148);
  });
  it("turns unused child credit into the refundable ACTC and earns EITC", () => {
    assert.equal(s.ctcNonrefundable, 2148);
    assert.equal(s.actc, 2252);
    near(s.eitc, 2870.23);
  });
  it("shows the loss lowered the tax bill compared with W-2 only", () => {
    assert.ok(s.federalBalance < w2Only.federalBalance);
  });
});

describe("classifyDependent", () => {
  const t = TAX_TABLES[2026];
  it("a fiancée with too much income is not a dependent", () => {
    const r = classifyDependent({ id: "f", name: "F", relationship: "fiancee", birthDate: "1995-01-01", monthsLivedWithYou: 12, hasSsn: true, grossIncome: 20000 }, 2026, t);
    assert.equal(r.credit, "none");
    assert.equal(r.qualifiesForHoh, false);
  });
  it("a 17-year-old child gets the $500 credit, not the CTC", () => {
    const r = classifyDependent({ id: "k", name: "K", relationship: "son", birthDate: "2009-01-01", monthsLivedWithYou: 12, hasSsn: true }, 2026, t);
    assert.equal(r.credit, "odc");
    assert.equal(r.azCredit, 25);
  });
});

describe("guide and insights", () => {
  const input: TaxInput = {
    profile: household(),
    entries: [entry("2026-02-01", "inc_services", 5000, { vendor: "Client <A>" }), entry("2026-03-01", "exp_contract_labor", 20000), entry("2026-03-02", "exp_equipment", 900)],
    trips: [{ id: "t", date: "2026-06-01", from: "Home", to: "Site", purpose: "Install", miles: 12, roundTrip: true, createdAt: "" }],
    time: [{ id: "h", date: "2026-06-01", client: "A", description: "Extra", hours: 10, rate: 100, billed: false, createdAt: "" }],
  };
  const s = computeTaxes(input);
  it("flags the loss and the given-away time", () => {
    const ids = buildInsights(input, s).map((i) => i.id);
    assert.ok(ids.includes("loss-math"));
    assert.ok(ids.includes("unbilled"));
  });
  it("renders the printable guide with escaped text and the Schedule C", () => {
    const html = taxGuideHtml(input, s);
    assert.ok(html.includes("Schedule C"));
    assert.ok(html.includes("Client &lt;A&gt;"));
    assert.ok(!html.includes("window.print"));
    assert.ok(taxGuideHtml(input, s, { autoPrint: true }).includes("window.print"));
  });
});

describe("2024 and projected 2027", () => {
  it("2024 uses the $2,000 CTC, $21,900 HOH deduction and no overtime deduction", () => {
    const p = household();
    p.taxYear = 2024;
    p.w2Jobs[0].qualifiedOvertime = 5000;
    p.dependents[0].birthDate = "2016-03-01";
    p.dependents[1].birthDate = "2019-07-01";
    const s = computeTaxes({ profile: p, entries: [], trips: [], time: [] });
    assert.equal(s.standardDeduction, 21900);
    assert.equal(s.ctcNonrefundable, 4000);
    assert.equal(s.belowLine.length, 0);
    assert.equal(s.taxableIncome, 60000 - 21900);
  });
  it("2027 is indexed above 2026 and flagged as projected", () => {
    const p = household();
    p.taxYear = 2027;
    const s = computeTaxes({ profile: p, entries: [], trips: [], time: [] });
    assert.ok(s.standardDeduction > TAX_TABLES[2026].standardDeduction.head_of_household);
    assert.equal(TAX_TABLES[2027].brackets.married_joint[0], 25600);
    assert.ok(s.notes.some((n) => n.includes("projected")));
  });
});
