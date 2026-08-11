"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, Columns3, Copy, Folder, FolderPlus, ImagePlus, LayoutGrid, List as ListIcon, Map as MapIcon, Pencil, Plus, Search, Sparkles, Table2, TerminalSquare, Trash2, X } from "lucide-react";

import { FleetViews, ModeBadge, StatusBadge, RemoveBtn, normStatus, type DeviceView, type FleetDevice } from "@/components/devices/fleet-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { imageToDataUrl } from "@/lib/audio/spot-meta";
import { cn } from "@/lib/utils";

type Group = { id: string; name: string; description: string | null; imageUrl: string | null };
type Filter = "all" | "online" | "pending" | "attention" | "retired";
type ViewMode = DeviceView | "folder";

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
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "folder", label: "Folders (groups)", icon: Folder },
];

function matchesFilter(n: ReturnType<typeof normStatus>, f: Filter) {
  if (f === "online") return n === "online";
  if (f === "pending") return n === "pending";
  if (f === "attention") return n === "offline";
  if (f === "retired") return false;
  return true;
}

export function DevicesManager() {
  const [devices, setDevices] = useState<FleetDevice[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [groupDialog, setGroupDialog] = useState<{ id?: string; name: string; description: string; imageUrl: string | null } | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://os.channelcast.io";
  const updateCmd = `$env:CC_SERVER="${origin}"; $env:CC_MOTION="webcam"; irm $env:CC_SERVER/install.ps1 | iex`;
  async function copyUpdateCmd() {
    try { await navigator.clipboard.writeText(updateCmd); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* visible to copy manually */ }
  }

  const loadGroups = () => fetch("/api/admin/device-groups", { cache: "no-store" }).then((r) => r.json()).then((g) => { if (Array.isArray(g)) setGroups(g); }).catch(() => {});

  useEffect(() => {
    let stop = false;
    const load = () => fetch("/api/admin/devices", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!stop && Array.isArray(d)) setDevices(d); }).catch(() => {});
    load();
    loadGroups();
    const iv = setInterval(load, 8000);
    return () => { stop = true; clearInterval(iv); };
  }, []);

  async function removeDevice(dev: FleetDevice) {
    if (!window.confirm(`Remove "${dev.name}" (${dev.deviceCode})? This can't be undone.`)) return;
    setDevices((prev) => prev.filter((d) => d.id !== dev.id));
    try { await fetch(`/api/admin/devices/${dev.id}`, { method: "DELETE" }); } catch { /* re-syncs on poll */ }
  }

  async function assignGroup(deviceId: string, groupId: string | null) {
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, groupId } : d)));
    try { await fetch(`/api/admin/devices/${deviceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId }) }); } catch { /* re-syncs */ }
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
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Device Fleet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Register, activate, and manage Channel Cast playback devices across the network.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setUpdateOpen(true)}><TerminalSquare className="h-4 w-4" /> Update agent</Button>
          <Button asChild variant="outline"><Link href="/app/admin/devices/training"><Sparkles className="h-4 w-4" /> Train Your Device</Link></Button>
          <Button asChild><Link href="/app/admin/devices/new"><Plus className="h-4 w-4" /> Add Device</Link></Button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, device ID, or location…" className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Devices" value={stats.total} />
        <StatCard label="Online" value={stats.online} tone="success" />
        <StatCard label="Pending Activation" value={stats.pending} tone="brand" />
        <StatCard label="Needs Attention" value={stats.attention} tone="warning" />
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={cn("shrink-0 rounded-md px-3.5 py-2 text-sm font-medium transition-colors", f.id === filter ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>{f.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{filtered.length} device{filtered.length === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openNewGroup}><FolderPlus className="h-3.5 w-3.5" /> New group</Button>
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            {VIEWS.map((v) => {
              const Icon = v.icon;
              return (
                <button key={v.id} type="button" onClick={() => setView(v.id)} aria-label={v.label} title={v.label} className={cn("flex h-8 w-8 items-center justify-center rounded-md transition-colors", v.id === view ? "bg-accent text-brand-strong" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 && view !== "map" && view !== "calendar" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">{devices.length === 0 ? "No devices yet" : "No devices in this view"}</p>
            {devices.length === 0 && <Button className="mt-2" asChild><Link href="/app/admin/devices/new"><Plus className="h-4 w-4" /> Add Device</Link></Button>}
          </CardContent>
        </Card>
      ) : view === "folder" ? (
        <DeviceFolders devices={filtered} groups={groups} onAssign={assignGroup} onRename={openEditGroup} onDelete={deleteGroup} onRemove={removeDevice} />
      ) : (
        <FleetViews devices={filtered} view={view} onRemove={removeDevice} />
      )}

      {/* Update agent (temporary dev helper) */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Update / reinstall the device agent</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">On an <b className="font-medium text-foreground">already-connected</b> device, run this in <b className="font-medium text-foreground">PowerShell as Administrator</b> to pull the latest agent (no claim code needed):</p>
            <div className="relative">
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background px-3 py-2.5 pr-10 font-mono text-xs text-foreground">{updateCmd}</pre>
              <button onClick={copyUpdateCmd} aria-label="Copy command" className="absolute right-2 top-2 rounded-md border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground">
                {copied ? <Check className="h-4 w-4 text-brand-strong" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Motion players keep <span className="font-mono">CC_MOTION="webcam"</span>. For a scheduled-only device, remove that part. To set up a <i>new</i> device, use <b className="font-medium text-foreground">Add Device</b> instead. <span className="text-muted-foreground/70">(Temporary helper while we build features.)</span></p>
          </div>
          <DialogFooter>
            <Button onClick={copyUpdateCmd}>{copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy command</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupDialog !== null} onOpenChange={(o) => !o && setGroupDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{groupDialog?.id ? "Edit group" : "New group"}</DialogTitle></DialogHeader>
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

function GroupSelect({ value, groups, onChange }: { value: string | null; groups: Group[]; onChange: (g: string | null) => void }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} aria-label="Assign group" className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-ring">
      <option value="">Ungrouped</option>
      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
    </select>
  );
}

function FolderDeviceRow({ d, groups, onAssign, onRemove }: { d: FleetDevice; groups: Group[]; onAssign: (deviceId: string, g: string | null) => void; onRemove: () => void }) {
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

function DeviceFolders({ devices, groups, onAssign, onRename, onDelete, onRemove }: {
  devices: FleetDevice[];
  groups: Group[];
  onAssign: (deviceId: string, g: string | null) => void;
  onRename: (g: Group) => void;
  onDelete: (g: Group) => void;
  onRemove: (d: FleetDevice) => void;
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
                  <Link href={`/app/admin/device-groups/${g.id}`} className="truncate text-sm font-semibold text-foreground hover:text-brand-strong hover:underline">{g.name} <span className="text-xs font-normal text-muted-foreground">· {items.length}</span></Link>
                  {g.description && <p className="truncate text-xs text-muted-foreground">{g.description}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="outline" asChild><Link href={`/app/admin/device-groups/${g.id}`}>Open</Link></Button>
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

function GroupImageField({ image, onChange }: { image: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try { onChange(await imageToDataUrl(file)); } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
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
