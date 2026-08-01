"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, Columns3, Folder, FolderPlus, ImagePlus, LayoutGrid, List as ListIcon, Pencil, Plus, Radar, Search, Table2, Trash2, Wifi, WifiOff, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { imageToDataUrl } from "@/lib/audio/spot-meta";
import { cn } from "@/lib/utils";

type RealDevice = {
  id: string;
  name: string;
  deviceCode: string;
  type: string;
  status: string;
  claimCode: string | null;
  locationName: string | null;
  lastHeartbeatAt: string | null;
  groupId: string | null;
};

type Group = { id: string; name: string; description: string | null; imageUrl: string | null };

type Norm = "online" | "pending" | "offline";
type Filter = "all" | "online" | "pending" | "attention" | "retired";
type ViewMode = "list" | "table" | "cards" | "kanban" | "folder";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "pending", label: "Pending activation" },
  { id: "attention", label: "Needs attention" },
  { id: "retired", label: "Retired" },
];

const VIEWS: { id: ViewMode; label: string; icon: typeof ListIcon }[] = [
  { id: "list", label: "List", icon: ListIcon },
  { id: "table", label: "Table", icon: Table2 },
  { id: "cards", label: "Cards", icon: LayoutGrid },
  { id: "kanban", label: "Kanban", icon: Columns3 },
  { id: "folder", label: "Folders (groups)", icon: Folder },
];

function normStatus(d: RealDevice): Norm {
  if (d.status === "online") return "online";
  if (d.status === "needs_setup" || (!!d.claimCode && !d.lastHeartbeatAt)) return "pending";
  return "offline";
}
const isMotion = (d: RealDevice) => d.type === "ai_vision" || d.type === "pir_motion";

function matchesFilter(n: Norm, f: Filter) {
  if (f === "online") return n === "online";
  if (f === "pending") return n === "pending";
  if (f === "attention") return n === "offline";
  if (f === "retired") return false;
  return true;
}

