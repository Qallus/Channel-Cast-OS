"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarDays, ExternalLink, LayoutGrid, List, Map as MapIcon, Megaphone, Pencil, Plus, Radio, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

import {
  Avatar,
  DetailField,
  EmptyState,
  FormField,
  PageHeader,
  RecordCalendar,
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
import {
  ADVERTISER_INDUSTRIES,
  ADVERTISER_STATUS,
  ADVERTISER_STATUS_ORDER,
  Advertiser,
  AdvertiserStatus,
  seedAdvertisers,
} from "@/lib/adops/advertisers";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "cards" | "kanban" | "calendar" | "map";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
  { id: "map" as const, label: "Map", icon: MapIcon },
];

const AdvertisersMap = dynamic(() => import("@/components/crm/records-map"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">Loading map…</div>,
});

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function StatusBadge({ status }: { status: AdvertiserStatus }) {
  return <Badge className={cn("border-transparent", ADVERTISER_STATUS[status].tone)}>{ADVERTISER_STATUS[status].label}</Badge>;
}

function blank(): Advertiser {
  return {
    id: genId("ad"),
    name: "",
    industry: "Retail",
    status: "prospect",
    website: "",
    city: "",
    state: "",
    primaryContact: "",
    email: "",
    phone: "",
    campaigns: 0,
    spend: 0,
    lat: null,
    lng: null,
    owner: "Alex Rivera",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

export function AdvertisersPage() {
  const { items, create, update, remove } = useCollection<Advertiser>("advertisers", seedAdvertisers);
  const [view, setView] = useState<View>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdvertiserStatus | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Advertiser; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Advertiser | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return [a.name, a.industry, a.primaryContact, a.city, a.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const active = items.filter((a) => a.status === "active").length;
    const spend = items.reduce((s, a) => s + (a.spend || 0), 0);
    const campaigns = items.reduce((s, a) => s + (a.campaigns || 0), 0);
    return { total: items.length, active, spend, campaigns };
  }, [items]);

  const drawer = items.find((a) => a.id === drawerId) || null;

  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (a: Advertiser) => setEditing({ draft: { ...a }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Advertiser added.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Advertiser updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Advertiser deleted.");
  }

  const rowActions = (a: Advertiser) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(a.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(a) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(a), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Radio}
        title="Advertisers"
        description="Advertiser accounts, campaigns, and spend."
        action={
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> Add advertiser
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Advertisers" value={stats.total} />
        <StatTile label="Active" value={stats.active} accent />
        <StatTile label="Live campaigns" value={stats.campaigns} />
        <StatTile label="Total spend" value={usd.format(stats.spend)} hint="To date" />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search advertisers…" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AdvertiserStatus | "all")}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ADVERTISER_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{ADVERTISER_STATUS[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No advertisers yet. Add your first account." : "No advertisers match your filters."} />
      ) : view === "list" ? (
        <ListView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "kanban" ? (
        <KanbanView rows={filtered} onOpen={setDrawerId} />
      ) : view === "calendar" ? (
        <RecordCalendar items={filtered} getId={(a) => a.id} getDate={(a) => a.createdAt} getTitle={(a) => a.name} onOpen={setDrawerId} footer="Advertisers placed by date added. Click one to open." />
      ) : (
        <MapView rows={filtered} onOpen={setDrawerId} />
      )}

      {/* Drawer */}
      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={drawer.name} className="h-12 w-12 text-sm" />
                  <div>
                    <SheetTitle>{drawer.name}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{drawer.industry}</p>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex flex-wrap gap-2"><StatusBadge status={drawer.status} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground"><Megaphone className="h-3 w-3" /> Campaigns</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{drawer.campaigns}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Spend</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{usd.format(drawer.spend)}</p>
                </div>
              </div>
              <div>
                <DetailField label="Primary contact">{drawer.primaryContact}</DetailField>
                <DetailField label="Email">{drawer.email ? <a href={`mailto:${drawer.email}`} className="text-brand hover:underline">{drawer.email}</a> : ""}</DetailField>
                <DetailField label="Phone">{drawer.phone}</DetailField>
                <DetailField label="Website">{drawer.website ? <a href={`https://${drawer.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">{drawer.website} <ExternalLink className="h-3 w-3" /></a> : ""}</DetailField>
                <DetailField label="Location">{[drawer.city, drawer.state].filter(Boolean).join(", ")}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
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

      {/* Modal */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.isNew ? "Add advertiser" : "Edit advertiser"}</DialogTitle></DialogHeader>
          {editing && <AdvertiserForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Add advertiser" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete advertiser?</DialogTitle></DialogHeader>
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

type ViewProps = {
  rows: Advertiser[];
  onOpen: (id: string) => void;
  rowActions: (a: Advertiser) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];
};

function ListView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {rows.map((a) => (
        <Card key={a.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(a.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <Avatar name={a.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.industry} · {[a.city, a.state].filter(Boolean).join(", ")}</p>
            </div>
            <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:block">{a.campaigns} campaigns</span>
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">{usd.format(a.spend)}</span>
            <RowActions actions={rowActions(a)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MapView({ rows, onOpen }: { rows: Advertiser[]; onOpen: (id: string) => void }) {
  const points = rows
    .filter((a) => a.lat !== null && a.lng !== null)
    .map((a) => ({ id: a.id, lat: a.lat as number, lng: a.lng as number, title: a.name, subtitle: `${[a.city, a.state].filter(Boolean).join(", ")} · ${ADVERTISER_STATUS[a.status].label}` }));
  if (points.length === 0) return <EmptyState message="No advertisers have a location yet. Edit an advertiser and add coordinates to plot it." />;
  return (
    <Card>
      <CardContent className="p-4">
        <AdvertisersMap points={points} onOpen={onOpen} />
        <p className="mt-2 text-xs text-muted-foreground">{points.length} located advertiser{points.length === 1 ? "" : "s"} plotted. Click a marker to open.</p>
      </CardContent>
    </Card>
  );
}

function TableView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Advertiser</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Campaigns</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id} className="cursor-pointer" onClick={() => onOpen(a.id)}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.industry}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{[a.city, a.state].filter(Boolean).join(", ")}</TableCell>
                <TableCell className="text-right text-foreground">{a.campaigns}</TableCell>
                <TableCell className="text-right text-foreground">{usd.format(a.spend)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{a.owner}</TableCell>
                <TableCell><RowActions actions={rowActions(a)} /></TableCell>
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
      {rows.map((a) => (
        <Card key={a.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(a.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={a.name} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.industry} · {[a.city, a.state].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              <RowActions actions={rowActions(a)} />
            </div>
            <StatusBadge status={a.status} />
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{a.campaigns} campaigns</span>
              <span className="font-medium text-foreground">{usd.format(a.spend)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ rows, onOpen }: { rows: Advertiser[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {ADVERTISER_STATUS_ORDER.map((status) => {
        const col = rows.filter((a) => a.status === status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((a) => (
                <button key={a.id} onClick={() => onOpen(a.id)} className="flex w-full items-center gap-2 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50">
                  <Avatar name={a.name} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{usd.format(a.spend)} · {a.campaigns} campaigns</p>
                  </div>
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

function AdvertiserForm({ draft, onChange }: { draft: Advertiser; onChange: (d: Advertiser) => void }) {
  const set = <K extends keyof Advertiser>(key: K, value: Advertiser[K]) => onChange({ ...draft, [key]: value });
  const num = (v: string) => (v.trim() === "" ? 0 : Math.max(0, Number(v) || 0));
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Advertiser name" className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Brands" />
        </FormField>
        <FormField label="Industry">
          <Select value={draft.industry} onValueChange={(v) => set("industry", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ADVERTISER_INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as AdvertiserStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ADVERTISER_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{ADVERTISER_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Primary contact">
          <Input value={draft.primaryContact} onChange={(e) => set("primaryContact", e.target.value)} placeholder="Jane Doe" />
        </FormField>
        <FormField label="Account owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@acme.com" />
        </FormField>
        <FormField label="Phone">
          <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
        </FormField>
        <FormField label="Website">
          <Input value={draft.website} onChange={(e) => set("website", e.target.value)} placeholder="acme.com" />
        </FormField>
        <FormField label="City">
          <Input value={draft.city} onChange={(e) => set("city", e.target.value)} placeholder="Austin" />
        </FormField>
        <FormField label="State">
          <Input value={draft.state} onChange={(e) => set("state", e.target.value)} placeholder="TX" />
        </FormField>
        <FormField label="Latitude">
          <Input inputMode="decimal" value={draft.lat === null ? "" : String(draft.lat)} onChange={(e) => set("lat", e.target.value.trim() === "" ? null : Number(e.target.value))} placeholder="30.27" />
        </FormField>
        <FormField label="Longitude">
          <Input inputMode="decimal" value={draft.lng === null ? "" : String(draft.lng)} onChange={(e) => set("lng", e.target.value.trim() === "" ? null : Number(e.target.value))} placeholder="-97.74" />
        </FormField>
        <FormField label="Campaigns">
          <Input inputMode="numeric" value={String(draft.campaigns)} onChange={(e) => set("campaigns", num(e.target.value))} />
        </FormField>
        <FormField label="Total spend (USD)">
          <Input inputMode="numeric" value={String(draft.spend)} onChange={(e) => set("spend", num(e.target.value))} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Account context, flights, next steps…" />
      </FormField>
    </div>
  );
}
