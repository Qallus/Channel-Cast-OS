"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

import { AreaLine, ChartCard, Columns, Donut, RankBars, STATUS_COLORS } from "@/components/charts/mini-charts";
import { PageHeader, StatRow, StatTile, ViewSwitcher } from "@/components/crm/crm-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-US");
const usdK = (n: number) => `$${Math.round(n / 1000)}k`;

const MONTHS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const REVENUE = [21400, 23800, 26100, 24900, 28700, 31200, 33800, 36400, 39100, 41800, 44200, 46900];
const PLAYS = [612000, 688000, 731000, 704000, 812000, 903000, 968000, 1044000, 1121000, 1198000, 1276000, 1362000];
const DEVICES = [
  { label: "Online", value: 821, color: STATUS_COLORS.good },
  { label: "Warning", value: 54, color: STATUS_COLORS.warning },
  { label: "Offline", value: 17, color: STATUS_COLORS.offline },
  { label: "Error", value: 0, color: STATUS_COLORS.error },
];
const TOP_CLIENTS = [
  { label: "Northwind Retail Group", value: 12400 },
  { label: "Oasis Tower Resorts", value: 7800 },
  { label: "Harbor Lights Resort", value: 6100 },
  { label: "Copper Mesa Apartments", value: 3200 },
  { label: "Ocean Drive Group", value: 2600 },
];
const REVENUE_BY_INDUSTRY = [
  { label: "Hospitality", value: 15800 },
  { label: "Retail", value: 14500 },
  { label: "Food & Bev", value: 4200 },
  { label: "Events", value: 1900 },
  { label: "Real Estate", value: 3200 },
];

type Range = "6m" | "12m";
const RANGES = [
  { id: "6m" as const, label: "6 months", icon: BarChart3 },
  { id: "12m" as const, label: "12 months", icon: BarChart3 },
];

export function AnalyticsPage() {
  const [range, setRange] = useState<Range>("12m");
  const n = range === "6m" ? 6 : 12;

  const months = useMemo(() => MONTHS.slice(-n), [n]);
  const revenue = useMemo(() => REVENUE.slice(-n), [n]);
  const plays = useMemo(() => PLAYS.slice(-n), [n]);

  const totalRevenue = revenue.reduce((s, v) => s + v, 0);
  const totalPlays = plays.reduce((s, v) => s + v, 0);
  const wow = Math.round(((REVENUE[11] - REVENUE[10]) / REVENUE[10]) * 100);

  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="Analytics" description="Network-wide performance across revenue, delivery, and devices." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Trailing {range === "6m" ? "6" : "12"} months</p>
        <ViewSwitcher views={RANGES} value={range} onChange={setRange} />
      </div>

      <StatRow>
        <StatTile label="Revenue" value={usd.format(totalRevenue)} accent hint={`+${wow}% MoM`} />
        <StatTile label="Total plays" value={num.format(totalPlays)} />
        <StatTile label="Active campaigns" value={37} hint="12 ending soon" />
        <StatTile label="Online devices" value="821 / 892" hint="92% uptime" />
      </StatRow>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue trend" description={`Monthly gross billed · trailing ${n} months`}>
          <AreaLine data={revenue} labels={months} formatY={usdK} />
        </ChartCard>
        <ChartCard title="Audio plays" description={`Monthly plays across the network · trailing ${n} months`}>
          <AreaLine data={plays} labels={months} formatY={(v) => `${Math.round(v / 1000)}k`} />
        </ChartCard>
        <ChartCard title="Device health" description="Live posture across the footprint">
          <Donut data={DEVICES} />
        </ChartCard>
        <ChartCard title="Revenue by industry" description="This month, by vertical">
          <Columns data={REVENUE_BY_INDUSTRY} formatY={usdK} />
        </ChartCard>
        <ChartCard title="Top clients by MRR" description="Highest monthly recurring revenue" className="lg:col-span-2">
          <RankBars data={TOP_CLIENTS} formatV={(v) => usd.format(v)} />
        </ChartCard>
      </div>

      {/* Table view — accessibility fallback for the trend charts */}
      <Card>
        <CardContent className="pt-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Monthly breakdown</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Plays</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {months.map((m, i) => (
                  <TableRow key={m}>
                    <TableCell className="font-medium text-foreground">{m}</TableCell>
                    <TableCell className="text-right text-foreground">{usd.format(revenue[i])}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{num.format(plays[i])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
