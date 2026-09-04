"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileBarChart, LayoutGrid, List, Pencil, Plus, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

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
import { Toast, useToast } from "@/components/ui/toast";
import {
  MODEL_STATUS,
  MODEL_STATUS_ORDER,
  MODEL_TYPE,
  MODEL_TYPE_ORDER,
  ModelStatus,
  ModelType,
  RevenueModel,
  formatRate,
  seedRevenueModels,
} from "@/lib/adops/revenue-models";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "cards" | "list" | "table" | "kanban";
const VIEWS = [
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
];

function TypeBadge({ type }: { type: ModelType }) {
  return <Badge className={cn("border-transparent", MODEL_TYPE[type].tone)}>{MODEL_TYPE[type].label}</Badge>;
}
function StatusBadge({ status }: { status: ModelStatus }) {
  return <Badge className={cn("border-transparent", MODEL_STATUS[status].tone)}>{MODEL_STATUS[status].label}</Badge>;
}

function blank(): RevenueModel {
  return {
    id: genId("rm"),
    name: "",
    type: "flat_monthly",
    rate: 0,
    unit: "/mo",
    appliesTo: "",
    status: "draft",
    description: "",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

export function RevenueModelsPage() {
  const { items, create, update, remove } = useCollection<RevenueModel>("revenue_models", seedRevenueModels);
  const [view, setView] = useState<View>("cards");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ModelType | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: RevenueModel; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<RevenueModel | null>(null);
  const { toast, flash } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (!q) return true;
      return [m.name, m.appliesTo, m.description, MODEL_TYPE[m.type].label].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, typeFilter]);

  const stats = useMemo(() => {
    const active = items.filter((m) => m.status === "active").length;
    const types = new Set(items.map((m) => m.type)).size;
    const drafts = items.filter((m) => m.status === "draft").length;
    return { total: items.length, active, types, drafts };
  }, [items]);

  const drawer = items.find((m) => m.id === drawerId) || null;

  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (m: RevenueModel) => setEditing({ draft: { ...m }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Model added.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Model updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Model deleted.");
  }

  const rowActions = (m: RevenueModel) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(m.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(m) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(m), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileBarChart}
        title="Revenue Models"
        description="Pricing, revenue share, and commission structures."
        action={
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> New model
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Models" value={stats.total} />
        <StatTile label="Active" value={stats.active} accent />
        <StatTile label="Pricing types" value={stats.types} />
        <StatTile label="In draft" value={stats.drafts} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search models…" />
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ModelType | "all")}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {MODEL_TYPE_ORDER.map((t) => <SelectItem key={t} value={t}>{MODEL_TYPE[t].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Toast toast={toast} />
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No revenue models yet. Add your first pricing model." : "No models match your filters."} />
      ) : view === "cards" ? (
        <CardsView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "list" ? (
        <ListView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : (
        <KanbanView rows={filtered} onOpen={setDrawerId} />
      )}

      {/* Drawer */}
      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{drawer.name}</SheetTitle>
                <p className="text-2xl font-semibold text-brand-strong">{formatRate(drawer)}</p>
              </SheetHeader>
              <div className="flex flex-wrap gap-2">
                <TypeBadge type={drawer.type} />
                <StatusBadge status={drawer.status} />
              </div>
              {drawer.description && <p className="text-sm text-muted-foreground">{drawer.description}</p>}
              <div>
                <DetailField label="Type">{MODEL_TYPE[drawer.type].label}</DetailField>
                <DetailField label="Rate">{formatRate(drawer)}</DetailField>
                <DetailField label="Applies to">{drawer.appliesTo}</DetailField>
                <DetailField label="Status">{MODEL_STATUS[drawer.status].label}</DetailField>
                <DetailField label="Created">{new Date(drawer.createdAt).toLocaleDateString()}</DetailField>
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
          <DialogHeader><DialogTitle>{editing?.isNew ? "New revenue model" : "Edit revenue model"}</DialogTitle></DialogHeader>
          {editing && <ModelForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Add model" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete model?</DialogTitle></DialogHeader>
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
  rows: RevenueModel[];
  onOpen: (id: string) => void;
  rowActions: (m: RevenueModel) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];
};

function ListView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {rows.map((m) => (
        <Card key={m.id} className={cn("cursor-pointer transition-colors hover:border-brand/40", m.status === "archived" && "opacity-70")} onClick={() => onOpen(m.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                <TypeBadge type={m.type} />
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.appliesTo}</p>
            </div>
            <span className="whitespace-nowrap text-sm font-semibold text-brand-strong">{formatRate(m)}</span>
            <RowActions actions={rowActions(m)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ rows, onOpen }: { rows: RevenueModel[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {MODEL_TYPE_ORDER.map((type) => {
        const col = rows.filter((m) => m.type === type);
        return (
          <div key={type} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <TypeBadge type={type} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((m) => (
                <button key={m.id} onClick={() => onOpen(m.id)} className={cn("w-full rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50", m.status === "archived" && "opacity-70")}>
                  <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-brand-strong">{formatRate(m)}</p>
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

function CardsView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((m) => (
        <Card key={m.id} className={cn("cursor-pointer transition-colors hover:border-brand/40", m.status === "archived" && "opacity-70")} onClick={() => onOpen(m.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{m.name}</p>
                <p className="mt-0.5 text-lg font-semibold text-brand-strong">{formatRate(m)}</p>
              </div>
              <RowActions actions={rowActions(m)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <TypeBadge type={m.type} />
              <StatusBadge status={m.status} />
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>
            <p className="text-[11px] text-muted-foreground">Applies to: {m.appliesTo || "—"}</p>
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
              <TableHead>Model</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Applies to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id} className={cn("cursor-pointer", m.status === "archived" && "opacity-70")} onClick={() => onOpen(m.id)}>
                <TableCell className="font-medium text-foreground">{m.name}</TableCell>
                <TableCell><TypeBadge type={m.type} /></TableCell>
                <TableCell className="whitespace-nowrap font-medium text-foreground">{formatRate(m)}</TableCell>
                <TableCell className="text-muted-foreground">{m.appliesTo}</TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
                <TableCell><RowActions actions={rowActions(m)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ModelForm({ draft, onChange }: { draft: RevenueModel; onChange: (d: RevenueModel) => void }) {
  const set = <K extends keyof RevenueModel>(key: K, value: RevenueModel[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Model name" className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Standard Subscription" />
        </FormField>
        <FormField label="Type">
          <Select value={draft.type} onValueChange={(v) => set("type", v as ModelType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MODEL_TYPE_ORDER.map((t) => <SelectItem key={t} value={t}>{MODEL_TYPE[t].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as ModelStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MODEL_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{MODEL_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Rate">
          <Input inputMode="decimal" value={String(draft.rate)} onChange={(e) => set("rate", e.target.value.trim() === "" ? 0 : Number(e.target.value) || 0)} />
        </FormField>
        <FormField label="Unit / suffix">
          <Input value={draft.unit} onChange={(e) => set("unit", e.target.value)} placeholder="/mo per location" />
        </FormField>
        <FormField label="Applies to" className="sm:col-span-2">
          <Input value={draft.appliesTo} onChange={(e) => set("appliesTo", e.target.value)} placeholder="SMB single-site clients" />
        </FormField>
      </div>
      <FormField label="Description">
        <Textarea rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="How this pricing works…" />
      </FormField>
      <FormField label="Notes">
        <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes…" />
      </FormField>
      <p className="text-xs text-muted-foreground">Preview: <span className="font-medium text-brand-strong">{formatRate(draft)}</span></p>
    </div>
  );
}
