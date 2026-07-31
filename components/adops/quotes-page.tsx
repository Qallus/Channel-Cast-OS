"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ClipboardList, ExternalLink, LayoutGrid, List, Pencil, Plus, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

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
import { QUOTE_STATUS, QUOTE_STATUS_ORDER, QUOTE_TYPES, QuoteRequest, QuoteStatus, seedQuotes } from "@/lib/adops/quotes";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "kanban" | "list" | "table" | "cards" | "calendar";
const VIEWS = [
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
];

const OPEN: QuoteStatus[] = ["new", "in_progress", "quoted"];
const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const DAY = 864e5;

function StatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge className={cn("border-transparent", QUOTE_STATUS[status].tone)}>{QUOTE_STATUS[status].label}</Badge>;
}

// SLA chip: due today/overdue in red, soon in amber.
function SlaChip({ q }: { q: QuoteRequest }) {
  if (!OPEN.includes(q.status) || !q.dueDate) return null;
  const days = Math.ceil((new Date(q.dueDate + "T00:00:00").getTime() - Date.now()) / DAY);
  const tone = days < 0 ? "bg-destructive/15 text-destructive" : days <= 1 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground";
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`;
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", tone)}>{label}</span>;
}

function blank(): QuoteRequest {
  return {
    id: genId("qr"),
    company: "",
    contact: "",
    email: "",
    phone: "",
    requestType: "New booking",
    budgetRange: "$5k–$12k",
    locations: 1,
    status: "new",
    owner: "Alex Rivera",
    notes: "",
    dueDate: new Date(Date.now() + 3 * DAY).toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
}

export function QuotesPage() {
  const { items, create, update, remove } = useCollection<QuoteRequest>("quotes", seedQuotes);
  const [view, setView] = useState<View>("kanban");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: QuoteRequest; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<QuoteRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (typeFilter !== "all" && r.requestType !== typeFilter) return false;
      if (!q) return true;
      return [r.company, r.contact, r.requestType, r.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, typeFilter]);

  const stats = useMemo(() => {
    const open = items.filter((r) => OPEN.includes(r.status));
    const slaTight = open.filter((r) => r.dueDate && (new Date(r.dueDate + "T00:00:00").getTime() - Date.now()) / DAY <= 1).length;
    const decided = items.filter((r) => r.status === "won" || r.status === "lost").length;
    const won = items.filter((r) => r.status === "won").length;
    return { open: open.length, slaTight, winRate: decided ? Math.round((won / decided) * 100) : 0, total: items.length };
  }, [items]);

  const drawer = items.find((r) => r.id === drawerId) || null;

  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (r: QuoteRequest) => setEditing({ draft: { ...r }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.company.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Quote request added.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Quote request updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Quote request deleted.");
  }
  const move = (r: QuoteRequest, status: QuoteStatus) => update(r.id, { status });

  const rowActions = (r: QuoteRequest) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(r.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(r) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(r), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Quote Requests"
        description="Deal-desk quote pipeline and SLAs."
        action={
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> New quote
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Open requests" value={stats.open} accent />
        <StatTile label="SLA-tight" value={stats.slaTight} hint="Due ≤ 1 day" />
        <StatTile label="Win rate" value={`${stats.winRate}%`} />
        <StatTile label="Total" value={stats.total} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search requests…" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {QUOTE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand-strong">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No quote requests yet." : "No requests match your filters."} />
      ) : view === "kanban" ? (
        <KanbanView rows={filtered} onOpen={setDrawerId} onMove={move} />
      ) : view === "list" ? (
        <ListView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : (
        <RecordCalendar items={filtered} getId={(r) => r.id} getDate={(r) => r.dueDate} getTitle={(r) => `${r.company} · ${r.requestType}`} onOpen={setDrawerId} footer="Requests placed by SLA due date. Click one to open." />
      )}

      {/* Drawer */}
      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={drawer.company} className="h-12 w-12 text-sm" />
                  <div>
                    <SheetTitle>{drawer.company}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{drawer.requestType}</p>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={drawer.status} />
                <SlaChip q={drawer} />
                <span className="text-sm font-semibold text-foreground">{drawer.budgetRange}</span>
              </div>
              <div>
                <DetailField label="Contact">{drawer.contact}</DetailField>
                <DetailField label="Email">{drawer.email ? <a href={`mailto:${drawer.email}`} className="text-brand-strong hover:underline">{drawer.email}</a> : ""}</DetailField>
                <DetailField label="Phone">{drawer.phone}</DetailField>
                <DetailField label="Request type">{drawer.requestType}</DetailField>
                <DetailField label="Budget">{drawer.budgetRange}</DetailField>
                <DetailField label="Locations">{drawer.locations}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
                <DetailField label="SLA due">{fmtDate(drawer.dueDate)}</DetailField>
                <DetailField label="Received">{new Date(drawer.createdAt).toLocaleDateString()}</DetailField>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Move to status</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUOTE_STATUS_ORDER.map((s) => (
                    <Button key={s} size="sm" variant={s === drawer.status ? "default" : "outline"} onClick={() => update(drawer.id, { status: s })}>
                      {QUOTE_STATUS[s].label}
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
          <DialogHeader><DialogTitle>{editing?.isNew ? "New quote request" : "Edit quote request"}</DialogTitle></DialogHeader>
          {editing && <QuoteForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.company.trim()}>{editing?.isNew ? "Add request" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete quote request?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">The request from &ldquo;{deleteItem?.company}&rdquo; will be removed. This can&apos;t be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KanbanView({ rows, onOpen, onMove }: { rows: QuoteRequest[]; onOpen: (id: string) => void; onMove: (r: QuoteRequest, s: QuoteStatus) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {QUOTE_STATUS_ORDER.map((status) => {
        const col = rows.filter((r) => r.status === status);
        const idx = QUOTE_STATUS_ORDER.indexOf(status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((r) => (
                <div key={r.id} className="rounded-md border border-border bg-background p-2.5">
                  <button onClick={() => onOpen(r.id)} className="w-full text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{r.company}</p>
                      <SlaChip q={r} />
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{r.requestType} · {r.budgetRange}</p>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    {idx > 0 && <button onClick={() => onMove(r, QUOTE_STATUS_ORDER[idx - 1])} className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground" title="Move back">‹</button>}
                    {idx < QUOTE_STATUS_ORDER.length - 1 && <button onClick={() => onMove(r, QUOTE_STATUS_ORDER[idx + 1])} className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground" title="Move forward">›</button>}
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

type QuoteRowActions = (r: QuoteRequest) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

function ListView({ rows, onOpen, rowActions }: { rows: QuoteRequest[]; onOpen: (id: string) => void; rowActions: QuoteRowActions }) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={r.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(r.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <Avatar name={r.company} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{r.company}</p>
                <StatusBadge status={r.status} />
                <SlaChip q={r} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.requestType} · {r.contact}</p>
            </div>
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">{r.budgetRange}</span>
            <RowActions actions={rowActions(r)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CardsView({ rows, onOpen, rowActions }: { rows: QuoteRequest[]; onOpen: (id: string) => void; rowActions: QuoteRowActions }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <Card key={r.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(r.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={r.company} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{r.company}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.requestType}</p>
                </div>
              </div>
              <RowActions actions={rowActions(r)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={r.status} />
              <SlaChip q={r} />
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{r.locations} locations</span>
              <span className="font-medium text-foreground">{r.budgetRange}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ rows, onOpen, rowActions }: { rows: QuoteRequest[]; onOpen: (id: string) => void; rowActions: QuoteRowActions }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.company} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{r.company}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.contact}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.requestType}</TableCell>
                <TableCell className="whitespace-nowrap text-foreground">{r.budgetRange}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell><SlaChip q={r} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{r.owner}</TableCell>
                <TableCell><RowActions actions={rowActions(r)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function QuoteForm({ draft, onChange }: { draft: QuoteRequest; onChange: (d: QuoteRequest) => void }) {
  const set = <K extends keyof QuoteRequest>(key: K, value: QuoteRequest[K]) => onChange({ ...draft, [key]: value });
  const n = (v: string) => (v.trim() === "" ? 0 : Math.max(0, Number(v) || 0));
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Company">
          <Input value={draft.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Co" />
        </FormField>
        <FormField label="Contact">
          <Input value={draft.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Jane Doe" />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@acme.com" />
        </FormField>
        <FormField label="Phone">
          <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
        </FormField>
        <FormField label="Request type">
          <Select value={draft.requestType} onValueChange={(v) => set("requestType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{QUOTE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as QuoteStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{QUOTE_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{QUOTE_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Budget range">
          <Input value={draft.budgetRange} onChange={(e) => set("budgetRange", e.target.value)} placeholder="$5k–$12k" />
        </FormField>
        <FormField label="Locations">
          <Input inputMode="numeric" value={String(draft.locations)} onChange={(e) => set("locations", n(e.target.value))} />
        </FormField>
        <FormField label="Owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
        <FormField label="SLA due date">
          <Input type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Requirements, context, quote details…" />
      </FormField>
    </div>
  );
}
