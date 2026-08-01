"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CalendarClock, Radar, Trash2, Wifi, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type FleetDevice = {
  id: string;
  name: string;
  deviceCode: string;
  type: string;
  status: string;
  claimCode: string | null;
  locationName: string | null;
  lastHeartbeatAt: string | null;
  groupId: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

export type DeviceView = "list" | "table" | "cards" | "kanban" | "calendar" | "map";
export type Norm = "online" | "pending" | "offline";

export const normStatus = (d: FleetDevice): Norm =>
  d.status === "online" ? "online" : d.status === "needs_setup" || (!!d.claimCode && !d.lastHeartbeatAt) ? "pending" : "offline";
export const isMotion = (d: FleetDevice) => d.type === "ai_vision" || d.type === "pir_motion";

const DeviceMap = dynamic(() => import("@/components/devices/device-map"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">Loading map…</div>,
});

export function StatusBadge({ dev }: { dev: FleetDevice }) {
  const n = normStatus(dev);
  return (
    <Badge className={cn("gap-1 border-transparent capitalize", n === "online" ? "bg-success/15 text-success" : n === "pending" ? "bg-brand/15 text-brand-strong" : "bg-muted text-muted-foreground")}>
      {n === "online" ? <Wifi className="h-3 w-3" /> : n === "pending" ? null : <WifiOff className="h-3 w-3" />}
      {n === "online" ? "Online" : n === "pending" ? "Awaiting setup" : "Offline"}
    </Badge>
  );
}

export function ModeBadge({ dev }: { dev: FleetDevice }) {
  const m = isMotion(dev);
  return (
    <Badge className={cn("gap-1 border-transparent", m ? "bg-brand/15 text-brand-strong" : "bg-secondary text-secondary-foreground")}>
      {m ? <Radar className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}{m ? "Motion" : "Scheduled"}
    </Badge>
  );
}

