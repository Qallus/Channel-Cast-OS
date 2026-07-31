"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

import { AreaInteractive, BarByCategory } from "@/components/charts/shadcn-charts";
import { CHART_ITEM, ChartSlider, LinkStat, SectionHeading, StatSlider } from "@/components/analytics/analytics-ui";
import { PageHeader } from "@/components/crm/crm-ui";
import { PERIODS, Period, getAnalytics } from "@/lib/analytics/analytics-data";
import { cn } from "@/lib/utils";

const num = new Intl.NumberFormat("en-US");
const usdK = (n: number) => `$${Math.round(n / 1000)}k`;
const playsK = (n: number) => `${Math.round(n / 1000)}k`;

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const a = useMemo(() => getAnalytics(period), [period]);
  const c = a.charts;

  // Parallel arrays → row objects the shadcn charts consume.
  const trend = useMemo(
    () =>
      c.labels.map((label, i) => ({
        x: label,
        revenue: c.revenue[i],
        plays: c.plays[i],
        activeClients: c.activeClients[i],
        activeLocations: c.activeLocations[i],
      })),
    [c],
  );
  const industry = useMemo(() => c.revenueByIndustry.map((d) => ({ x: d.label, value: d.value })), [c]);

  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="Analytics" description="Network-wide performance across playtime, revenue, partners, and devices." />

      {/* Period tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 sm:w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              "flex-1 rounded-md px-5 py-2 text-sm font-medium transition-colors sm:flex-none",
              period === p.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Playtime stats */}
      <section className="space-y-3">
        <SectionHeading title="Playtime Stats" />
        <StatSlider>
          {a.playtime.map((s) => <LinkStat key={s.key} stat={s} />)}
        </StatSlider>
      </section>

      {/* Revenue stats */}
      <section className="space-y-3">
        <SectionHeading title="Revenue Stats" />
        <StatSlider>
          {a.revenue.map((s) => <LinkStat key={s.key} stat={s} />)}
        </StatSlider>
      </section>

      {/* Partner stats */}
      <section className="space-y-3">
        <SectionHeading title="Partner Stats" />
        <StatSlider>
          {a.partner.map((s) => <LinkStat key={s.key} stat={s} />)}
        </StatSlider>
      </section>

      {/* Charts */}
      <section className="space-y-3">
        <SectionHeading title="Charts" hint="Swipe / scroll for more" />
        <ChartSlider>
          <AreaInteractive className={CHART_ITEM} title="Revenue Trend" description="Gross billed" data={trend} xKey="x" series={[{ key: "revenue", label: "Revenue" }]} formatValue={usdK} />
          <AreaInteractive className={CHART_ITEM} title="Audio Plays" description="Across the network" data={trend} xKey="x" series={[{ key: "plays", label: "Plays" }]} formatValue={playsK} />
          <BarByCategory className={CHART_ITEM} title="Revenue by Industry" description="By vertical" data={industry} xKey="x" series={[{ key: "value", label: "Revenue" }]} formatValue={usdK} />
          <AreaInteractive className={CHART_ITEM} title="Active Clients" description="Accounts live" data={trend} xKey="x" series={[{ key: "activeClients", label: "Clients" }]} formatValue={(n) => num.format(n)} />
          <AreaInteractive className={CHART_ITEM} title="Active Locations / Adspace" description="Footprint" data={trend} xKey="x" series={[{ key: "activeLocations", label: "Locations" }]} formatValue={(n) => num.format(n)} />
        </ChartSlider>
      </section>

      {/* Device stats */}
      <section className="space-y-3">
        <SectionHeading title="Device Stats" hint="Live posture across the footprint" />
        <StatSlider cols={6}>
          {a.devices.map((s) => <LinkStat key={s.key} stat={s} />)}
        </StatSlider>
      </section>
    </div>
  );
}
