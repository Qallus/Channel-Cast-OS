"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ExternalLink, FolderKanban, LayoutGrid, List, Pencil, Plus, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

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
import { PROJECT_STATUS, PROJECT_STATUS_ORDER, Project, ProjectStatus, seedProjects } from "@/lib/ops/projects";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "cards" | "kanban" | "calendar";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
];

const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge className={cn("border-transparent", PROJECT_STATUS[status].tone)}>{PROJECT_STATUS[status].label}</Badge>;
}
function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">{pct}%</span>
    </div>
  );
}

function blank(): Project {
  return { id: genId("pj"), name: "", client: "", status: "planning", progress: 0, owner: "Alex Rivera", startDate: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), notes: "", createdAt: new Date().toISOString() };
}

type RowActionsFn = (p: Project) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

export function ProjectsPage() {
  const { items, create, update, remove } = useCollection<Project>("projects", seedProjects);
  const [view, setView] = useState<View>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Project; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Project | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return [p.name, p.client, p.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const active = items.filter((p) => p.status === "active").length;
    const completed = items.filter((p) => p.status === "completed").length;
    const avg = items.length ? Math.round(items.reduce((s, p) => s + p.progress, 0) / items.length) : 0;
    return { total: items.length, active, completed, avg };
  }, [items]);

  const drawer = items.find((p) => p.id === drawerId) || null;
  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (p: Project) => setEditing({ draft: { ...p }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Project created.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Project updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Project deleted.");
  }
  const move = (p: Project, status: ProjectStatus) => update(p.id, { status, progress: status === "completed" ? 100 : p.progress });

  const rowActions: RowActionsFn = (p) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(p.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(p) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(p), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderKanban}
        title="Projects"
        description="Installs, campaigns, and onboarding projects."
        action={<Button onClick={openNew} className="shrink-0"><Plus className="h-4 w-4" /> New project</Button>}
      />

      <StatRow>
        <StatTile label="Projects" value={stats.total} />
        <StatTile label="Active" value={stats.active} accent />
        <StatTile label="Completed" value={stats.completed} />
        <StatTile label="Avg. progress" value={`${stats.avg}%`} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search projects…" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | "all")}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PROJECT_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{PROJECT_STATUS[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand-strong">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No projects yet. Create your first project." : "No projects match your filters."} />
      ) : view === "list" ? (
        <ListView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "kanban" ? (
        <KanbanView rows={filtered} onOpen={setDrawerId} />
      ) : (
        <CalendarView rows={filtered} onOpen={setDrawerId} />
      )}

      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{drawer.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{drawer.client}</p>
              </SheetHeader>
              <div className="flex flex-wrap gap-2"><StatusBadge status={drawer.status} /></div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Progress</p>
                <Progress value={drawer.progress} />
              </div>
              <div>
                <DetailField label="Client">{drawer.client}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
                <DetailField label="Start">{fmtDate(drawer.startDate)}</DetailField>
                <DetailField label="Due">{fmtDate(drawer.dueDate)}</DetailField>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Set status</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_STATUS_ORDER.map((s) => (
                    <Button key={s} size="sm" variant={s === drawer.status ? "default" : "outline"} onClick={() => move(drawer, s)}>{PROJECT_STATUS[s].label}</Button>
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
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.isNew ? "New project" : "Edit project"}</DialogTitle></DialogHeader>
          {editing && <ProjectForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Create project" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete project?</DialogTitle></DialogHeader>
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

type ViewProps = { rows: Project[]; onOpen: (id: string) => void; rowActions: RowActionsFn };

function ListView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {rows.map((p) => (
        <Card key={p.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(p.id)}>
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 sm:w-72">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.client}</p>
            </div>
            <div className="flex-1"><Progress value={p.progress} /></div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">Due {fmtDate(p.dueDate)}</span>
            <RowActions actions={rowActions(p)} />
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
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Progress</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => onOpen(p.id)}>
                <TableCell className="max-w-[260px] truncate font-medium text-foreground">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.client}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell><Progress value={p.progress} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(p.dueDate)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{p.owner}</TableCell>
                <TableCell><RowActions actions={rowActions(p)} /></TableCell>
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
      {rows.map((p) => (
        <Card key={p.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(p.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.client}</p>
              </div>
              <RowActions actions={rowActions(p)} />
            </div>
            <StatusBadge status={p.status} />
            <Progress value={p.progress} />
            <p className="text-xs text-muted-foreground">{fmtDate(p.startDate)} – {fmtDate(p.dueDate)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ rows, onOpen }: { rows: Project[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {PROJECT_STATUS_ORDER.map((status) => {
        const col = rows.filter((p) => p.status === status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((p) => (
                <button key={p.id} onClick={() => onOpen(p.id)} className="w-full rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50">
                  <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{p.client}</p>
                  <div className="mt-1.5"><Progress value={p.progress} /></div>
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

function CalendarView({ rows, onOpen }: { rows: Project[]; onOpen: (id: string) => void }) {
  const initial = useMemo(() => {
    const d = rows[0] ? new Date(rows[0].dueDate + "T00:00:00") : new Date(2026, 6, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [rows]);
  const [cursor, setCursor] = useState(initial);
  const first = new Date(cursor.year, cursor.month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const byDay = useMemo(() => {
    const map = new Map<number, Project[]>();
    rows.forEach((p) => {
      const d = new Date(p.dueDate + "T00:00:00");
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), p]);
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
          <span className="text-sm font-semibold text-foreground">{monthLabel} · due dates</span>
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
                    {(byDay.get(day) ?? []).map((p) => (
                      <button key={p.id} onClick={() => onOpen(p.id)} className="w-full truncate rounded bg-brand/15 px-1.5 py-0.5 text-left text-[10px] font-medium text-brand-strong" title={`${p.name} — ${p.client}`}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Projects placed by due date. Click one to open.</p>
      </CardContent>
    </Card>
  );
}

function ProjectForm({ draft, onChange }: { draft: Project; onChange: (d: Project) => void }) {
  const set = <K extends keyof Project>(key: K, value: Project[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <FormField label="Project name">
        <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme — Store Rollout" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Client">
          <Input value={draft.client} onChange={(e) => set("client", e.target.value)} placeholder="Acme Co" />
        </FormField>
        <FormField label="Owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as ProjectStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROJECT_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{PROJECT_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Progress (%)">
          <Input inputMode="numeric" value={String(draft.progress)} onChange={(e) => set("progress", Math.max(0, Math.min(100, e.target.value.trim() === "" ? 0 : Number(e.target.value) || 0)))} />
        </FormField>
        <FormField label="Start date">
          <Input type="date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </FormField>
        <FormField label="Due date">
          <Input type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Scope, milestones, blockers…" />
      </FormField>
    </div>
  );
}
