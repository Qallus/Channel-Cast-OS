"use client";

import { NumberField, SummaryBox, SummaryRow } from "@/components/heloc-calculator/fields";
import { type Form, type SetField } from "@/components/heloc-calculator/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOAN_TYPES, MI_HINTS, type HelocResults, type LoanType } from "@/lib/heloc/calc";
import { fmt } from "@/lib/heloc/format";

export function MortgageInputs({
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
        <CardTitle>Current mortgage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="loanType" className="mb-1 block text-sm text-muted-foreground">
              Loan type
            </label>
            <Select value={form.loanType} onValueChange={(v) => set("loanType", v as LoanType)}>
              <SelectTrigger id="loanType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAN_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumberField id="homeValue" label="Home value today" prefix="$" value={form.homeValue} onChange={(v) => set("homeValue", v)} />
        </div>

        <NumberField id="balance" label="Balance owed" prefix="$" value={form.balance} onChange={(v) => set("balance", v)} />

        <div className="grid grid-cols-2 gap-3">
          <NumberField id="mortRate" label="Interest rate" suffix="%" step="0.01" value={form.mortRate} onChange={(v) => set("mortRate", v)} />
          <NumberField id="monthsLeft" label="Months remaining" value={form.monthsLeft} onChange={(v) => set("monthsLeft", v)} />
        </div>

        <NumberField
          id="mortPayment"
          label="Principal & interest only"
          hint="(auto; override if known)"
          prefix="$"
          placeholder={String(Math.round(results.autoPI))}
          value={form.mortPayment}
          onChange={(v) => set("mortPayment", v)}
        />

        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground">Escrow and other monthly costs</p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="taxes" label="Property taxes" prefix="$" value={form.taxes} onChange={(v) => set("taxes", v)} />
            <NumberField id="insurance" label="Home insurance" prefix="$" value={form.insurance} onChange={(v) => set("insurance", v)} />
            <NumberField id="mi" label="Mortgage insurance" prefix="$" value={form.mi} onChange={(v) => set("mi", v)} />
            <NumberField id="hoa" label="HOA" prefix="$" value={form.hoa} onChange={(v) => set("hoa", v)} />
          </div>
          <NumberField
            id="miEnds"
            label="Mortgage insurance ends after"
            hint="(months; blank = life of loan)"
            placeholder="life of loan"
            value={form.miEnds}
            onChange={(v) => set("miEnds", v)}
          />
          <p className="text-xs text-muted-foreground">{MI_HINTS[form.loanType]}</p>
        </div>

        <SummaryBox>
          <SummaryRow label="P&I" value={fmt(results.pi)} />
          <SummaryRow label="Escrow + HOA" value={fmt(results.escrow)} />
          <SummaryRow label="Total monthly (PITI)" value={fmt(results.piti)} strong />
        </SummaryBox>
      </CardContent>
    </Card>
  );
}
