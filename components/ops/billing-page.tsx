"use client";

import { useMemo, useState } from "react";
import { CreditCard, ExternalLink, List, Pencil, Plus, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

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
import { INVOICE_STATUS, INVOICE_STATUS_ORDER, Invoice, InvoiceStatus, seedInvoices } from "@/lib/ops/invoices";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "kanban";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge className={cn("border-transparent", INVOICE_STATUS[status].tone)}>{INVOICE_STATUS[status].label}</Badge>;
}

function blank(): Invoice {
  const today = new Date();
  return {
    id: genId("inv"),
    number: `CC-${1048 + Math.floor(Math.random() * 900)}`,
    client: "",
    amount: 0,
    status: "draft",
    issueDate: today.toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    description: "",
    owner: "Alex Rivera",
    createdAt: today.toISOString(),
  };
}

export function BillingPage() {
  const { items, create, update, remove } = useCollection<Invoice>("invoices", seedInvoices);
  const [view, setView] = useState<View>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Invoice; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Invoice | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      return [i.number, i.client, i.description, i.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const outstanding = items.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
    const overdue = items.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
    const paid = items.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
    return { outstanding, overdue, paid, count: items.length };
  }, [items]);

  const drawer = items.find((i) => i.id === drawerId) || null;

  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (i: Invoice) => setEditing({ draft: { ...i }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.client.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Invoice created.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Invoice updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Invoice deleted.");
  }
  const move = (i: Invoice, status: InvoiceStatus) => update(i.id, { status });

  const rowActions = (i: Invoice) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(i.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(i) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(i), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CreditCard}
        title="Billing"
        description="Invoices, subscriptions, and payments."
        action={
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> New invoice
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Outstanding" value={usd.format(stats.outstanding)} accent hint="Sent + overdue" />
        <StatTile label="Overdue" value={usd.format(stats.overdue)} hint="Needs follow-up" />
        <StatTile label="Paid" value={usd.format(stats.paid)} />
        <StatTile label="Invoices" value={stats.count} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search invoices…" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {INVOICE_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{INVOICE_STATUS[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand-strong">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No invoices yet. Create your first invoice." : "No invoices match your filters."} />
      ) : view === "list" ? (
        <ListView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : (
        <KanbanView rows={filtered} onOpen={setDrawerId} onMove={move} />
      )}

      {/* Drawer */}
      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{drawer.number}</SheetTitle>
                <p className="text-2xl font-semibold text-foreground">{usd.format(drawer.amount)}</p>
              </SheetHeader>
              <div className="flex flex-wrap gap-2"><StatusBadge status={drawer.status} /></div>
              <div>
                <DetailField label="Client">{drawer.client}</DetailField>
                <DetailField label="Amount">{usd.format(drawer.amount)}</DetailField>
                <DetailField label="Issued">{fmtDate(drawer.issueDate)}</DetailField>
                <DetailField label="Due">{fmtDate(drawer.dueDate)}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
              </div>
              {drawer.description && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                  <p className="text-sm text-foreground">{drawer.description}</p>
                </div>
              )}
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Set status</p>
                <div className="flex flex-wrap gap-1.5">
                  {INVOICE_STATUS_ORDER.map((s) => (
                    <Button key={s} size="sm" variant={s === drawer.status ? "default" : "outline"} onClick={() => update(drawer.id, { status: s })}>
                      {INVOICE_STATUS[s].label}
                    </Button>
                  ))}
                </div>
              </div>
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
          <DialogHeader><DialogTitle>{editing?.isNew ? "New invoice" : "Edit invoice"}</DialogTitle></DialogHeader>
          {editing && <InvoiceForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.client.trim()}>{editing?.isNew ? "Create invoice" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete invoice?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Invoice &ldquo;{deleteItem?.number}&rdquo; will be removed. This can&apos;t be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type RowActionsFn = (i: Invoice) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

function ListView({ rows, onOpen, rowActions }: { rows: Invoice[]; onOpen: (id: string) => void; rowActions: RowActionsFn }) {
  return (
    <div className="space-y-2">
      {rows.map((i) => (
        <Card key={i.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(i.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{i.number}</p>
                <StatusBadge status={i.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{i.client} · due {fmtDate(i.dueDate)}</p>
            </div>
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">{usd.format(i.amount)}</span>
            <RowActions actions={rowActions(i)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ rows, onOpen, rowActions }: { rows: Invoice[]; onOpen: (id: string) => void; rowActions: RowActionsFn }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => (
              <TableRow key={i.id} className="cursor-pointer" onClick={() => onOpen(i.id)}>
                <TableCell className="font-medium text-foreground">{i.number}</TableCell>
                <TableCell className="text-muted-foreground">{i.client}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{usd.format(i.amount)}</TableCell>
                <TableCell><StatusBadge status={i.status} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(i.dueDate)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{i.owner}</TableCell>
                <TableCell><RowActions actions={rowActions(i)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function KanbanView({ rows, onOpen, onMove }: { rows: Invoice[]; onOpen: (id: string) => void; onMove: (i: Invoice, s: InvoiceStatus) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {INVOICE_STATUS_ORDER.map((status) => {
        const col = rows.filter((i) => i.status === status);
        const total = col.reduce((s, i) => s + i.amount, 0);
        const idx = INVOICE_STATUS_ORDER.indexOf(status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{usd.format(total)}</span>
            </div>
            <div className="space-y-2">
              {col.map((i) => (
                <div key={i.id} className="rounded-md border border-border bg-background p-2.5">
                  <button onClick={() => onOpen(i.id)} className="w-full text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{i.number}</p>
                      <span className="text-xs font-semibold text-foreground">{usd.format(i.amount)}</span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{i.client}</p>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    {idx > 0 && <button onClick={() => onMove(i, INVOICE_STATUS_ORDER[idx - 1])} className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground" title="Move back">‹</button>}
                    {idx < INVOICE_STATUS_ORDER.length - 1 && <button onClick={() => onMove(i, INVOICE_STATUS_ORDER[idx + 1])} className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground" title="Move forward">›</button>}
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

function InvoiceForm({ draft, onChange }: { draft: Invoice; onChange: (d: Invoice) => void }) {
  const set = <K extends keyof Invoice>(key: K, value: Invoice[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Invoice number">
          <Input value={draft.number} onChange={(e) => set("number", e.target.value)} placeholder="CC-1048" />
        </FormField>
        <FormField label="Client">
          <Input value={draft.client} onChange={(e) => set("client", e.target.value)} placeholder="Acme Co" />
        </FormField>
        <FormField label="Amount (USD)">
          <Input inputMode="numeric" value={String(draft.amount)} onChange={(e) => set("amount", e.target.value.trim() === "" ? 0 : Math.max(0, Number(e.target.value) || 0))} />
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as InvoiceStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{INVOICE_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{INVOICE_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Issue date">
          <Input type="date" value={draft.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
        </FormField>
        <FormField label="Due date">
          <Input type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </FormField>
        <FormField label="Owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
      </div>
      <FormField label="Description">
        <Textarea rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Line items / notes…" />
      </FormField>
    </div>
  );
}
