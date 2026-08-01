"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Plus, QrCode as QrIcon, Radar, Rocket, Search, Trash2, Wifi, WifiOff } from "lucide-react";

import { QrCode } from "@/components/devices/qr-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  STATUS_META,
  buildActivationUrl,
  getDeviceType,
  isPending,
  type DeviceRecord,
  type DeviceStatus,
  type StatusTone,
} from "@/lib/devices/devices";
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

type Filter = "all" | "online" | "pending" | "attention" | "retired";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "pending", label: "Pending activation" },
  { id: "attention", label: "Needs attention" },
  { id: "retired", label: "Retired" },
];

function matchesFilter(status: DeviceStatus, filter: Filter) {
  switch (filter) {
    case "online":
      return status === "online" || status === "updating";
    case "pending":
      return isPending(status);
    case "attention":
      return status === "offline" || status === "warning" || status === "error";
    case "retired":
      return status === "retired";
    default:
      return true;
  }
}

export function DevicesManager() {
  const [devices, setDevices] = useState<DeviceRecord[]>(mockDevices);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [activating, setActivating] = useState<DeviceRecord | null>(null);
  const [realDevices, setRealDevices] = useState<RealDevice[]>([]);

  // Poll real (Supabase-backed) devices so connected players show up live.
  useEffect(() => {
    let stop = false;
    const load = () => fetch("/api/admin/devices", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!stop && Array.isArray(d)) setRealDevices(d); }).catch(() => {});
    load();
    const iv = setInterval(load, 8000);
    return () => { stop = true; clearInterval(iv); };
  }, []);

  async function removeRealDevice(dev: RealDevice) {
    if (!window.confirm(`Remove "${dev.name}" (${dev.deviceCode})? This can't be undone.`)) return;
    setRealDevices((prev) => prev.filter((d) => d.id !== dev.id)); // optimistic
    try {
      await fetch(`/api/admin/devices/${dev.id}`, { method: "DELETE" });
    } catch {
      /* next poll will re-sync if it failed */
    }
  }

  const stats = useMemo(() => {
    return {
      total: devices.length,
      online: devices.filter((d) => d.status === "online").length,
      pending: devices.filter((d) => isPending(d.status)).length,
      attention: devices.filter((d) => ["offline", "warning", "error"].includes(d.status)).length,
    };
  }, [devices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter((d) => {
      if (!matchesFilter(d.status, filter)) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.deviceCode.toLowerCase().includes(q) ||
        d.ownerOrg.toLowerCase().includes(q) ||
        (d.locationName ?? "").toLowerCase().includes(q)
      );
    });
  }, [devices, filter, query]);

  function activateDevice(id: string) {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "online", claimCode: null, claimExpiresLabel: null, firmwareVersion: "0.4.1", lastHeartbeat: "just now" } : d,
      ),
    );
    setActivating(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Device Fleet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register, activate, and manage Channel Cast playback devices across the network.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/admin/devices/new">
            <Plus className="h-4 w-4" />
            Add Device
          </Link>
        </Button>
      </div>

      {/* Real (connected) devices */}
      {realDevices.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Your devices</h2>
          {realDevices.map((dev) => (
            <RealDeviceRow key={dev.id} dev={dev} onRemove={() => removeRealDevice(dev)} />
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, device ID, owner, or location…"
          className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Devices" value={stats.total} />
        <StatCard label="Online" value={stats.online} tone="success" />
        <StatCard label="Pending Activation" value={stats.pending} tone="brand" />
        <StatCard label="Needs Attention" value={stats.attention} tone="warning" />
      </div>

      {/* Filters (tabs) */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
              f.id === filter ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Wifi className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No devices in this view</p>
              <Button className="mt-2" asChild>
                <Link href="/app/admin/devices/new"><Plus className="h-4 w-4" /> Add Device</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filtered.map((device) => (
            <DeviceRow key={device.id} device={device} onActivate={() => setActivating(device)} />
          ))
        )}
      </div>

      <ActivationDialog device={activating} onOpenChange={(o) => !o && setActivating(null)} onSimulate={activateDevice} />
    </div>
  );
}

type RealDevice = {
  id: string;
  name: string;
  deviceCode: string;
  type: string;
  status: string;
  claimCode: string | null;
  locationName: string | null;
  lastHeartbeatAt: string | null;
};

function RealDeviceRow({ dev, onRemove }: { dev: RealDevice; onRemove: () => void }) {
  const online = dev.status === "online";
  const pending = dev.status === "needs_setup" || (!!dev.claimCode && !dev.lastHeartbeatAt);
  const motion = dev.type === "ai_vision" || dev.type === "pir_motion";
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
          {online ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/app/admin/devices/${dev.deviceCode}`} className="truncate text-sm font-semibold text-foreground hover:text-brand-strong hover:underline">{dev.name}</Link>
            <span className="text-xs text-muted-foreground">{dev.deviceCode}</span>
            <Badge className={cn("gap-1 border-transparent capitalize", online ? "bg-success/15 text-success" : pending ? "bg-brand/15 text-brand-strong" : "bg-muted text-muted-foreground")}>
              {online ? "Online" : pending ? "Awaiting setup" : "Offline"}
            </Badge>
            <Badge className={cn("gap-1 border-transparent", motion ? "bg-brand/15 text-brand-strong" : "bg-secondary text-secondary-foreground")}>
              {motion ? <Radar className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}{motion ? "Motion" : "Scheduled"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{dev.locationName ?? "Unassigned"}</p>
        </div>
        <div className="flex items-center gap-2">
          {pending && dev.claimCode ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Claim code</p>
              <p className="font-mono text-sm font-semibold tracking-wider text-foreground">{dev.claimCode}</p>
            </div>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/app/admin/devices/${dev.deviceCode}`}>Open</Link>
            </Button>
          )}
          <button onClick={onRemove} aria-label="Remove device" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: StatusTone }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold tracking-tight", tone === "success" ? "text-success" : tone === "brand" ? "text-brand-strong" : tone === "warning" ? "text-warning" : "text-foreground")}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function DeviceRow({ device, onActivate }: { device: DeviceRecord; onActivate: () => void }) {
  const typeMeta = getDeviceType(device.type);
  const Icon = typeMeta.icon;
  const status = STATUS_META[device.status];
  const pending = isPending(device.status);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/admin/devices/${device.deviceCode}`}
              className="truncate text-sm font-semibold text-foreground hover:text-brand-strong hover:underline"
            >
              {device.name}
            </Link>
            <span className="text-xs text-muted-foreground">{device.deviceCode}</span>
            <Badge className={cn("capitalize", toneClasses[status.tone])}>{status.label}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{typeMeta.label}</span>
            <span>{device.ownerOrg}</span>
            <span>{device.locationName ?? "Unassigned"}</span>
            {device.lastHeartbeat ? <span>Last seen {device.lastHeartbeat}</span> : <span>Never connected</span>}
          </div>
        </div>

        {pending && device.claimCode && (
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Claim code</p>
              <p className="font-mono text-sm font-semibold tracking-wider text-foreground">{device.claimCode}</p>
            </div>
            <Button size="sm" onClick={onActivate}>
              <QrIcon className="h-3.5 w-3.5" /> Activate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivationDialog({
  device,
  onOpenChange,
  onSimulate,
}: {
  device: DeviceRecord | null;
  onOpenChange: (open: boolean) => void;
  onSimulate: (id: string) => void;
}) {
  const url = device?.claimCode ? buildActivationUrl(device.deviceCode, device.claimCode) : "";
  return (
    <Dialog open={!!device} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Activate {device?.name}</DialogTitle>
        </DialogHeader>
        {device && (
          <div className="flex flex-col items-center gap-4">
            <QrCode value={url} />
            <div className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-center">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Claim code · {device.deviceCode}</p>
              <p className="font-mono text-lg font-semibold tracking-wider text-foreground">{device.claimCode}</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Scan the QR with the device (or a phone), or enter the claim code on the device&apos;s setup screen.
            </p>
            <Button className="w-full" onClick={() => onSimulate(device.id)}>
              <Rocket className="h-4 w-4" /> Simulate device activation
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
