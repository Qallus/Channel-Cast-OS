"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Info, TrendingDown } from "lucide-react";

import { FormField, StatRow, StatTile } from "@/components/crm/crm-ui";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { buildInsights, expenseBreakdown, monthlyPnl, type Insight } from "@/lib/finance/insights";
import { computeTaxes, estimatedTaxPlan, type TaxInput, type TaxSummary } from "@/lib/finance/tax";
import { cn } from "@/lib/utils";

import { NumberInput, Section, signedUsd, usd0 } from "./fin-ui";

const CHART = {
  income: { label: "Income", color: "hsl(var(--brand))" },
  expenses: { label: "Expenses", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;

/** What you keep: wages + business result − every tax, + refundable credits. */
const takeHome = (s: TaxSummary) => s.w2Wages + s.netProfit - s.totalTax - s.az.liability + s.actc + s.eitc;

export function OverviewPanel({ input, summary }: { input: TaxInput; summary: TaxSummary }) {
  const w2Only = useMemo(() => computeTaxes(input, { excludeBusiness: true }), [input]);
  const months = useMemo(() => monthlyPnl(input), [input]);
  const breakdown = useMemo(() => expenseBreakdown(input), [input]);
  const insights = useMemo(() => buildInsights(input, summary), [input, summary]);
  const plan = estimatedTaxPlan(summary, summary.year + 1);

  const revenue = summary.schedules.reduce((a, s) => a + s.grossReceipts + s.otherIncome, 0);
  const expenses = summary.schedules.reduce((a, s) => a + s.totalExpenses + s.cogs + s.returns, 0);
  const owedTotal = summary.federalBalance + summary.az.balance;
  const taxDelta = (summary.totalTax + summary.az.liability - summary.actc - summary.eitc) - (w2Only.totalTax + w2Only.az.liability - w2Only.actc - w2Only.eitc);
  const maxCat = breakdown[0]?.amount || 1;

  return (
    <div className="space-y-6">
      <StatRow>
        <StatTile label="Business revenue" value={usd0.format(revenue)} hint={`${summary.year} gross receipts`} />
        <StatTile label="Business expenses" value={usd0.format(expenses)} hint="Deductible, incl. mileage & home office" />
        <StatTile label="Net profit / loss" value={signedUsd(summary.netProfit)} accent={summary.netProfit >= 0} hint={summary.netProfit < 0 ? "Schedule C loss" : "Schedule C line 31"} />
        <StatTile label={owedTotal > 0 ? "Est. owed at filing" : "Est. refund"} value={usd0.format(Math.abs(owedTotal))} hint={`Federal ${signedUsd(summary.federalBalance)} · AZ ${signedUsd(summary.az.balance)}`} />
      </StatRow>

      {/* W-2 effect */}
      <Section title="Your W-2 with and without the business" description="Same household, same W-2 — the only difference is the business. This is what the business is really doing to your money.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 font-medium" />
                <th className="py-2 text-right font-medium">W-2 only</th>
                <th className="py-2 text-right font-medium">With business</th>
                <th className="py-2 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Adjusted gross income", w2Only.agi, summary.agi],
                ["Federal income + SE tax", w2Only.totalTax, summary.totalTax],
                ["Refundable credits (ACTC + EITC)", w2Only.actc + w2Only.eitc, summary.actc + summary.eitc],
                ["Arizona tax", w2Only.az.liability, summary.az.liability],
                ["Refund (−) / owed (+)", w2Only.federalBalance + w2Only.az.balance, owedTotal],
                ["Take-home after tax", takeHome(w2Only), takeHome(summary)],
              ].map(([label, a, b]) => (
                <tr key={label as string} className="border-b border-border/60 last:border-0">
                  <td className="py-2 text-foreground">{label}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{signedUsd(a as number)}</td>
                  <td className="py-2 text-right tabular-nums text-foreground">{signedUsd(b as number)}</td>
                  <td className={cn("py-2 text-right font-medium tabular-nums", (b as number) - (a as number) === 0 ? "text-muted-foreground" : "text-foreground")}>{signedUsd((b as number) - (a as number))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {summary.netProfit < 0
            ? <>The business lost {usd0.format(-summary.netProfit)} and cut your taxes by {usd0.format(-taxDelta)}. Net, it cost you <span className="font-semibold text-foreground">{usd0.format(-summary.netProfit + taxDelta)}</span> this year.</>
            : <>The business added {usd0.format(summary.netProfit)} of profit and {usd0.format(taxDelta)} of tax, so it put <span className="font-semibold text-foreground">{usd0.format(summary.netProfit - taxDelta)}</span> in your pocket.</>}
          {" "}Your federal bracket is {Math.round(summary.marginalRate * 100)}% + 2.5% Arizona{summary.seTax > 0 ? " + 15.3% self-employment tax on profit" : ""}.
        </p>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section title="Income vs. expenses by month" description={`Business only, ${summary.year}`}>
          <ChartContainer config={CHART} className="aspect-auto h-[260px] w-full">
            <BarChart data={months} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Section>

        <Section title="Where the money goes" description="Business expense categories, largest first">
          {breakdown.length === 0 ? <p className="text-sm text-muted-foreground">No expenses recorded for {summary.year} yet.</p> : (
            <ul className="space-y-2">
              {breakdown.slice(0, 10).map((c) => (
                <li key={c.id}>
                  <div className="flex justify-between gap-2 text-sm"><span className="truncate text-foreground">{c.label}</span><span className="tabular-nums text-muted-foreground">{usd0.format(c.amount)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.max(2, (c.amount / maxCat) * 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section title="What to do about it" description="Findings from your books, biggest first">
          <ul className="space-y-3">
            {insights.map((i) => <InsightRow key={i.id} insight={i} />)}
          </ul>
        </Section>
        <div className="space-y-6">
          <WhatIf input={input} base={summary} />
          <Section title={`${summary.year + 1} quarterly estimates`} description="Safe harbor: pay this year's tax again, spread across four dates, and there's no penalty.">
            <div className="space-y-1.5 text-sm">
              {plan.due.map((d) => (
                <div key={d} className="flex justify-between"><span className="text-muted-foreground">{new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span><span className="tabular-nums text-foreground">Fed {usd0.format(plan.fedPerQuarter)} · AZ {usd0.format(plan.azPerQuarter)}</span></div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">Already covered by W-2 withholding? Then these show $0. Raising your W-4 withholding works too and counts as paid evenly through the year.</p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const Icon = insight.tone === "good" ? CheckCircle2 : insight.tone === "risk" ? TrendingDown : insight.tone === "warn" ? AlertTriangle : Info;
  const color = insight.tone === "good" ? "text-success" : insight.tone === "risk" ? "text-destructive" : insight.tone === "warn" ? "text-warning" : "text-muted-foreground";
  return (
    <li className="flex gap-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", color)} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{insight.title}</p>
        <p className="text-sm text-muted-foreground">{insight.detail}</p>
      </div>
    </li>
  );
}

function WhatIf({ input, base }: { input: TaxInput; base: TaxSummary }) {
  const [revenue, setRevenue] = useState(0);
  const [cuts, setCuts] = useState(0);
  const [retirement, setRetirement] = useState(0);
  const alt = useMemo(() => computeTaxes(input, { extraRevenue: revenue * 12, extraExpenses: -cuts * 12, extraRetirement: retirement }), [input, revenue, cuts, retirement]);
  const delta = takeHome(alt) - retirement - (takeHome(base));
  const changed = revenue || cuts || retirement;
  return (
    <Section title="What if…" description="Try a change and see what you'd actually keep after tax.">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        <FormField label="More revenue / month"><NumberInput value={revenue} onChange={setRevenue} step="100" min={0} /></FormField>
        <FormField label="Costs cut / month"><NumberInput value={cuts} onChange={setCuts} step="50" min={0} /></FormField>
        <FormField label="SEP-IRA contribution"><NumberInput value={retirement} onChange={setRetirement} step="500" min={0} /></FormField>
      </div>
      {changed ? (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-foreground">Net profit {signedUsd(base.netProfit)} → <span className="font-semibold">{signedUsd(alt.netProfit)}</span></p>
          <p className="text-foreground">Cash you keep this year: <span className={cn("font-semibold", delta >= 0 ? "text-success" : "text-destructive")}>{signedUsd(delta)}</span>{retirement ? <span className="text-muted-foreground"> (plus {usd0.format(retirement)} saved for retirement)</span> : null}</p>
          <p className="text-xs text-muted-foreground">Tax change: {signedUsd(alt.totalTax + alt.az.liability - alt.actc - alt.eitc - (base.totalTax + base.az.liability - base.actc - base.eitc))}</p>
        </div>
      ) : null}
    </Section>
  );
}
