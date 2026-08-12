import {
  AlertTriangle,
  Cpu,
  MonitorCog,
  Plus,
  Send,
  Trophy,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  alerts,
  deploymentQueues,
  deviceHealth,
  deviceHealthNote,
  kpis,
  recentPlayback,
  recentQuotes,
  revenueSnapshot,
  topAdSpots,
  topDevices,
  type AlertSeverity,
  type DeviceHealthKey,
} from "@/lib/dashboard/mock-data";

export const metadata = { title: "Super Admin · Channel Cast" };

const healthTileStyles: Record<DeviceHealthKey, string> = {
  online: "border-brand/40 bg-brand/10",
  warning: "border-warning/30 bg-warning/5",
  offline: "border-border bg-muted/40",
  error: "border-destructive/30 bg-destructive/5",
};

const alertStyles: Record<AlertSeverity, string> = {
  high: "bg-destructive/10 text-destructive",
  med: "bg-warning/15 text-warning",
  low: "bg-muted text-muted-foreground",
};

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Super Admin command center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Network-wide view of clients, advertisers, devices, campaigns, playback health,
            quotes, and revenue — preview data for layout and workflows.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button>
            <Send className="h-4 w-4" />
            Deploy campaign
          </Button>
          <Button variant="outline">
            <Plus className="h-4 w-4" />
            Add device
          </Button>
        </div>
      </div>

      {/* KPI row — single slidable row on mobile, grid from sm up */}
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5 2xl:grid-cols-10">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="w-36 shrink-0 sm:w-auto sm:shrink">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Device health + Campaign deployment */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Device health overview</CardTitle>
              <CardDescription>Live posture across the footprint</CardDescription>
            </div>
            <Cpu className="h-5 w-5 text-brand-strong" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {deviceHealth.map((tile) => (
                <div
                  key={tile.key}
                  className={cn("rounded-lg border p-3 text-center", healthTileStyles[tile.key])}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {tile.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{tile.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{deviceHealthNote}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Campaign deployment status</CardTitle>
              <CardDescription>Pipelines queued for rollout</CardDescription>
            </div>
            <MonitorCog className="h-5 w-5 text-brand-strong" />
          </CardHeader>
          <CardContent className="space-y-3">
            {deploymentQueues.map((queue) => (
              <div key={queue.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-foreground">{queue.name}</span>
                  <span className="font-medium text-muted-foreground">{queue.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${queue.progress}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Revenue snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue snapshot</CardTitle>
          <CardDescription>Blended pacing · trailing 28 days · {revenueSnapshot.model}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Gross billed</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{revenueSnapshot.grossBilled}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Net to Channel Cast</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{revenueSnapshot.netToChannelCast}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Client payouts</p>
              <p className="mt-1 text-xl font-semibold text-brand-strong">{revenueSnapshot.clientPayouts}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts & errors */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <CardTitle>Alerts &amp; errors</CardTitle>
            <CardDescription>Operational triage lane</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.message}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
            >
              <span
                className={cn(
                  "inline-flex min-w-[42px] justify-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase",
                  alertStyles[alert.severity],
                )}
              >
                {alert.severity}
              </span>
              <span className="text-sm text-foreground">{alert.message}</span>
            </div>
          ))}
          <Button variant="secondary" className="w-full">
            Route to automation
          </Button>
        </CardContent>
      </Card>

      {/* Playback + Quotes */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent playback activity</CardTitle>
            <CardDescription>Motion, AI camera, and scheduled completions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Trigger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPlayback.map((row) => (
                  <TableRow key={`${row.time}-${row.device}`}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{row.time}</TableCell>
                    <TableCell className="font-medium text-foreground">{row.device}</TableCell>
                    <TableCell className="text-muted-foreground">{row.track}</TableCell>
                    <TableCell className="text-muted-foreground">{row.campaign}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {row.trigger}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent quote requests</CardTitle>
            <CardDescription>Deal desk pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentQuotes.map((quote) => (
              <div key={quote.lead} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{quote.lead}</span>
                    <Badge variant={quote.status === "new" ? "default" : "secondary"} className="text-[10px]">
                      {quote.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{quote.listing}</p>
                </div>
                <span className="whitespace-nowrap text-sm font-medium text-foreground">{quote.budget}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top devices + Top ad spots */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Trophy className="h-5 w-5 text-brand-strong" />
            <div>
              <CardTitle>Top performing devices</CardTitle>
              <CardDescription>Impression-weighted 7-day leaderboard</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDevices.map((device) => (
              <div key={device.name} className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {device.rank}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{device.name}</p>
                  <p className="text-xs text-muted-foreground">{device.plays}</p>
                </div>
                <Badge variant={device.status === "Online" ? "default" : "secondary"}>{device.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Volume2 className="h-5 w-5 text-brand-strong" />
            <div>
              <CardTitle>Top performing ad spots</CardTitle>
              <CardDescription>Weighted delivery and completion</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topAdSpots.map((spot) => (
              <div key={spot.name} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{spot.name}</p>
                  <p className="text-xs text-muted-foreground">{spot.fillRate}</p>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{spot.plays}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
