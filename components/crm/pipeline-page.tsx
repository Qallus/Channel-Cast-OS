"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ExternalLink, GitBranchPlus, LayoutGrid, List, Pencil, Plus, Table as TableIcon, Trash2, TrendingUp } from "lucide-react";

import {
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
import { DEAL_STAGE, DEAL_STAGE_ORDER, Deal, DealStage, OPEN_STAGES, seedDeals } from "@/lib/crm/deals";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "kanban" | "list" | "table" | "cards" | "calendar";
const VIEWS = [
  { id: "kanban" as const, label: "Board", icon: GitBranchPlus },
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dateFmt = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

function StageBadge({ stage }: { stage: DealStage }) {
  return <Badge className={cn("border-transparent", DEAL_STAGE[stage].tone)}>{DEAL_STAGE[stage].label}</Badge>;
}

function blankDeal(): Deal {
  return {
    id: genId("dl"),
    name: "",
    client: "",
    stage: "qualified",
    value: 0,
    probability: DEAL_STAGE.qualified.defaultProb,
    closeDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    owner: "Alex Rivera",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

export function PipelinePage() {
  const { items, create, update, remove } = useCollection<Deal>("deals", seedDeals);
  const [view, setView] = useState<View>("kanban");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Deal; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Deal | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const owners = useMemo(() => Array.from(new Set(items.map((d) => d.owner))), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (ownerFilter !== "all" && d.owner !== ownerFilter) return false;
      if (!q) return true;
      return [d.name, d.client, d.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, ownerFilter]);

  const stats = useMemo(() => {
    const open = items.filter((d) => OPEN_STAGES.includes(d.stage));
    const openValue = open.reduce((s, d) => s + d.value, 0);
    const weighted = open.reduce((s, d) => s + (d.value * d.probability) / 100, 0);
    const won = items.filter((d) => d.stage === "won");
    const wonValue = won.reduce((s, d) => s + d.value, 0);
    const decided = items.filter((d) => d.stage === "won" || d.stage === "lost").length;
    const winRate = decided ? Math.round((won.length / decided) * 100) : 0;
    return { openCount: open.length, openValue, weighted, wonValue, winRate };
  }, [items]);

  const drawer = items.find((d) => d.id === drawerId) || null;

  const openNew = () => setEditing({ draft: blankDeal(), isNew: true });
  const openEdit = (d: Deal) => setEditing({ draft: { ...d }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Deal added.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Deal updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Deal deleted.");
  }
  const move = (d: Deal, stage: DealStage) => update(d.id, { stage, probability: DEAL_STAGE[stage].defaultProb });

  const rowActions = (d: Deal) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(d.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(d) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(d), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Pipeline"
        description="Deals in flight, by stage, with a weighted forecast."
        action={
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> Add deal
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Open deals" value={stats.openCount} hint={usd.format(stats.openValue)} />
        <StatTile label="Weighted forecast" value={usd.format(Math.round(stats.weighted))} accent hint="Value × probability" />
        <StatTile label="Won" value={usd.format(stats.wonValue)} />
        <StatTile label="Win rate" value={`${stats.winRate}%`} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search deals…" />
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand-strong">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No deals yet. Add your first opportunity." : "No deals match your filters."} />
      ) : view === "kanban" ? (
        <BoardView deals={filtered} onOpen={setDrawerId} onMove={move} />
      ) : view === "list" ? (
        <ListView deals={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView deals={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView deals={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : (
        <RecordCalendar items={filtered} getId={(d) => d.id} getDate={(d) => d.closeDate} getTitle={(d) => d.name} onOpen={setDrawerId} footer="Deals placed by expected close date. Click one to open." />
      )}

      {/* Drawer */}
      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{drawer.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{drawer.client}</p>
              </SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <StageBadge stage={drawer.stage} />
                <span className="text-lg font-semibold text-foreground">{usd.format(drawer.value)}</span>
                <span className="text-sm text-muted-foreground">· {drawer.probability}% likely</span>
              </div>
              <div>
                <DetailField label="Client">{drawer.client}</DetailField>
                <DetailField label="Value">{usd.format(drawer.value)}</DetailField>
                <DetailField label="Probability">{drawer.probability}%</DetailField>
                <DetailField label="Weighted">{usd.format(Math.round((drawer.value * drawer.probability) / 100))}</DetailField>
                <DetailField label="Expected close">{dateFmt(drawer.closeDate)}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Move to stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {DEAL_STAGE_ORDER.map((s) => (
                    <Button key={s} size="sm" variant={s === drawer.stage ? "default" : "outline"} onClick={() => move(drawer, s)}>
                      {DEAL_STAGE[s].label}
                    </Button>
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

      {/* Modal */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.isNew ? "Add deal" : "Edit deal"}</DialogTitle></DialogHeader>
          {editing && <DealForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Add deal" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete deal?</DialogTitle></DialogHeader>
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

function BoardView({ deals, onOpen, onMove }: { deals: Deal[]; onOpen: (id: string) => void; onMove: (d: Deal, s: DealStage) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {DEAL_STAGE_ORDER.map((stage) => {
        const col = deals.filter((d) => d.stage === stage);
        const total = col.reduce((s, d) => s + d.value, 0);
        const idx = DEAL_STAGE_ORDER.indexOf(stage);
        return (
          <div key={stage} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StageBadge stage={stage} />
              <span className="text-xs text-muted-foreground">{usd.format(total)}</span>
            </div>
            <div className="space-y-2">
              {col.map((d) => (
                <div key={d.id} className="rounded-md border border-border bg-background p-2.5">
                  <button onClick={() => onOpen(d.id)} className="w-full text-left">
                    <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{d.client}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{usd.format(d.value)}</span>
                      <span className="text-[11px] text-muted-foreground">{d.probability}%</span>
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{dateFmt(d.closeDate)}</span>
                    <div className="flex gap-1">
                      {idx > 0 && <button onClick={() => onMove(d, DEAL_STAGE_ORDER[idx - 1])} className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground" title="Move back">‹</button>}
                      {idx < DEAL_STAGE_ORDER.length - 1 && <button onClick={() => onMove(d, DEAL_STAGE_ORDER[idx + 1])} className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground" title="Move forward">›</button>}
                    </div>
                  </div>
                </div>
              ))}
              {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground/60">Empty</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type DealRowActions = (d: Deal) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

function ListView({ deals, onOpen, rowActions }: { deals: Deal[]; onOpen: (id: string) => void; rowActions: DealRowActions }) {
  return (
    <div className="space-y-2">
      {deals.map((d) => (
        <Card key={d.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(d.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                <StageBadge stage={d.stage} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.client} · closes {dateFmt(d.closeDate)}</p>
            </div>
            <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:block">{d.probability}%</span>
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">{usd.format(d.value)}</span>
            <RowActions actions={rowActions(d)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CardsView({ deals, onOpen, rowActions }: { deals: Deal[]; onOpen: (id: string) => void; rowActions: DealRowActions }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {deals.map((d) => (
        <Card key={d.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(d.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">{d.client}</p>
              </div>
              <RowActions actions={rowActions(d)} />
            </div>
            <StageBadge stage={d.stage} />
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{d.probability}% · {dateFmt(d.closeDate)}</span>
              <span className="font-semibold text-foreground">{usd.format(d.value)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ deals, onOpen, rowActions }: { deals: Deal[]; onOpen: (id: string) => void; rowActions: DealRowActions }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Prob.</TableHead>
              <TableHead>Close</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((d) => (
              <TableRow key={d.id} className="cursor-pointer" onClick={() => onOpen(d.id)}>
                <TableCell className="font-medium text-foreground">{d.name}</TableCell>
                <TableCell className="text-muted-foreground">{d.client}</TableCell>
                <TableCell><StageBadge stage={d.stage} /></TableCell>
                <TableCell className="text-right text-foreground">{usd.format(d.value)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{d.probability}%</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{dateFmt(d.closeDate)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{d.owner}</TableCell>
                <TableCell><RowActions actions={rowActions(d)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DealForm({ draft, onChange }: { draft: Deal; onChange: (d: Deal) => void }) {
  const set = <K extends keyof Deal>(key: K, value: Deal[K]) => onChange({ ...draft, [key]: value });
  const num = (v: string) => (v.trim() === "" ? 0 : Math.max(0, Number(v) || 0));
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Deal name" className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme — network rollout" />
        </FormField>
        <FormField label="Client">
          <Input value={draft.client} onChange={(e) => set("client", e.target.value)} placeholder="Acme Resorts" />
        </FormField>
        <FormField label="Owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
        <FormField label="Stage">
          <Select value={draft.stage} onValueChange={(v) => set("stage", v as DealStage)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEAL_STAGE_ORDER.map((s) => <SelectItem key={s} value={s}>{DEAL_STAGE[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Expected close">
          <Input type="date" value={draft.closeDate} onChange={(e) => set("closeDate", e.target.value)} />
        </FormField>
        <FormField label="Value (USD)">
          <Input inputMode="numeric" value={String(draft.value)} onChange={(e) => set("value", num(e.target.value))} />
        </FormField>
        <FormField label="Probability (%)">
          <Input inputMode="numeric" value={String(draft.probability)} onChange={(e) => set("probability", Math.min(100, num(e.target.value)))} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Deal context, blockers, next steps…" />
      </FormField>
    </div>
  );
}
