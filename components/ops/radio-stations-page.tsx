"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, LayoutGrid, List, Map as MapIcon, Pencil, Plus, RadioTower, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

import {
  DetailField,
  EmptyState,
  FormField,
  PageHeader,
  RowActions,
  SearchBox,
  StatRow,
  StatTile,
  ViewSwitcher,
} from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { RadioStation, STATION_GENRES, STATION_STATUS, STATION_STATUS_ORDER, StationStatus, seedRadioStations } from "@/lib/ops/radio-stations";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "cards" | "kanban" | "map";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
  { id: "map" as const, label: "Map", icon: MapIcon },
];

const StationsMap = dynamic(() => import("@/components/crm/records-map"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">Loading map…</div>,
});

const num = new Intl.NumberFormat("en-US");

function StatusBadge({ status }: { status: StationStatus }) {
  return <Badge className={cn("border-transparent", STATION_STATUS[status].tone)}>{STATION_STATUS[status].label}</Badge>;
}

function blank(): RadioStation {
  return { id: genId("rs"), name: "", market: "", state: "", lat: null, lng: null, status: "scheduled", genre: "Top 40", listeners: 0, spotsAvailable: 0, owner: "Alex Rivera", notes: "", createdAt: new Date().toISOString() };
}

type RowActionsFn = (s: RadioStation) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