export function DevicesManager() {
  const [devices, setDevices] = useState<RealDevice[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [groupDialog, setGroupDialog] = useState<{ id?: string; name: string; description: string; imageUrl: string | null } | null>(null);

  const loadGroups = () => fetch("/api/admin/device-groups", { cache: "no-store" }).then((r) => r.json()).then((g) => { if (Array.isArray(g)) setGroups(g); }).catch(() => {});

  useEffect(() => {
    let stop = false;
    const load = () => fetch("/api/admin/devices", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!stop && Array.isArray(d)) setDevices(d); }).catch(() => {});
    load();
    loadGroups();
    const iv = setInterval(load, 8000);
    return () => { stop = true; clearInterval(iv); };
  }, []);

  async function removeDevice(dev: RealDevice) {
    if (!window.confirm(`Remove "${dev.name}" (${dev.deviceCode})? This can't be undone.`)) return;
    setDevices((prev) => prev.filter((d) => d.id !== dev.id));
    try {
      await fetch(`/api/admin/devices/${dev.id}`, { method: "DELETE" });
    } catch {
      /* next poll re-syncs if it failed */
    }
  }

  async function assignGroup(deviceId: string, groupId: string | null) {
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, groupId } : d)));
    try {
      await fetch(`/api/admin/devices/${deviceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId }) });
    } catch {
      /* next poll re-syncs */
    }
  }

  function openNewGroup() { setGroupDialog({ name: "", description: "", imageUrl: null }); }
  function openEditGroup(g: Group) { setGroupDialog({ id: g.id, name: g.name, description: g.description ?? "", imageUrl: g.imageUrl }); }

  async function saveGroup() {
    if (!groupDialog?.name.trim()) return;
    const body = { name: groupDialog.name.trim(), description: groupDialog.description.trim() || null, imageUrl: groupDialog.imageUrl };
    if (groupDialog.id) {
      setGroups((prev) => prev.map((x) => (x.id === groupDialog.id ? { ...x, ...body } : x)));
      await fetch(`/api/admin/device-groups/${groupDialog.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    } else {
      await fetch("/api/admin/device-groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    }
    setGroupDialog(null);
    loadGroups();
  }

  async function deleteGroup(g: Group) {
    if (!window.confirm(`Delete group "${g.name}"? Its devices become ungrouped.`)) return;
    setGroups((prev) => prev.filter((x) => x.id !== g.id));
    setDevices((prev) => prev.map((d) => (d.groupId === g.id ? { ...d, groupId: null } : d)));
    await fetch(`/api/admin/device-groups/${g.id}`, { method: "DELETE" }).catch(() => {});
  }

  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter((d) => normStatus(d) === "online").length,
    pending: devices.filter((d) => normStatus(d) === "pending").length,
    attention: devices.filter((d) => normStatus(d) === "offline").length,
  }), [devices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter((d) => {
      if (!matchesFilter(normStatus(d), filter)) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.deviceCode.toLowerCase().includes(q) || (d.locationName ?? "").toLowerCase().includes(q);
    });
  }, [devices, filter, query]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Device Fleet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Register, activate, and manage Channel Cast playback devices across the network.</p>
        </div>
        <Button asChild>
          <Link href="/app/admin/devices/new"><Plus className="h-4 w-4" /> Add Device</Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, device ID, or location…"
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

      {/* Tabs */}
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

      {/* View switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{filtered.length} device{filtered.length === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={openNewGroup}><FolderPlus className="h-3.5 w-3.5" /> New group</Button>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-label={v.label}
                title={v.label}
                className={cn("flex h-8 w-8 items-center justify-center rounded-md transition-colors", v.id === view ? "bg-accent text-brand-strong" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* Devices */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Wifi className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{devices.length === 0 ? "No devices yet" : "No devices in this view"}</p>
            {devices.length === 0 && (
              <Button className="mt-2" asChild>
                <Link href="/app/admin/devices/new"><Plus className="h-4 w-4" /> Add Device</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === "list" ? (
        <div className="space-y-3">{filtered.map((d) => <DeviceRow key={d.id} dev={d} onRemove={() => removeDevice(d)} />)}</div>
      ) : view === "table" ? (
        <DeviceTable devices={filtered} onRemove={removeDevice} />
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((d) => <DeviceCard key={d.id} dev={d} onRemove={() => removeDevice(d)} />)}</div>
      ) : view === "kanban" ? (
        <DeviceKanban devices={filtered} />
      ) : (
        <DeviceFolders devices={filtered} groups={groups} onAssign={assignGroup} onRename={openEditGroup} onDelete={deleteGroup} onRemove={removeDevice} />
      )}

      {/* Group create/edit dialog */}
      <Dialog open={groupDialog !== null} onOpenChange={(o) => !o && setGroupDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{groupDialog?.id ? "Edit group" : "New group"}</DialogTitle>
          </DialogHeader>
          {groupDialog && (
            <div className="space-y-4">
              <GroupImageField image={groupDialog.imageUrl} onChange={(imageUrl) => setGroupDialog({ ...groupDialog, imageUrl })} />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Name</span>
                <Input value={groupDialog.name} onChange={(e) => setGroupDialog({ ...groupDialog, name: e.target.value })} placeholder="Front Office Location" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground">(optional)</span></span>
                <Textarea rows={3} value={groupDialog.description} onChange={(e) => setGroupDialog({ ...groupDialog, description: e.target.value })} placeholder="Notes about this location or group…" />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(null)}>Cancel</Button>
            <Button onClick={saveGroup} disabled={!groupDialog?.name.trim()}>{groupDialog?.id ? "Save" : "Create group"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupImageField({ image, onChange }: { image: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      onChange(await imageToDataUrl(file));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Folder className="h-6 w-6 text-muted-foreground" />}
      </span>
      <div className="flex items-center gap-2">
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files)} />
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
          <ImagePlus className="h-4 w-4" /> {busy ? "Processing…" : image ? "Replace" : "Add image"}
        </Button>
        {image && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}><X className="h-4 w-4" /> Remove</Button>}
      </div>
    </div>
  );
}

/* ── Shared bits ─────────────────────────────────────────────────────── */

function StatusBadge({ dev }: { dev: RealDevice }) {
  const n = normStatus(dev);
  return (
    <Badge className={cn("gap-1 border-transparent capitalize", n === "online" ? "bg-success/15 text-success" : n === "pending" ? "bg-brand/15 text-brand-strong" : "bg-muted text-muted-foreground")}>
      {n === "online" ? <Wifi className="h-3 w-3" /> : n === "pending" ? null : <WifiOff className="h-3 w-3" />}
      {n === "online" ? "Online" : n === "pending" ? "Awaiting setup" : "Offline"}
    </Badge>
  );
}

function ModeBadge({ dev }: { dev: RealDevice }) {
  const m = isMotion(dev);
  return (
    <Badge className={cn("gap-1 border-transparent", m ? "bg-brand/15 text-brand-strong" : "bg-secondary text-secondary-foreground")}>
      {m ? <Radar className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}{m ? "Motion" : "Scheduled"}
    </Badge>
  );
}

function RemoveBtn({ onRemove }: { onRemove: () => void }) {
  return (
    <button onClick={onRemove} aria-label="Remove device" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "brand" | "warning" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold tracking-tight", tone === "success" ? "text-success" : tone === "brand" ? "text-brand-strong" : tone === "warning" ? "text-warning" : "text-foreground")}>{value}</p>
      </CardContent>
    </Card>
  );
}

/* ── Views ───────────────────────────────────────────────────────────── */

function DeviceRow({ dev, onRemove }: { dev: RealDevice; onRemove: () => void }) {
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

function DeviceTable({ devices, onRemove }: { devices: RealDevice[]; onRemove: (d: RealDevice) => void }) {
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

function DeviceCard({ dev, onRemove }: { dev: RealDevice; onRemove: () => void }) {
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

function GroupSelect({ value, groups, onChange }: { value: string | null; groups: Group[]; onChange: (g: string | null) => void }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label="Assign group"
      className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-ring"
    >
      <option value="">Ungrouped</option>
      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
    </select>
  );
}

function FolderDeviceRow({ d, groups, onAssign, onRemove }: { d: RealDevice; groups: Group[]; onAssign: (deviceId: string, g: string | null) => void; onRemove: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <Link href={`/app/admin/devices/${d.deviceCode}`} className="block truncate text-sm font-medium text-foreground hover:text-brand-strong hover:underline">{d.name}</Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-2"><StatusBadge dev={d} /><ModeBadge dev={d} /></div>
      </div>
      <GroupSelect value={d.groupId} groups={groups} onChange={(g) => onAssign(d.id, g)} />
      <RemoveBtn onRemove={onRemove} />
    </div>
  );
}

function DeviceFolders({
  devices, groups, onAssign, onRename, onDelete, onRemove,
}: {
  devices: RealDevice[];
  groups: Group[];
  onAssign: (deviceId: string, g: string | null) => void;
  onRename: (g: Group) => void;
  onDelete: (g: Group) => void;
  onRemove: (d: RealDevice) => void;
}) {
  const ungrouped = devices.filter((d) => !d.groupId);
  return (
    <div className="space-y-4">
      {groups.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No groups yet. Click <b className="font-medium text-foreground">New group</b> above to create one (e.g. a location), then assign devices with the dropdown.</p>
      )}
      {groups.map((g) => {
        const items = devices.filter((d) => d.groupId === g.id);
        return (
          <div key={g.id} className="rounded-lg border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {g.imageUrl ? (
                  <img src={g.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong"><Folder className="h-4 w-4" /></span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{g.name} <span className="text-xs font-normal text-muted-foreground">· {items.length}</span></p>
                  {g.description && <p className="truncate text-xs text-muted-foreground">{g.description}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => onRename(g)} aria-label="Rename group" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => onDelete(g)} aria-label="Delete group" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="divide-y divide-border">
              {items.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No devices — assign one from Ungrouped below.</p>
              ) : (
                items.map((d) => <FolderDeviceRow key={d.id} d={d} groups={groups} onAssign={onAssign} onRemove={() => onRemove(d)} />)
              )}
            </div>
          </div>
        );
      })}

      <div className="rounded-lg border border-dashed border-border">
        <div className="border-b border-border px-4 py-2.5">
          <p className="text-sm font-semibold text-foreground">Ungrouped <span className="text-xs font-normal text-muted-foreground">· {ungrouped.length}</span></p>
        </div>
        <div className="divide-y divide-border">
          {ungrouped.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Everything is grouped.</p>
          ) : (
            ungrouped.map((d) => <FolderDeviceRow key={d.id} d={d} groups={groups} onAssign={onAssign} onRemove={() => onRemove(d)} />)
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceKanban({ devices }: { devices: RealDevice[] }) {
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
