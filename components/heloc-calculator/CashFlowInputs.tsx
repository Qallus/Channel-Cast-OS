"use client";

import { NumberField, SummaryBox, SummaryRow } from "@/components/heloc-calculator/fields";
import { type Form, type SetField } from "@/components/heloc-calculator/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type HelocResults } from "@/lib/heloc/calc";
import { fmt } from "@/lib/heloc/format";

export function CashFlowInputs({
  form,
  set,
  results,
}: {
  form: Form;
  set: SetField;
  results: HelocResults;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Household cash flow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This drives every accelerated scenario. Expenses should exclude the entire house payment (P&amp;I, taxes,
          insurance, HOA), since those are entered on the mortgage card.
        </p>

        <NumberField id="income" label="Monthly take-home income" prefix="$" value={form.income} onChange={(v) => set("income", v)} />
        <NumberField
          id="expenses"
          label="Monthly expenses (excluding house payment)"
          prefix="$"
          value={form.expenses}
          onChange={(v) => set("expenses", v)}
        />

        <SummaryBox>
          <SummaryRow label="Cash flow before housing" value={fmt(results.cfGross)} />
          <SummaryRow
            label="Left over after full PITI"
            value={fmt(results.cfNet)}
            tone={results.cfNet < 0 ? "negative" : "default"}
          />
          <SummaryRow label="Left over under HELOC (taxes, insurance, HOA still paid)" value={fmt(results.cfHeloc)} />
        </SummaryBox>
      </CardContent>
    </Card>
  );
}
