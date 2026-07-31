"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ImageIcon,
  Play,
  Power,
  RefreshCw,
  Settings,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  STATUS_META,
  PROVISIONING_META,
  getDeviceType,
  type DeviceRecord,
  type StatusTone,
} from "@/lib/devices/devices";
import {
  errorsFor,
  heartbeatsFor,
  playbackFor,
  scheduleFor,
} from "@/lib/devices/detail-mock";
import { mockDevices } from "@/lib/devices/mock-data";
import { cn } from "@/lib/utils";

const toneClasses: Record<StatusTone, string> = {
  brand: "border-transparent bg-brand/15 text-brand-strong",
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  destructive: "border-transparent bg-destructive/15 text-destructive",
  info: "border-transparent bg-secondary text-secondary-foreground",
  muted: "border-transparent bg-muted text-muted-foreground",
};

const TABS = ["Overview", "Playback", "Heartbeats", "Errors", "Schedule", "Install photos"] as const;
type Tab = (typeof TABS)[number];

export function DeviceDetail({ deviceCode }: { deviceCode: string }) {
  const device = useMemo<DeviceRecord | undefined>(
    () => mockDevices.find((d) => d.deviceCode === deviceCode),
    [deviceCode],
  );
  const [tab, setTab] = useState<Tab>("Overview");

  if (!device) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Device <span className="font-mono">{deviceCode}</span> was not found.</p>
        <Button asChild variant="outline">
          <Link href="/app/admin/devices">
            <ArrowLeft className="h-4 w-4" /> Back to Device Fleet
          </Link>
        </Button>
      </div>
    );
  }

  const typeMeta = getDeviceType(device.type);
  const Icon = typeMeta.icon;
  const status = STATUS_META[device.status];
  const errors = errorsFor(device);

  return (
    <div className="space-y-5">
      <Link href="/app/admin/devices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Device Fleet
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{device.name}</h1>
              <Badge className={cn("capitalize", toneClasses[status.tone])}>{status.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {device.deviceCode} · {typeMeta.label} · {device.model}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm"><Play className="h-4 w-4" /> Test audio</Button>
          <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4" /> Sync schedule</Button>
          <Button variant="outline" size="sm"><Power className="h-4 w-4" /> Restart</Button>
          <Button variant="outline" size="sm"><Settings className="h-4 w-4" /> Edit</Button>
        </div>
      </div>

      {/* Overview stat strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Info label="Last heartbeat" value={device.lastHeartbeat ?? "Never"} />
        <Info label="Firmware" value={device.firmwareVersion ?? "—"} />
        <Info label="Volume" value={`${device.volume}%`} />
        <Info label="Owner" value={device.ownerOrg} />
        <Info label="Location" value={device.locationName ?? "Unassigned"} />
        <Info label="Provisioning" value={PROVISIONING_META[device.provisioningMode].label} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
              t === tab ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {t}
            {t === "Errors" && errors.length > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive/15 px-1.5 text-[11px] text-destructive">{errors.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab device={device} />}
      {tab === "Playback" && <PlaybackTab device={device} />}
      {tab === "Heartbeats" && <HeartbeatsTab device={device} />}
      {tab === "Errors" && <ErrorsTab device={device} />}
      {tab === "Schedule" && <ScheduleTab device={device} />}
      {tab === "Install photos" && <InstallPhotosTab />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}

function OverviewTab({ device }: { device: DeviceRecord }) {
  const errors = errorsFor(device);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Health</CardTitle>
          <CardDescription>Current posture and last-known telemetry</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row k="Status" v={STATUS_META[device.status].label} />
          <Row k="Last heartbeat" v={device.lastHeartbeat ?? "Never connected"} />
          <Row k="Firmware" v={device.firmwareVersion ?? "Not reported"} />
          <Row k="Open errors" v={String(errors.length)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
          <CardDescription>Where this device is deployed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row k="Owner" v={device.ownerOrg} />
          <Row k="Location" v={device.locationName ?? "Unassigned"} />
          <Row k="Provisioning" v={PROVISIONING_META[device.provisioningMode].label} />
          <Row k="Default volume" v={`${device.volume}%`} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  );
}

function PlaybackTab({ device }: { device: DeviceRecord }) {
  const rows = playbackFor(device);
  if (!rows.length) return <EmptyState message="No playback recorded yet. Logs appear once the device is online and running a schedule." />;
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Track</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{r.time}</TableCell>
                <TableCell className="font-medium text-foreground">{r.track}</TableCell>
                <TableCell className="text-muted-foreground">{r.campaign}</TableCell>
                <TableCell><Badge variant="secondary" className="font-mono text-[11px]">{r.trigger}</Badge></TableCell>
                <TableCell className={cn("capitalize", r.result === "completed" ? "text-success" : r.result === "partial" ? "text-warning" : "text-muted-foreground")}>{r.result}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function HeartbeatsTab({ device }: { device: DeviceRecord }) {
  const rows = heartbeatsFor(device);
  if (!rows.length) return <EmptyState message="No heartbeats yet — this device has not connected." />;
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Firmware</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Signal</TableHead>
              <TableHead>Volume</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{r.time}</TableCell>
                <TableCell className="capitalize text-foreground">{r.status}</TableCell>
                <TableCell className="text-muted-foreground">{r.firmware}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.ip}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{r.signal}</TableCell>
                <TableCell className="text-muted-foreground">{r.volume}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ErrorsTab({ device }: { device: DeviceRecord }) {
  const rows = errorsFor(device);
  if (!rows.length) return <EmptyState message="No open errors. This device is healthy." />;
  const sev: Record<string, string> = {
    high: "bg-destructive/15 text-destructive",
    med: "bg-warning/15 text-warning",
    low: "bg-muted text-muted-foreground",
  };
  return (
    <div className="space-y-2">
      {rows.map((e, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 p-3">
            <span className={cn("min-w-[42px] rounded px-2 py-0.5 text-center text-[11px] font-semibold uppercase", sev[e.severity])}>{e.severity}</span>
            <div className="flex-1">
              <p className="font-mono text-sm text-foreground">{e.code}</p>
              <p className="text-xs text-muted-foreground">{e.detail}</p>
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">{e.time}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScheduleTab({ device }: { device: DeviceRecord }) {
  const rows = scheduleFor(device);
  if (!rows.length) return <EmptyState message="No schedule assigned. Assign a campaign to start playback." />;
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Max/hr</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-foreground">{r.campaign}</TableCell>
                <TableCell className="text-muted-foreground">{r.window}</TableCell>
                <TableCell className="text-muted-foreground">{r.maxPerHour}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{r.priority}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InstallPhotosTab() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          ))}
          <button className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-brand hover:text-brand-strong">
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">Upload photo</span>
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Install photos are captured on-site during field installation.</p>
      </CardContent>
    </Card>
  );
}
