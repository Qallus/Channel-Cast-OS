"use client";

import { useCallback, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

import { BalanceChart } from "@/components/heloc-calculator/BalanceChart";
import { CashFlowInputs } from "@/components/heloc-calculator/CashFlowInputs";
import { ContextNotes } from "@/components/heloc-calculator/ContextNotes";
import { DEFAULT_FORM, toInputs, type Form, type SetField } from "@/components/heloc-calculator/form";
import { HelocInputs } from "@/components/heloc-calculator/HelocInputs";
import { MortgageInputs } from "@/components/heloc-calculator/MortgageInputs";
import { ScenarioCard, type ScenarioRow } from "@/components/heloc-calculator/ScenarioCard";
import { Button } from "@/components/ui/button";
import { computeScenarios, cost, type Scenario } from "@/lib/heloc/calc";
import { fmt, monthsToString } from "@/lib/heloc/format";

/** "18 months, $12,400" — or an em dash when either scenario never pays off. */
function saved(a: Scenario, b: Scenario): string {
  if (a.months === null || b.months === null) return "—";
  return `${a.months - b.months} months, ${fmt(cost(a) - cost(b))}`;
}

export function HelocCalculator() {
  const [form, setForm] = useState<Form>(DEFAULT_FORM);

  const set = useCallback<SetField>((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const inputs = useMemo(() => toInputs(form), [form]);
  const results = useMemo(() => computeScenarios(inputs), [inputs]);

  const { base, extra, heloc } = results;
  const isWin = (s: Scenario) => s.months !== null && s.months === results.bestMonths;

  const baseRows: ScenarioRow[] = [
    { label: "Monthly payment (PITI)", value: fmt(results.piti), big: true },
    { label: "of which P&I", value: fmt(results.pi) },
    { label: "Time to payoff", value: monthsToString(base.months), big: true },
    { label: "Total interest paid", value: fmt(base.interest) },
    { label: "Total mortgage insurance paid", value: fmt(base.miPaid) },
    { label: "Total cost (interest + MI)", value: fmt(cost(base)) },
  ];

  const extraRows: ScenarioRow[] = [
    { label: "Monthly payment (PITI + extra)", value: fmt(results.extraPayment), big: true },
    { label: "Time to payoff", value: monthsToString(extra.months), big: true },
    { label: "Total interest paid", value: fmt(extra.interest) },
    { label: "Total mortgage insurance paid", value: fmt(extra.miPaid) },
    { label: "Saved vs. baseline", value: saved(base, extra) },
  ];

  const helocRows: ScenarioRow[] = [
    { label: "Minimum payment (interest-only, month 1)", value: fmt(heloc.firstInt ?? 0) },
    {
      label: "Taxes, insurance, HOA (paid from the line)",
      value: fmt(inputs.taxes + inputs.insurance + inputs.hoa),
    },
    { label: "Effective payment (all spare cash flow)", value: fmt(results.cfHeloc), big: true },
    { label: "Time to payoff", value: monthsToString(heloc.months), big: true },
    { label: "Total interest paid", value: fmt(heloc.interest) },
    { label: "Mortgage insurance", value: "$0" },
    { label: "Saved vs. baseline", value: saved(base, heloc) },
    { label: "Saved vs. extra principal", value: saved(extra, heloc) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Enter the homeowner&apos;s current loan, escrow items, and household cash flow. The three columns show what
          happens if they keep the mortgage as-is, keep it and apply spare cash flow as extra principal, or replace it
          with a first-position HELOC.
        </p>
        <Button variant="outline" className="shrink-0" onClick={() => setForm(DEFAULT_FORM)}>
          <RotateCcw className="h-4 w-4" /> Reset to example
        </Button>
      </div>

      {/* Input cards size to their content; the results row below stays equal-height. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <MortgageInputs form={form} set={set} results={results} />
        <CashFlowInputs form={form} set={set} results={results} />
        <HelocInputs form={form} set={set} results={results} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ScenarioCard title="Keep the mortgage" rows={baseRows} note="The baseline: nothing changes." win={isWin(base)} />
        <ScenarioCard
          title="Mortgage + extra principal"
          rows={extraRows}
          note={
            results.cfNet > 0
              ? "Same loan, same rate; spare cash flow goes to principal every month. No refinance, no new risk. Mortgage insurance still runs until it ends or the loan is gone."
              : "No spare cash flow after PITI, so this matches the baseline."
          }
          win={isWin(extra)}
        />
        <ScenarioCard
          title="First-position HELOC"
          rows={helocRows}
          note={
            heloc.months === null
              ? "Spare cash flow does not cover the interest, so the balance never falls."
              : `Starts at ${fmt(results.lineNeeded)} including closing costs, at ${inputs.helocRate.toFixed(2)}% variable.`
          }
          win={isWin(heloc)}
        />
      </div>

      <BalanceChart base={base} extra={extra} heloc={heloc} />

      <ContextNotes />
    </div>
  );
}
