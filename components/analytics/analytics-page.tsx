"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

import { AreaLine, ChartCard, Columns } from "@/components/charts/mini-charts";
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
        <SectionHeading title="Charts" hint="Tap a card to scroll on smaller screens" />
        <ChartSlider>
          <ChartCard title="Revenue Trend" className={CHART_ITEM}>
            <AreaLine data={c.revenue} labels={c.labels} height={150} formatY={usdK} />
          </ChartCard>
          <ChartCard title="Audio Plays" className={CHART_ITEM}>
            <AreaLine data={c.plays} labels={c.labels} height={150} formatY={playsK} />
          </ChartCard>
          <ChartCard title="Revenue by Industry" className={CHART_ITEM}>
            <Columns data={c.revenueByIndustry} height={150} formatY={usdK} />
          </ChartCard>
          <ChartCard title="Active Clients" className={CHART_ITEM}>
            <AreaLine data={c.activeClients} labels={c.labels} height={150} formatY={(n) => num.format(n)} />
          </ChartCard>
          <ChartCard title="Active Locations / Adspace" className={CHART_ITEM}>
            <AreaLine data={c.activeLocations} labels={c.labels} height={150} formatY={(n) => num.format(n)} />
          </ChartCard>
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
