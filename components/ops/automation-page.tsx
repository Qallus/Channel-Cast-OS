"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink, List, Pencil, Plus, SquareKanban, Table as TableIcon, Trash2, Workflow, Zap } from "lucide-react";

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
import { ACTION, ACTION_ORDER, Automation, ActionType, TRIGGER, TRIGGER_ORDER, TriggerType, seedAutomations } from "@/lib/ops/automations";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "kanban";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
];

const num = new Intl.NumberFormat("en-US");
const fmtDate = (iso: string | null) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—");

function TriggerBadge({ trigger }: { trigger: TriggerType }) {
  return <Badge className={cn("border-transparent", TRIGGER[trigger].tone)}>{TRIGGER[trigger].label}</Badge>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-brand" : "bg-muted")}
    >
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

function Flow({ trigger, action, target }: { trigger: TriggerType; action: ActionType; target: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-muted-foreground"><Zap className="h-3 w-3" /> {TRIGGER[trigger].label}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span className="inline-flex items-center gap-1 rounded bg-brand/10 px-2 py-1 font-medium text-brand-strong">{ACTION[action].label}{target ? ` · ${target}` : ""}</span>
    </div>
  );
}

function blank(): Automation {
  return { id: genId("au"), name: "", trigger: "device_offline", condition: "", action: "notify_team", target: "", enabled: true, runs: 0, lastRun: null, notes: "", createdAt: new Date().toISOString() };
}

type RowActionsFn = (a: Automation) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

export function AutomationPage() {
  const { items, create, update, remove } = useCollection<Automation>("automations", seedAutomations);
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const [triggerFilter, setTriggerFilter] = useState<TriggerType | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Automation; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Automation | null>(null);
  const { toast, flash } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (triggerFilter !== "all" && a.trigger !== triggerFilter) return false;
      if (!q) return true;
      return [a.name, a.condition, a.target, TRIGGER[a.trigger].label, ACTION[a.action].label].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, triggerFilter]);

  const stats = useMemo(() => {
    const active = items.filter((a) => a.enabled).length;
    const runs = items.reduce((s, a) => s + a.runs, 0);
    return { total: items.length, active, paused: items.length - active, runs };
  }, [items]);

  const drawer = items.find((a) => a.id === drawerId) || null;
  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (a: Automation) => setEditing({ draft: { ...a }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Automation created.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Automation updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Automation deleted.");
  }

  const rowActions: RowActionsFn = (a) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(a.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(a) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(a), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Workflow}
        title="Automation"
        description="Rules that react to network events and run actions."
        action={<Button onClick={openNew} className="shrink-0"><Plus className="h-4 w-4" /> New automation</Button>}
      />

      <StatRow>
        <StatTile label="Automations" value={stats.total} />
        <StatTile label="Active" value={stats.active} accent />
        <StatTile label="Paused" value={stats.paused} />
        <StatTile label="Total runs" value={num.format(stats.runs)} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search automations…" />
          <Select value={triggerFilter} onValueChange={(v) => setTriggerFilter(v as TriggerType | "all")}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All triggers</SelectItem>
              {TRIGGER_ORDER.map((t) => <SelectItem key={t} value={t}>{TRIGGER[t].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Toast toast={toast} />
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No automations yet. Create your first rule." : "No automations match your filters."} />
      ) : view === "list" ? (
        <ListView rows={filtered} onOpen={setDrawerId} onToggle={(a, v) => update(a.id, { enabled: v })} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={setDrawerId} onToggle={(a, v) => update(a.id, { enabled: v })} rowActions={rowActions} />
      ) : (
        <KanbanView rows={filtered} onOpen={setDrawerId} />
      )}

      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{drawer.name}</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-2">
                <Badge className={cn("border-transparent", drawer.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{drawer.enabled ? "Active" : "Paused"}</Badge>
                <Toggle checked={drawer.enabled} onChange={(v) => update(drawer.id, { enabled: v })} />
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3"><Flow trigger={drawer.trigger} action={drawer.action} target={drawer.target} /></div>
              <div>
                <DetailField label="Trigger">{TRIGGER[drawer.trigger].label}</DetailField>
                <DetailField label="Condition">{drawer.condition}</DetailField>
                <DetailField label="Action">{ACTION[drawer.action].label}</DetailField>
                <DetailField label="Target">{drawer.target}</DetailField>
                <DetailField label="Total runs">{num.format(drawer.runs)}</DetailField>
                <DetailField label="Last run">{fmtDate(drawer.lastRun)}</DetailField>
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
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.isNew ? "New automation" : "Edit automation"}</DialogTitle></DialogHeader>
          {editing && <AutomationForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Create automation" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete automation?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">&ldquo;{deleteItem?.name}&rdquo; will stop running. This can&apos;t be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ViewProps = { rows: Automation[]; onOpen: (id: string) => void; onToggle: (a: Automation, v: boolean) => void; rowActions: RowActionsFn };

function ListView({ rows, onOpen, onToggle, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {rows.map((a) => (
        <Card key={a.id} className={cn("cursor-pointer transition-colors hover:border-brand/40", !a.enabled && "opacity-70")} onClick={() => onOpen(a.id)}>
          <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
            <div className="min-w-0 lg:w-64">
              <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{num.format(a.runs)} runs · last {fmtDate(a.lastRun)}</p>
            </div>
            <div className="flex-1"><Flow trigger={a.trigger} action={a.action} target={a.target} /></div>
            <Toggle checked={a.enabled} onChange={(v) => onToggle(a, v)} />
            <RowActions actions={rowActions(a)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ rows, onOpen, onToggle, rowActions }: ViewProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Automation</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Runs</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id} className={cn("cursor-pointer", !a.enabled && "opacity-70")} onClick={() => onOpen(a.id)}>
                <TableCell className="font-medium text-foreground">{a.name}</TableCell>
                <TableCell><TriggerBadge trigger={a.trigger} /></TableCell>
                <TableCell className="text-muted-foreground">{ACTION[a.action].label}</TableCell>
                <TableCell className="text-right text-foreground">{num.format(a.runs)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}><Toggle checked={a.enabled} onChange={(v) => onToggle(a, v)} /></TableCell>
                <TableCell><RowActions actions={rowActions(a)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function KanbanView({ rows, onOpen }: { rows: Automation[]; onOpen: (id: string) => void }) {
  const triggers = TRIGGER_ORDER.filter((t) => rows.some((a) => a.trigger === t));
  const cols = triggers.length ? triggers : TRIGGER_ORDER;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cols.map((trigger) => {
        const col = rows.filter((a) => a.trigger === trigger);
        return (
          <div key={trigger} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <TriggerBadge trigger={trigger} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((a) => (
                <button key={a.id} onClick={() => onOpen(a.id)} className={cn("w-full rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50", !a.enabled && "opacity-70")}>
                  <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{ACTION[a.action].label}{a.target ? ` · ${a.target}` : ""}</p>
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

function AutomationForm({ draft, onChange }: { draft: Automation; onChange: (d: Automation) => void }) {
  const set = <K extends keyof Automation>(key: K, value: Automation[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <FormField label="Automation name">
        <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Alert on device offline" />
      </FormField>
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Zap className="h-3 w-3" /> When this happens</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Trigger">
            <Select value={draft.trigger} onValueChange={(v) => set("trigger", v as TriggerType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TRIGGER_ORDER.map((t) => <SelectItem key={t} value={t}>{TRIGGER[t].label}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Condition">
            <Input value={draft.condition} onChange={(e) => set("condition", e.target.value)} placeholder="Offline > 5 minutes" />
          </FormField>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><ArrowRight className="h-3 w-3" /> Do this</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Action">
            <Select value={draft.action} onValueChange={(v) => set("action", v as ActionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTION_ORDER.map((a) => <SelectItem key={a} value={a}>{ACTION[a].label}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Target">
            <Input value={draft.target} onChange={(e) => set("target", e.target.value)} placeholder="Ops channel / email / URL" />
          </FormField>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <Toggle checked={draft.enabled} onChange={(v) => set("enabled", v)} /> Enabled
      </label>
      <FormField label="Notes">
        <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="What this rule does…" />
      </FormField>
    </div>
  );
}