export function RemoveBtn({ onRemove }: { onRemove: () => void }) {
  return (
    <button onClick={onRemove} aria-label="Remove device" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export function FleetViews({ devices, view, onRemove }: { devices: FleetDevice[]; view: DeviceView; onRemove: (d: FleetDevice) => void }) {
  if (view === "table") return <DeviceTable devices={devices} onRemove={onRemove} />;
  if (view === "cards") return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{devices.map((d) => <DeviceCard key={d.id} dev={d} onRemove={() => onRemove(d)} />)}</div>;
  if (view === "kanban") return <DeviceKanban devices={devices} />;
  if (view === "calendar") return <DeviceCalendar devices={devices} />;
  if (view === "map") return <DeviceMapView devices={devices} />;
  return <div className="space-y-3">{devices.map((d) => <DeviceRow key={d.id} dev={d} onRemove={() => onRemove(d)} />)}</div>;
}

function DeviceRow({ dev, onRemove }: { dev: FleetDevice; onRemove: () => void }) {
  const online = normStatus(dev) === "online";
  const pending = normStatus(dev) === "pending";
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
            <StatusBadge dev={dev} />
            <ModeBadge dev={dev} />
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
            <Button size="sm" variant="outline" asChild><Link href={`/app/admin/devices/${dev.deviceCode}`}>Open</Link></Button>
          )}
          <RemoveBtn onRemove={onRemove} />
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceTable({ devices, onRemove }: { devices: FleetDevice[]; onRemove: (d: FleetDevice) => void }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/app/admin/devices/${d.deviceCode}`} className="font-medium text-foreground hover:text-brand-strong hover:underline">{d.name}</Link>
                    <div className="text-xs text-muted-foreground">{d.deviceCode}</div>
                  </TableCell>
                  <TableCell><StatusBadge dev={d} /></TableCell>
                  <TableCell><ModeBadge dev={d} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.locationName ?? "Unassigned"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" asChild><Link href={`/app/admin/devices/${d.deviceCode}`}>Open</Link></Button>
                      <RemoveBtn onRemove={() => onRemove(d)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceCard({ dev, onRemove }: { dev: FleetDevice; onRemove: () => void }) {
  const online = normStatus(dev) === "online";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-lg", online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
            {online ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </span>
          <RemoveBtn onRemove={onRemove} />
        </div>
        <Link href={`/app/admin/devices/${dev.deviceCode}`} className="mt-3 block truncate text-sm font-semibold text-foreground hover:text-brand-strong hover:underline">{dev.name}</Link>
        <p className="text-xs text-muted-foreground">{dev.deviceCode}</p>
        <div className="mt-2 flex flex-wrap gap-1.5"><StatusBadge dev={dev} /><ModeBadge dev={dev} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{dev.locationName ?? "Unassigned"}</p>
        {normStatus(dev) === "pending" && dev.claimCode && (
          <p className="mt-2 rounded-md border border-border bg-muted/40 px-2 py-1 text-center font-mono text-sm font-semibold tracking-wider text-foreground">{dev.claimCode}</p>
        )}
      </CardContent>
    </Card>
  );
}

function DeviceKanban({ devices }: { devices: FleetDevice[] }) {
  const cols: { key: Norm; label: string }[] = [
    { key: "online", label: "Online" },
    { key: "pending", label: "Awaiting setup" },
    { key: "offline", label: "Offline" },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cols.map((c) => {
        const items = devices.filter((d) => normStatus(d) === c.key);
        return (
          <div key={c.key} className="rounded-lg border border-border bg-card/50 p-2">
            <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label} · {items.length}</p>
            <div className="space-y-2">
              {items.map((d) => (
                <Link key={d.id} href={`/app/admin/devices/${d.deviceCode}`} className="block rounded-md border border-border bg-card p-3 hover:border-brand/50">
                  <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.deviceCode}</p>
                  <div className="mt-1.5"><ModeBadge dev={d} /></div>
                </Link>
              ))}
              {items.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">None</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeviceCalendar({ devices }: { devices: FleetDevice[] }) {
  const initial = useMemo(() => {
    const d = devices[0] ? new Date(devices[0].createdAt) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [devices]);
  const [cursor, setCursor] = useState(initial);

  const first = new Date(cursor.year, cursor.month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const byDay = useMemo(() => {
    const map = new Map<number, FleetDevice[]>();
    devices.forEach((d) => {
      const dt = new Date(d.createdAt);
      if (dt.getFullYear() === cursor.year && dt.getMonth() === cursor.month) {
        const day = dt.getDate();
        map.set(day, [...(map.get(day) ?? []), d]);
      }
    });
    return map;
  }, [devices, cursor]);

  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const shift = (delta: number) => { const d = new Date(cursor.year, cursor.month + delta, 1); setCursor({ year: d.getFullYear(), month: d.getMonth() }); };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground hover:text-foreground">‹</button>
          <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
          <button onClick={() => shift(1)} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground hover:text-foreground">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => (
            <div key={i} className={cn("min-h-[76px] rounded-md border p-1", day ? "border-border" : "border-transparent")}>
              {day && (
                <>
                  <span className="text-xs text-muted-foreground">{day}</span>
                  <div className="mt-1 space-y-1">
                    {(byDay.get(day) ?? []).map((d) => (
                      <Link key={d.id} href={`/app/admin/devices/${d.deviceCode}`} className="block truncate rounded bg-brand/15 px-1 py-0.5 text-[10px] font-medium text-brand-strong" title={d.name}>{d.name}</Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Devices placed by date added. Click one to open it.</p>
      </CardContent>
    </Card>
  );
}

function DeviceMapView({ devices }: { devices: FleetDevice[] }) {
  const located = devices.filter((d) => d.latitude != null && d.longitude != null);
  if (located.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          No devices have coordinates yet. Open a device and set its location (latitude/longitude) to plot it here.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-4">
        <DeviceMap devices={located.map((d) => ({ id: d.id, name: d.name, deviceCode: d.deviceCode, status: d.status, latitude: d.latitude, longitude: d.longitude }))} />
        <p className="mt-2 text-xs text-muted-foreground">{located.length} located device{located.length === 1 ? "" : "s"} plotted. Click a marker for details.</p>
      </CardContent>
    </Card>
  );
}
