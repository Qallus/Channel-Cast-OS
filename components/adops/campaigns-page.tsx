"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarDays, ExternalLink, LayoutGrid, List, Map as MapIcon, Pencil, Plus, Send, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

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
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Toast, useToast } from "@/components/ui/toast";
import {
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_ORDER,
  Campaign,
  CampaignStatus,
  seedCampaigns,
} from "@/lib/adops/campaigns";
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

const CampaignsMap = dynamic(() => import("@/components/crm/records-map"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">Loading map…</div>,
});

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-US");
const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

function StatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge className={cn("border-transparent", CAMPAIGN_STATUS[status].tone)}>{CAMPAIGN_STATUS[status].label}</Badge>;
}

function Pacing({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">{pct}%</span>
    </div>
  );
}

function blank(): Campaign {
  return {
    id: genId("cp"),
    name: "",
    advertiser: "",
    status: "draft",
    objective: "Awareness",
    budget: 0,
    spent: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    spots: 1,
    plays: 0,
    city: "",
    state: "",
    lat: null,
    lng: null,
    owner: "Alex Rivera",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

export function CampaignsPage() {
  const { items, create, update, remove } = useCollection<Campaign>("campaigns", seedCampaigns);
  const [view, setView] = useState<View>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Campaign; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Campaign | null>(null);
  const { toast, flash } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.name, c.advertiser, c.objective, c.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const live = items.filter((c) => c.status === "live").length;
    const budget = items.reduce((s, c) => s + c.budget, 0);
    const spent = items.reduce((s, c) => s + c.spent, 0);
    const plays = items.reduce((s, c) => s + c.plays, 0);
    return { live, budget, spent, plays };
  }, [items]);

  const drawer = items.find((c) => c.id === drawerId) || null;

  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (c: Campaign) => setEditing({ draft: { ...c }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Campaign created.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Campaign updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Campaign deleted.");
  }

  const rowActions = (c: Campaign) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(c.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(c) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(c), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Send}
        title="Campaigns"
        description="Build, schedule, and deploy audio campaigns."
        action={
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Live campaigns" value={stats.live} accent />
        <StatTile label="Total budget" value={usd.format(stats.budget)} />
        <StatTile label="Spent" value={usd.format(stats.spent)} hint={`${stats.budget ? Math.round((stats.spent / stats.budget) * 100) : 0}% of budget`} />
        <StatTile label="Total plays" value={num.format(stats.plays)} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search campaigns…" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CampaignStatus | "all")}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CAMPAIGN_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{CAMPAIGN_STATUS[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Toast toast={toast} />
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No campaigns yet. Create your first campaign." : "No campaigns match your filters."} />
      ) : view === "list" ? (
        <ListView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "kanban" ? (
        <KanbanView rows={filtered} onOpen={setDrawerId} />
      ) : view === "calendar" ? (
        <CalendarView rows={filtered} onOpen={setDrawerId} />
      ) : (
        <MapView rows={filtered} onOpen={setDrawerId} />
      )}

      {/* Drawer */}
      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{drawer.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{drawer.advertiser} · {drawer.objective}</p>
              </SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={drawer.status} />
                <span className="text-sm text-muted-foreground">{fmtDate(drawer.startDate)} – {fmtDate(drawer.endDate)}</span>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Budget pacing</p>
                <Pacing spent={drawer.spent} budget={drawer.budget} />
                <p className="mt-1 text-xs text-muted-foreground">{usd.format(drawer.spent)} of {usd.format(drawer.budget)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Spots</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{drawer.spots}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Plays</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{num.format(drawer.plays)}</p>
                </div>
              </div>
              <div>
                <DetailField label="Advertiser">{drawer.advertiser}</DetailField>
                <DetailField label="Objective">{drawer.objective}</DetailField>
                <DetailField label="Flight">{fmtDate(drawer.startDate)} – {fmtDate(drawer.endDate)}</DetailField>
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
          <DialogHeader><DialogTitle>{editing?.isNew ? "New campaign" : "Edit campaign"}</DialogTitle></DialogHeader>
          {editing && <CampaignForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Create campaign" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete campaign?</DialogTitle></DialogHeader>
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
  rows: Campaign[];
  onOpen: (id: string) => void;
  rowActions: (c: Campaign) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];
};

function TableView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Advertiser</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Pacing</TableHead>
              <TableHead>Flight</TableHead>
              <TableHead className="text-right">Plays</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => onOpen(c.id)}>
                <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.advertiser}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell><Pacing spent={c.spent} budget={c.budget} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</TableCell>
                <TableCell className="text-right text-foreground">{num.format(c.plays)}</TableCell>
                <TableCell><RowActions actions={rowActions(c)} /></TableCell>
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
      {rows.map((c) => (
        <Card key={c.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(c.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.advertiser}</p>
              </div>
              <RowActions actions={rowActions(c)} />
            </div>
            <StatusBadge status={c.status} />
            <Pacing spent={c.spent} budget={c.budget} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</span>
              <span>{num.format(c.plays)} plays</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ rows, onOpen }: { rows: Campaign[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {CAMPAIGN_STATUS_ORDER.map((status) => {
        const col = rows.filter((c) => c.status === status);
        const spend = col.reduce((s, c) => s + c.spent, 0);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{col.length} · {usd.format(spend)}</span>
            </div>
            <div className="space-y-2">
              {col.map((c) => (
                <button key={c.id} onClick={() => onOpen(c.id)} className="w-full rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{c.advertiser}</p>
                  <div className="mt-1.5"><Pacing spent={c.spent} budget={c.budget} /></div>
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

function CalendarView({ rows, onOpen }: { rows: Campaign[]; onOpen: (id: string) => void }) {
  const initial = useMemo(() => {
    const d = rows[0] ? new Date(rows[0].startDate + "T00:00:00") : new Date(2026, 6, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [rows]);
  const [cursor, setCursor] = useState(initial);

  const first = new Date(cursor.year, cursor.month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const byDay = useMemo(() => {
    const map = new Map<number, Campaign[]>();
    rows.forEach((c) => {
      const d = new Date(c.startDate + "T00:00:00");
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), c]);
      }
    });
    return map;
  }, [rows, cursor]);

  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

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
                    {(byDay.get(day) ?? []).map((c) => (
                      <button key={c.id} onClick={() => onOpen(c.id)} className="w-full truncate rounded bg-brand/15 px-1.5 py-0.5 text-left text-[10px] font-medium text-brand-strong" title={`${c.name} — ${c.advertiser}`}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Campaigns placed by start date. Click one to open.</p>
      </CardContent>
    </Card>
  );
}

function ListView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {rows.map((c) => (
        <Card key={c.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(c.id)}>
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 sm:w-64">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.advertiser} · {[c.city, c.state].filter(Boolean).join(", ")}</p>
            </div>
            <div className="flex-1"><Pacing spent={c.spent} budget={c.budget} /></div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="whitespace-nowrap">{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</span>
              <span className="whitespace-nowrap">{num.format(c.plays)} plays</span>
            </div>
            <RowActions actions={rowActions(c)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MapView({ rows, onOpen }: { rows: Campaign[]; onOpen: (id: string) => void }) {
  const points = rows
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({ id: c.id, lat: c.lat as number, lng: c.lng as number, title: c.name, subtitle: `${c.advertiser} · ${CAMPAIGN_STATUS[c.status].label}` }));
  if (points.length === 0) {
    return <EmptyState message="No campaigns have a location yet. Edit a campaign and add a city or latitude/longitude to plot it here." />;
  }
  return (
    <Card>
      <CardContent className="p-4">
        <CampaignsMap points={points} onOpen={onOpen} />
        <p className="mt-2 text-xs text-muted-foreground">{points.length} located campaign{points.length === 1 ? "" : "s"} plotted. Click a marker to open.</p>
      </CardContent>
    </Card>
  );
}

function CampaignForm({ draft, onChange }: { draft: Campaign; onChange: (d: Campaign) => void }) {
  const set = <K extends keyof Campaign>(key: K, value: Campaign[K]) => onChange({ ...draft, [key]: value });
  const n = (v: string) => (v.trim() === "" ? 0 : Math.max(0, Number(v) || 0));
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Campaign name" className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Spring Promo 30s" />
        </FormField>
        <FormField label="Advertiser">
          <Input value={draft.advertiser} onChange={(e) => set("advertiser", e.target.value)} placeholder="Acme Brands" />
        </FormField>
        <FormField label="Owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as CampaignStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CAMPAIGN_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{CAMPAIGN_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Objective">
          <Select value={draft.objective} onValueChange={(v) => set("objective", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CAMPAIGN_OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Start date">
          <DatePicker value={draft.startDate} onChange={(v) => set("startDate", v)} />
        </FormField>
        <FormField label="End date">
          <DatePicker value={draft.endDate} onChange={(v) => set("endDate", v)} />
        </FormField>
        <FormField label="Budget (USD)">
          <Input inputMode="numeric" value={String(draft.budget)} onChange={(e) => set("budget", n(e.target.value))} />
        </FormField>
        <FormField label="Spent (USD)">
          <Input inputMode="numeric" value={String(draft.spent)} onChange={(e) => set("spent", n(e.target.value))} />
        </FormField>
        <FormField label="Spots in rotation">
          <Input inputMode="numeric" value={String(draft.spots)} onChange={(e) => set("spots", n(e.target.value))} />
        </FormField>
        <FormField label="Plays">
          <Input inputMode="numeric" value={String(draft.plays)} onChange={(e) => set("plays", n(e.target.value))} />
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
      </div>
      <p className="text-xs text-muted-foreground">City/coordinates place this campaign on the Map view.</p>
      <FormField label="Notes">
        <Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Creative, pacing notes, targeting…" />
      </FormField>
    </div>
  );
}
