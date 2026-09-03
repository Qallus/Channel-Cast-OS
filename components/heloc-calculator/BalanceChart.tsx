"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Scenario } from "@/lib/heloc/calc";
import { fmt } from "@/lib/heloc/format";

const CONFIG = {
  base: { label: "Keep the mortgage", color: "hsl(var(--muted-foreground))" },
  extra: { label: "Mortgage + extra principal", color: "hsl(var(--foreground))" },
  // The one place lime appears in the chart.
  heloc: { label: "First-position HELOC", color: "hsl(var(--brand))" },
} satisfies ChartConfig;

export function BalanceChart({ base, extra, heloc }: { base: Scenario; extra: Scenario; heloc: Scenario }) {
  const data = useMemo(() => {
    const len = Math.max(base.series.length, extra.series.length, heloc.series.length);
    // A scenario that finished early is flat at zero for the rest of the chart.
    const at = (s: number[], k: number) => s[k] ?? 0;
    return Array.from({ length: len }, (_, k) => ({
      year: `Yr ${k}`,
      base: at(base.series, k),
      extra: at(extra.series, k),
      heloc: at(heloc.series, k),
    }));
  }, [base.series, extra.series, heloc.series]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance over time</CardTitle>
        <CardDescription>Remaining balance each year under each scenario.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CONFIG} className="aspect-auto h-[280px] w-full">
          <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{CONFIG[name as keyof typeof CONFIG]?.label ?? name}</span>
                  <span className="font-mono font-medium tabular-nums text-foreground">{fmt(Number(value))}</span>
                </div>
              )} />}
            />
            {/* The chart recomputes on every keystroke, so the draw-in animation is off. */}
            <Line dataKey="base" type="monotone" stroke="var(--color-base)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="extra" type="monotone" stroke="var(--color-extra)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="heloc" type="monotone" stroke="var(--color-heloc)" strokeWidth={3} dot={false} isAnimationActive={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
