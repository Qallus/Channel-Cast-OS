"use client";

import { NumberField } from "@/components/heloc-calculator/fields";
import { type Form, type SetField } from "@/components/heloc-calculator/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type HelocResults } from "@/lib/heloc/calc";
import { fmt, pct } from "@/lib/heloc/format";
import { cn } from "@/lib/utils";

export function HelocInputs({
  form,
  set,
  results,
}: {
  form: Form;
  set: SetField;
  results: HelocResults;
}) {
  const maxLtv = (Number.parseFloat(form.maxLtv) || 0) / 100;
  const ok = results.ltvOk;

  return (
    <Card>
      <CardHeader>
        <CardTitle>First-position HELOC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="helocRate" label="HELOC rate (variable)" suffix="%" step="0.01" value={form.helocRate} onChange={(v) => set("helocRate", v)} />
          <NumberField id="maxLtv" label="Max CLTV allowed" suffix="%" value={form.maxLtv} onChange={(v) => set("maxLtv", v)} />
        </div>
        <NumberField id="closing" label="Closing costs rolled into the line" prefix="$" value={form.closing} onChange={(v) => set("closing", v)} />
        <NumberField id="annualFee" label="Annual fee" prefix="$" value={form.annualFee} onChange={(v) => set("annualFee", v)} />

        <div
          className={cn(
            "space-y-1 rounded-lg border p-3 text-sm",
            ok ? "border-success/40 bg-success/10 text-foreground" : "border-destructive/40 bg-destructive/10 text-foreground",
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">Current LTV</span>
            <span className="font-semibold tabular-nums">
              {Number.parseFloat(form.homeValue) ? pct(results.ltvNow) : "—"}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">HELOC line needed</span>
            <span className="font-semibold tabular-nums">{fmt(results.lineNeeded)}</span>
          </div>
          <p className={cn("pt-1 font-semibold", ok ? "text-success" : "text-destructive")}>
            {ok
              ? `Fits: combined LTV ${pct(results.cltv)} is under the ${pct(maxLtv)} cap.`
              : `Doesn't fit: combined LTV ${pct(results.cltv)} exceeds the ${pct(maxLtv)} cap.`}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          A HELOC has no escrow. Taxes, insurance, and HOA are paid from the line as expenses. Mortgage insurance goes
          away entirely.
        </p>
      </CardContent>
    </Card>
  );
}
