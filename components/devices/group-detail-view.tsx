"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Columns3, Folder, LayoutGrid, List as ListIcon, Map as MapIcon, Plus, Table2 } from "lucide-react";

import { FleetViews, type DeviceView, type FleetDevice } from "@/components/devices/fleet-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Group = { id: string; name: string; description: string | null; imageUrl: string | null };

const VIEWS: { id: DeviceView; label: string; icon: typeof ListIcon }[] = [
  { id: "list", label: "List", icon: ListIcon },
  { id: "table", label: "Table", icon: Table2 },
  { id: "cards", label: "Cards", icon: LayoutGrid },
  { id: "kanban", label: "Kanban", icon: Columns3 },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "map", label: "Map", icon: MapIcon },
];

export function GroupDetailView({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [devices, setDevices] = useState<FleetDevice[]>([]);
  const [view, setView] = useState<DeviceView>("list");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let stop = false;
    fetch("/api/admin/device-groups", { cache: "no-store" }).then((r) => r.json()).then((g: Group[]) => { if (!stop && Array.isArray(g)) setGroup(g.find((x) => x.id === groupId) ?? null); }).catch(() => {});
    const load = () => fetch("/api/admin/devices", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!stop && Array.isArray(d)) setDevices(d); }).catch(() => {});
    load();
    const iv = setInterval(load, 8000);
    return () => { stop = true; clearInterval(iv); };
  }, [groupId]);

  const members = useMemo(() => devices.filter((d) => d.groupId === groupId), [devices, groupId]);
  const nonMembers = useMemo(() => devices.filter((d) => d.groupId !== groupId), [devices, groupId]);

  async function assign(deviceId: string, gid: string | null) {
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, groupId: gid } : d)));
    await fetch(`/api/admin/devices/${deviceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: gid }) }).catch(() => {});
  }

  async function removeFromGroup(d: FleetDevice) {
    if (!window.confirm(`Remove "${d.name}" from this group? (The device is not deleted.)`)) return;
    await assign(d.id, null);
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/admin/devices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Device Fleet</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {group?.imageUrl ? (
            <img src={group.imageUrl} alt="" className="h-12 w-12 rounded-lg border border-border object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-brand-strong"><Folder className="h-6 w-6" /></span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{group?.name ?? "Group"}</h1>
            {group?.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
          </div>
          <Button className="ml-auto" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add devices</Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{members.length} device{members.length === 1 ? "" : "s"} in this group</p>
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

      {members.length === 0 && view !== "map" && view !== "calendar" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm font-medium text-foreground">No devices in this group yet</p>
            <Button className="mt-2" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add devices</Button>
          </CardContent>
        </Card>
      ) : (
        <FleetViews devices={members} view={view} onRemove={removeFromGroup} />
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add devices to {group?.name ?? "group"}</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {nonMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every device is already in this group.</p>
            ) : (
              nonMembers.map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.deviceCode}{d.groupId ? " · in another group" : ""}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => assign(d.id, groupId)}>Add</Button>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end pt-2"><Button variant="outline" onClick={() => setAddOpen(false)}>Done</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
