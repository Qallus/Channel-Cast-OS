import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  amortize,
  computeScenarios,
  cost,
  DEFAULT_INPUTS,
  helocScenario,
  monthlyPayment,
  type HelocInputs,
} from "./calc.ts";

/** Close enough for money, where the reference is a float accumulation. */
const near = (actual: number, expected: number, tol = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `expected ${actual} to be within ${tol} of ${expected}`,
  );

describe("monthlyPayment", () => {
  it("matches the reference P&I for the default loan", () => {
    near(monthlyPayment(200000, 0.03, 324), 901, 1);
  });

  it("divides evenly at a 0% rate", () => {
    assert.equal(monthlyPayment(120000, 0, 120), 1000);
  });

  it("is 0 when no months remain", () => {
    assert.equal(monthlyPayment(200000, 0.03, 0), 0);
  });
});

describe("amortize", () => {
  it("pays off in exactly monthsLeft with the computed P&I and no extra", () => {
    const pi = monthlyPayment(200000, 0.03, 324);
    const s = amortize(200000, 0.03, pi, () => 0, 0, null);
    assert.equal(s.months, 324);
  });

  it("never pays off when P&I is at or below the first month's interest", () => {
    const firstInterest = 200000 * (0.03 / 12); // 500
    assert.equal(amortize(200000, 0.03, firstInterest, () => 0, 0, null).months, null);
    assert.equal(amortize(200000, 0.03, firstInterest - 1, () => 0, 0, null).months, null);
  });

  it("stops charging mortgage insurance at miEnds", () => {
    const pi = monthlyPayment(200000, 0.03, 324);
    const ends = amortize(200000, 0.03, pi, () => 0, 100, 12);
    assert.equal(ends.miPaid, 1200);
  });

  it("charges mortgage insurance for the life of the loan when miEnds is null", () => {
    const pi = monthlyPayment(200000, 0.03, 324);
    const life = amortize(200000, 0.03, pi, () => 0, 100, null);
    assert.equal(life.months, 324);
    assert.equal(life.miPaid, 100 * 324);
  });

  it("rolls the dropped mortgage insurance into extra principal", () => {
    // extraFn keeps the household's total outlay flat, so the extra grows by
    // exactly the MI amount the month MI falls away.
    const pi = monthlyPayment(200000, 0.03, 324);
    const spare = 1000;
    const extraFn = (miNow: number) => Math.max(spare - miNow, 0);
    const ends = amortize(200000, 0.03, pi, extraFn, 100, 12);
    const life = amortize(200000, 0.03, pi, extraFn, 100, null);
    assert.ok(ends.months !== null && life.months !== null);
    assert.ok(
      (ends.months as number) < (life.months as number),
      `expected MI ending at 12 months (${ends.months}) to pay off faster than MI for life (${life.months})`,
    );
  });

  it("reports the starting balance first and a zero at payoff", () => {
    const pi = monthlyPayment(200000, 0.03, 324);
    const s = amortize(200000, 0.03, pi, () => 0, 0, null);
    assert.equal(s.series[0], 200000);
    assert.equal(s.series[s.series.length - 1], 0);
  });
});

describe("helocScenario", () => {
  it("never pays off when spare cash flow is below the first month's interest", () => {
    // Net deposit of $100/mo against roughly $1,340 of month-1 interest.
    const s = helocScenario(200000, 0.0825, 9500, 9400, 75);
    assert.equal(s.months, null);
    assert.ok((s.firstInt as number) > 9500 - 9400);
  });

  it("beats the baseline mortgage when cash flow is strong", () => {
    const pi = monthlyPayment(200000, 0.03, 324);
    const base = amortize(200000, 0.03, pi, () => 0, 0, null);
    const hel = helocScenario(200000, 0.0825, 9500, 5900, 75);
    assert.ok(hel.months !== null);
    assert.ok((hel.months as number) < (base.months as number));
  });

  it("charges interest on the average balance, not the opening balance", () => {
    // avg = bal - income + draws/2 = 200000 - 9500 + 2950 = 193450 at 8.25%/12.
    const s = helocScenario(200000, 0.0825, 9500, 5900, 0);
    near(s.firstInt as number, 193450 * (0.0825 / 12));
  });

  it("carries no mortgage insurance", () => {
    assert.equal(helocScenario(200000, 0.0825, 9500, 5900, 75).miPaid, 0);
  });
});

describe("computeScenarios with the default inputs", () => {
  const r = computeScenarios(DEFAULT_INPUTS);

  it("derives the same payment breakdown as the reference HTML", () => {
    near(r.autoPI, 901.4010779073943);
    assert.equal(r.escrow, 540);
    near(r.piti, 1441.4010779073942);
    assert.equal(r.cfGross, 4000);
    near(r.cfNet, 2558.598922092606);
    assert.equal(r.helocDraws, 5900);
    assert.equal(r.cfHeloc, 3600);
    assert.equal(r.extraPayment, 3600);
  });

  it("derives the same CLTV check as the reference HTML", () => {
    assert.equal(r.lineNeeded, 203500);
    near(r.cltv, 0.45222222222222225, 1e-9);
    near(r.ltvNow, 0.4444444444444444, 1e-9);
    assert.equal(r.ltvOk, true);
  });

  it("reproduces the reference HTML's three payoff times", () => {
    assert.equal(r.base.months, 324);
    assert.equal(r.extra.months, 63);
    assert.equal(r.heloc.months, 71);
    assert.equal(r.bestMonths, 63);
  });

  it("reproduces the reference HTML's interest and MI totals", () => {
    near(r.base.interest, 92053.9492419902);
    assert.equal(r.base.miPaid, 45360);
    near(cost(r.base), 137413.9492419902);

    near(r.extra.interest, 16284.764235883671);
    assert.equal(r.extra.miPaid, 8820);
    near(cost(r.extra), 25104.76423588367);

    near(r.heloc.interest, 51048.07863698293);
    assert.equal(r.heloc.miPaid, 0);
    near(r.heloc.firstInt as number, 1354.03125);
  });

  it("honours a P&I override instead of the computed payment", () => {
    const override: HelocInputs = { ...DEFAULT_INPUTS, mortPayment: 1200 };
    const o = computeScenarios(override);
    assert.equal(o.pi, 1200);
    assert.ok((o.base.months as number) < 324);
  });

  it("treats a blank P&I as the computed payment", () => {
    assert.equal(computeScenarios({ ...DEFAULT_INPUTS, mortPayment: null }).pi, r.autoPI);
  });

  it("fails the CLTV check once the cap drops below the line needed", () => {
    assert.equal(computeScenarios({ ...DEFAULT_INPUTS, maxLtv: 40 }).ltvOk, false);
  });

  it("matches the baseline when there is no spare cash flow", () => {
    const tight = computeScenarios({ ...DEFAULT_INPUTS, income: 6000, expenses: 5500 });
    assert.ok(tight.cfNet < 0);
    assert.equal(tight.extra.months, tight.base.months);
    near(tight.extra.interest, tight.base.interest);
  });
});