export function RadioStationsPage() {
  const { items, create, update, remove } = useCollection<RadioStation>("radio_stations", seedRadioStations);
  const [view, setView] = useState<View>("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StationStatus | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: RadioStation; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<RadioStation | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return [s.name, s.market, s.state, s.genre, s.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const live = items.filter((s) => s.status === "live").length;
    const listeners = items.reduce((a, s) => a + s.listeners, 0);
    const inventory = items.reduce((a, s) => a + s.spotsAvailable, 0);
    return { total: items.length, live, listeners, inventory };
  }, [items]);

  const drawer = items.find((s) => s.id === drawerId) || null;
  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (s: RadioStation) => setEditing({ draft: { ...s }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Station added.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Station updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Station deleted.");
  }

  const rowActions: RowActionsFn = (s) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(s.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(s) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(s), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={RadioTower}
        title="Radio Stations"
        description="Radio station partners and voice / production spots."
        action={<Button onClick={openNew} className="shrink-0"><Plus className="h-4 w-4" /> Add station</Button>}
      />

      <StatRow>
        <StatTile label="Stations" value={stats.total} />
        <StatTile label="Live" value={stats.live} accent />
        <StatTile label="Weekly listeners" value={num.format(stats.listeners)} />
        <StatTile label="Open spot inventory" value={stats.inventory} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search stations…" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StationStatus | "all")}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATION_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATION_STATUS[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No stations yet. Add your first partner." : "No stations match your filters."} />
      ) : view === "list" ? (
        <ListView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "kanban" ? (
        <KanbanView rows={filtered} onOpen={setDrawerId} />
      ) : (
        <MapView rows={filtered} onOpen={setDrawerId} />
      )}

      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{drawer.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{drawer.genre} · {drawer.market}, {drawer.state}</p>
              </SheetHeader>
              <div className="flex flex-wrap gap-2"><StatusBadge status={drawer.status} /><Badge variant="outline">{drawer.genre}</Badge></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Listeners</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{num.format(drawer.listeners)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Open spots</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{drawer.spotsAvailable}</p>
                </div>
              </div>
              <div>
                <DetailField label="Market">{drawer.market}, {drawer.state}</DetailField>
                <DetailField label="Genre">{drawer.genre}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Set status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATION_STATUS_ORDER.map((s) => (
                    <Button key={s} size="sm" variant={s === drawer.status ? "default" : "outline"} onClick={() => update(drawer.id, { status: s })}>{STATION_STATUS[s].label}</Button>
                  ))}
                </div>
              </div>
              {drawer.notes && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="text-sm text-foreground">{drawer.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => openEdit(drawer)} className="flex-1"><Pencil className="h-4 w-4" /> Edit</Button>
                <Button variant="outline" onClick={() => setDeleteItem(drawer)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.isNew ? "Add station" : "Edit station"}</DialogTitle></DialogHeader>
          {editing && <StationForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Add station" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete station?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">&ldquo;{deleteItem?.name}&rdquo; will be removed. This can&apos;t be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ViewProps = { rows: RadioStation[]; onOpen: (id: string) => void; rowActions: RowActionsFn };

function ListView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {rows.map((s) => (
        <Card key={s.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(s.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                <StatusBadge status={s.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.genre} · {s.market}, {s.state}</p>
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">{num.format(s.listeners)} listeners</span>
            <RowActions actions={rowActions(s)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Listeners</TableHead>
              <TableHead className="text-right">Open spots</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => onOpen(s.id)}>
                <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{s.market}, {s.state}</TableCell>
                <TableCell className="text-muted-foreground">{s.genre}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell className="text-right text-foreground">{num.format(s.listeners)}</TableCell>
                <TableCell className="text-right text-foreground">{s.spotsAvailable}</TableCell>
                <TableCell><RowActions actions={rowActions(s)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CardsView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((s) => (
        <Card key={s.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(s.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.market}, {s.state}</p>
              </div>
              <RowActions actions={rowActions(s)} />
            </div>
            <div className="flex flex-wrap gap-2"><StatusBadge status={s.status} /><Badge variant="outline">{s.genre}</Badge></div>
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{num.format(s.listeners)} listeners</span>
              <span className="font-medium text-foreground">{s.spotsAvailable} open spots</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ rows, onOpen }: { rows: RadioStation[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {STATION_STATUS_ORDER.map((status) => {
        const col = rows.filter((s) => s.status === status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((s) => (
                <button key={s.id} onClick={() => onOpen(s.id)} className="w-full rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50">
                  <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.market}, {s.state} · {num.format(s.listeners)} listeners</p>
                </button>
              ))}
              {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground/60">Empty</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MapView({ rows, onOpen }: { rows: RadioStation[]; onOpen: (id: string) => void }) {
  const points = rows
    .filter((s) => s.lat !== null && s.lng !== null)
    .map((s) => ({ id: s.id, lat: s.lat as number, lng: s.lng as number, title: s.name, subtitle: `${s.market}, ${s.state} · ${STATION_STATUS[s.status].label}` }));
  if (points.length === 0) return <EmptyState message="No stations have a location yet. Edit a station and add coordinates to plot it." />;
  return (
    <Card>
      <CardContent className="p-4">
        <StationsMap points={points} onOpen={onOpen} />
        <p className="mt-2 text-xs text-muted-foreground">{points.length} station{points.length === 1 ? "" : "s"} plotted by market. Click a marker to open.</p>
      </CardContent>
    </Card>
  );
}

function StationForm({ draft, onChange }: { draft: RadioStation; onChange: (d: RadioStation) => void }) {
  const set = <K extends keyof RadioStation>(key: K, value: RadioStation[K]) => onChange({ ...draft, [key]: value });
  const n = (v: string) => (v.trim() === "" ? 0 : Math.max(0, Number(v) || 0));
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Station name" className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Desert Pulse 101.5" />
        </FormField>
        <FormField label="Market (city)">
          <Input value={draft.market} onChange={(e) => set("market", e.target.value)} placeholder="Scottsdale" />
        </FormField>
        <FormField label="State">
          <Input value={draft.state} onChange={(e) => set("state", e.target.value)} placeholder="AZ" />
        </FormField>
        <FormField label="Genre">
          <Select value={draft.genre} onValueChange={(v) => set("genre", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATION_GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as StationStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATION_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATION_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Weekly listeners">
          <Input inputMode="numeric" value={String(draft.listeners)} onChange={(e) => set("listeners", n(e.target.value))} />
        </FormField>
        <FormField label="Open spot inventory">
          <Input inputMode="numeric" value={String(draft.spotsAvailable)} onChange={(e) => set("spotsAvailable", n(e.target.value))} />
        </FormField>
        <FormField label="Latitude">
          <Input inputMode="decimal" value={draft.lat === null ? "" : String(draft.lat)} onChange={(e) => set("lat", e.target.value.trim() === "" ? null : Number(e.target.value))} placeholder="33.49" />
        </FormField>
        <FormField label="Longitude">
          <Input inputMode="decimal" value={draft.lng === null ? "" : String(draft.lng)} onChange={(e) => set("lng", e.target.value.trim() === "" ? null : Number(e.target.value))} placeholder="-111.93" />
        </FormField>
        <FormField label="Owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Programming, reach, inventory notes…" />
      </FormField>
    </div>
  );
}
