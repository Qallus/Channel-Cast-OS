"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Series = { key: string; label: string };

/** Build a ChartConfig that maps each series to --chart-1..5. */
export function buildConfig(series: Series[]): ChartConfig {
  const cfg: ChartConfig = {};
  series.forEach((s, i) => {
    cfg[s.key] = { label: s.label, color: `hsl(var(--chart-${(i % 5) + 1}))` };
  });
  return cfg;
}

const sum = (rows: Record<string, unknown>[], key: string) => rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);

/* ── Area — Interactive (multi-series time trend) ────────────────────── */

export function AreaInteractive({
  title,
  description,
  data,
  xKey,
  series,
  formatValue = (n) => n.toLocaleString(),
  className,
  height = 220,
}: {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  formatValue?: (n: number) => string;
  className?: string;
  height?: number;
}) {
  const config = React.useMemo(() => buildConfig(series), [series]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
        </div>
        <div className="flex gap-5">
          {series.map((s, i) => (
            <div key={s.key} className="text-left">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: `hsl(var(--chart-${(i % 5) + 1}))` }} />
                {s.label}
              </div>
              <div className="text-lg font-semibold text-foreground">{formatValue(sum(data, s.key))}</div>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
          <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`hsl(var(--chart-${(i % 5) + 1}))`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`hsl(var(--chart-${(i % 5) + 1}))`} stopOpacity={0.04} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v) => formatValue(Number(v))} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            {series.map((s) => (
              <Area
                key={s.key}
                dataKey={s.key}
                type="monotone"
                stroke={`var(--color-${s.key})`}
                strokeWidth={2}
                fill={`url(#fill-${s.key})`}
                stackId={series.length > 1 ? "a" : undefined}
              />
            ))}
            {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ── Bar (single or grouped categories) ──────────────────────────────── */

export function BarByCategory({
  title,
  description,
  data,
  xKey,
  series,
  formatValue = (n) => n.toLocaleString(),
  className,
  height = 220,
}: {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  formatValue?: (n: number) => string;
  className?: string;
  height?: number;
}) {
  const config = React.useMemo(() => buildConfig(series), [series]);
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
          <BarChart data={data} margin={{ top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v) => formatValue(Number(v))} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={[4, 4, 0, 0]} />
            ))}
            {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ── Donut / Pie (single-item breakdown) ─────────────────────────────── */

export type DonutSlice = { key: string; label: string; value: number; color?: string };

export function DonutChart({
  title,
  description,
  slices,
  centerLabel,
  className,
  height = 240,
}: {
  title: string;
  description?: string;
  slices: DonutSlice[];
  centerLabel?: { value: string; label: string };
  className?: string;
  height?: number;
}) {
  const config: ChartConfig = React.useMemo(() => {
    const c: ChartConfig = {};
    slices.forEach((s, i) => (c[s.key] = { label: s.label, color: s.color || `hsl(var(--chart-${(i % 5) + 1}))` }));
    return c;
  }, [slices]);
  const data = slices.map((s, i) => ({ ...s, fill: s.color || `hsl(var(--chart-${(i % 5) + 1}))` }));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={config} className="mx-auto aspect-square" style={{ height }}>
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="label" hideLabel />} />
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={centerLabel ? 60 : 0} strokeWidth={4}>
              {data.map((d) => <Cell key={d.key} fill={d.fill} />)}
              {centerLabel ? (
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">{centerLabel.value}</tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">{centerLabel.label}</tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              ) : null}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="label" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ── Radial — single gauge with center text ──────────────────────────── */

export function RadialGauge({
  title,
  description,
  value,
  max,
  label,
  colorVar = "--chart-1",
  className,
  height = 240,
}: {
  title: string;
  description?: string;
  value: number;
  max: number;
  label: string;
  colorVar?: string;
  className?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value / (max || 1)));
  const endAngle = 90 - pct * 360; // start at top (90°), sweep clockwise
  const config: ChartConfig = { value: { label, color: `hsl(var(${colorVar}))` } };
  const data = [{ name: label, value, fill: `hsl(var(${colorVar}))` }];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={config} className="mx-auto aspect-square" style={{ height }}>
          <RadialBarChart data={data} startAngle={90} endAngle={endAngle} innerRadius={72} outerRadius={104}>
            <PolarAngleAxis type="number" domain={[0, max || 1]} tick={false} />
            <RadialBar dataKey="value" background cornerRadius={8} />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
              <tspan x="50%" dy="-0.1em" className="fill-foreground text-3xl font-semibold">{value.toLocaleString()}</tspan>
              <tspan x="50%" dy="1.6em" className="fill-muted-foreground text-xs">{label}</tspan>
            </text>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ── Radar — custom label ────────────────────────────────────────────── */

export function RadarSpec({
  title,
  description,
  data,
  angleKey,
  series,
  className,
  height = 260,
}: {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  angleKey: string;
  series: Series[];
  className?: string;
  height?: number;
}) {
  const config = React.useMemo(() => buildConfig(series), [series]);
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={config} className="mx-auto aspect-square" style={{ height }}>
          <RadarChart data={data}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <PolarAngleAxis dataKey={angleKey} />
            <PolarGrid />
            {series.map((s) => (
              <Radar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} fillOpacity={0.5} stroke={`var(--color-${s.key})`} />
            ))}
            {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// re-export for pages that want to build a horizontal labelled bar quickly
export { LabelList };
