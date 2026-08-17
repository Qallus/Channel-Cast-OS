"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, CreditCard, ExternalLink, LayoutGrid, List, Pencil, Plus, Printer, SquareKanban, Table as TableIcon, Trash2, Upload } from "lucide-react";

import {
  DetailField, EmptyState, FormField, PageHeader, RecordCalendar, RowActions, SearchBox, StatRow, StatTile, ViewSwitcher,
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
import {
  CHANNEL_CAST_FROM, DEFAULT_LOGO, INVOICE_STATUS, INVOICE_STATUS_ORDER, Invoice, InvoiceStatus, LineItem,
  invoiceSubtotal, invoiceTotal, lineAmount, seedInvoices,
} from "@/lib/ops/invoices";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "card" | "kanban" | "calendar";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "card" as const, label: "Cards", icon: LayoutGrid },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

// Self-contained, fully inline-styled invoice HTML for printing. Rendered into a
// fresh window so the print never fights the dialog's transform/overflow clipping.
function invoiceHtml(inv: Invoice): string {
  const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sub = invoiceSubtotal(inv);
  const tax = sub * ((inv.taxRate || 0) / 100);
  const total = invoiceTotal(inv);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const raw = inv.logoUrl || DEFAULT_LOGO;
  const logo = raw.startsWith("/") ? origin + raw : raw;
  const rows = (inv.lineItems ?? []).map((li) =>
    `<tr style="border-bottom:1px solid #eef2e9"><td style="padding:8px 0">${esc(li.description || "—")}</td><td style="padding:8px 0;text-align:right">${li.qty}</td><td style="padding:8px 0;text-align:right">${usd.format(li.rate)}</td><td style="padding:8px 0;text-align:right;font-weight:600">${usd.format(lineAmount(li))}</td></tr>`).join("");
  return `<div style="max-width:720px;margin:0 auto;color:#14241a;font-size:14px;line-height:1.5">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="${esc(logo)}" alt="" style="height:48px;width:48px;object-fit:contain"/>
      <div><div style="font-size:18px;font-weight:700">${esc(inv.from?.name || "Channel Cast")}</div>
      <div style="font-size:12px;color:#5b6b5b">${[inv.from?.email, inv.from?.phone].filter(Boolean).map(esc).join(" · ")}</div>
      ${inv.from?.address ? `<div style="font-size:12px;color:#5b6b5b">${esc(inv.from.address)}</div>` : ""}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:800">INVOICE</div>
      <div style="font-size:13px;color:#5b6b5b">${esc(inv.number)}</div>
      <div style="font-size:12px;color:#5b6b5b;margin-top:4px">Issued ${fmtDate(inv.issueDate)}</div>
      <div style="font-size:12px;color:#5b6b5b">Due ${fmtDate(inv.dueDate)}</div>
    </div>
  </div>
  <div style="margin-top:24px">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#8a998a">Bill to</div>
    <div style="font-weight:600">${esc(inv.billTo?.name || inv.client)}</div>
    ${inv.billTo?.company ? `<div>${esc(inv.billTo.company)}</div>` : ""}
    ${inv.billTo?.email ? `<div style="font-size:12px;color:#5b6b5b">${esc(inv.billTo.email)}</div>` : ""}
    ${inv.billTo?.address ? `<div style="font-size:12px;color:#5b6b5b;white-space:pre-wrap">${esc(inv.billTo.address)}</div>` : ""}
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px">
    <thead><tr style="border-bottom:1px solid #dde5d3;text-align:left;font-size:11px;text-transform:uppercase;color:#8a998a">
      <th style="padding:8px 0">Description</th><th style="padding:8px 0;text-align:right">Qty</th><th style="padding:8px 0;text-align:right">Rate</th><th style="padding:8px 0;text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:16px;margin-left:auto;max-width:280px;font-size:14px">
    <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#5b6b5b">Subtotal</span><span>${usd.format(sub)}</span></div>
    ${(inv.taxRate || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#5b6b5b">Tax (${inv.taxRate}%)</span><span>${usd.format(tax)}</span></div>` : ""}
    ${(inv.discount || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#5b6b5b">Discount</span><span>−${usd.format(inv.discount || 0)}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;padding:6px 0 0;border-top:1px solid #dde5d3;font-weight:700;font-size:16px"><span>Total</span><span>${usd.format(total)}</span></div>
  </div>
  ${(inv.notes || inv.terms) ? `<div style="margin-top:24px;border-top:1px solid #dde5d3;padding-top:12px;font-size:12px;color:#5b6b5b">${inv.notes ? `<div><b style="color:#14241a">Notes:</b> ${esc(inv.notes)}</div>` : ""}${inv.terms ? `<div style="margin-top:4px"><b style="color:#14241a">Terms:</b> ${esc(inv.terms)}</div>` : ""}</div>` : ""}
</div>`;
}

function printInvoice(inv: Invoice) {
  const win = window.open("", "_blank", "width=820,height=1040");
  if (!win) { alert("Please allow pop-ups to print the invoice."); return; }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${inv.number}</title><style>@page{margin:16mm}html,body{margin:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14241a;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:8px}</style><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></head><body>${invoiceHtml(inv)}</body></html>`);
  win.document.close();
  win.focus();
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge className={cn("border-transparent", INVOICE_STATUS[status].tone)}>{INVOICE_STATUS[status].label}</Badge>;
}

function blank(): Invoice {
  const today = new Date();
  return {
    id: genId("inv"), number: `CC-${1048 + Math.floor(Math.random() * 900)}`, client: "", amount: 0, status: "draft",
    issueDate: today.toISOString().slice(0, 10), dueDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    description: "", owner: "Alex Rivera", createdAt: today.toISOString(),
    logoUrl: DEFAULT_LOGO, from: { ...CHANNEL_CAST_FROM }, billTo: { name: "", company: "", email: "", address: "" },
    lineItems: [{ id: genId("li"), description: "", qty: 1, rate: 0 }], taxRate: 0, discount: 0, notes: "", terms: "Payment due within 14 days.",
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
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      return [i.number, i.client, i.billTo?.name, i.description, i.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const outstanding = items.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + invoiceTotal(i), 0);
    const overdue = items.filter((i) => i.status === "overdue").reduce((s, i) => s + invoiceTotal(i), 0);
    const paid = items.filter((i) => i.status === "paid").reduce((s, i) => s + invoiceTotal(i), 0);
    return { outstanding, overdue, paid, count: items.length };
  }, [items]);

  const drawer = items.find((i) => i.id === drawerId) || null;
  const preview = items.find((i) => i.id === previewId) || null;

  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (i: Invoice) => setEditing({ draft: { ...blank(), ...i }, isNew: false });
  function saveDraft() {
    if (!editing) return;
    const d = editing.draft;
    const draft: Invoice = { ...d, amount: invoiceTotal(d), client: d.billTo?.name || d.client };
    if (!draft.client.trim()) return;
    if (editing.isNew) { create(draft); flash("Invoice created."); }
    else { update(draft.id, draft); flash("Invoice updated."); }
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
    { label: "Preview", icon: Printer, onClick: () => setPreviewId(i.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(i) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(i), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={CreditCard} title="Billing" description="Invoices, subscriptions, and payments."
        action={<Button onClick={openNew} className="shrink-0"><Plus className="h-4 w-4" /> New invoice</Button>} />

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
      ) : view === "card" ? (
        <CardsView rows={filtered} onOpen={setDrawerId} onPreview={setPreviewId} />
      ) : view === "kanban" ? (
        <KanbanView rows={filtered} onOpen={setDrawerId} onMove={move} />
      ) : (
        <RecordCalendar items={filtered} getId={(i) => i.id} getDate={(i) => i.dueDate} getTitle={(i) => `${i.number} · ${usd.format(invoiceTotal(i))}`} onOpen={setDrawerId} footer="Placed by due date. Click one to open." />
      )}

      {/* Drawer */}
      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{drawer.number}</SheetTitle>
                <p className="text-2xl font-semibold text-foreground">{usd.format(invoiceTotal(drawer))}</p>
              </SheetHeader>
              <div className="flex flex-wrap gap-2"><StatusBadge status={drawer.status} /></div>
              <div>
                <DetailField label="Bill to">{drawer.billTo?.name || drawer.client}</DetailField>
                <DetailField label="Total">{usd.format(invoiceTotal(drawer))}</DetailField>
                <DetailField label="Issued">{fmtDate(drawer.issueDate)}</DetailField>
                <DetailField label="Due">{fmtDate(drawer.dueDate)}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
              </div>
              {(drawer.lineItems?.length ?? 0) > 0 && (
                <div className="rounded-lg border border-border">
                  {drawer.lineItems!.map((li) => (
                    <div key={li.id} className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm last:border-0">
                      <span className="min-w-0 truncate text-foreground">{li.description || "—"}</span>
                      <span className="shrink-0 text-muted-foreground">{li.qty} × {usd.format(li.rate)} = <span className="font-medium text-foreground">{usd.format(lineAmount(li))}</span></span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Set status</p>
                <div className="flex flex-wrap gap-1.5">
                  {INVOICE_STATUS_ORDER.map((s) => (
                    <Button key={s} size="sm" variant={s === drawer.status ? "default" : "outline"} onClick={() => update(drawer.id, { status: s })}>{INVOICE_STATUS[s].label}</Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => { setDrawerId(null); setPreviewId(drawer.id); }} className="flex-1"><Printer className="h-4 w-4" /> Preview / Print</Button>
                <Button variant="outline" onClick={() => openEdit(drawer)}><Pencil className="h-4 w-4" /> Edit</Button>
                <Button variant="outline" onClick={() => setDeleteItem(drawer)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Editor */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.isNew ? "New invoice" : "Edit invoice"}</DialogTitle></DialogHeader>
          {editing && <InvoiceEditor draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!(editing?.draft.billTo?.name || editing?.draft.client)?.trim()}>{editing?.isNew ? "Create invoice" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview / print */}
      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader className="flex-row items-center justify-between gap-2 pr-8">
            <DialogTitle>Invoice preview</DialogTitle>
            <Button size="sm" onClick={() => preview && printInvoice(preview)}><Printer className="h-4 w-4" /> Print / Save PDF</Button>
          </DialogHeader>
          {preview && <InvoicePreview inv={preview} />}
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
              <div className="flex items-center gap-2"><p className="text-sm font-medium text-foreground">{i.number}</p><StatusBadge status={i.status} /></div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{i.billTo?.name || i.client} · due {fmtDate(i.dueDate)}</p>
            </div>
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">{usd.format(invoiceTotal(i))}</span>
            <RowActions actions={rowActions(i)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ rows, onOpen, rowActions }: { rows: Invoice[]; onOpen: (id: string) => void; rowActions: RowActionsFn }) {
  return (
    <Card><CardContent className="pt-4">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Invoice</TableHead><TableHead>Bill to</TableHead><TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead>Owner</TableHead><TableHead className="w-10" />
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((i) => (
            <TableRow key={i.id} className="cursor-pointer" onClick={() => onOpen(i.id)}>
              <TableCell className="font-medium text-foreground">{i.number}</TableCell>
              <TableCell className="text-muted-foreground">{i.billTo?.name || i.client}</TableCell>
              <TableCell className="text-right font-medium text-foreground">{usd.format(invoiceTotal(i))}</TableCell>
              <TableCell><StatusBadge status={i.status} /></TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(i.dueDate)}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{i.owner}</TableCell>
              <TableCell><RowActions actions={rowActions(i)} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function CardsView({ rows, onOpen, onPreview }: { rows: Invoice[]; onOpen: (id: string) => void; onPreview: (id: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((i) => (
        <div key={i.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div><p className="text-sm font-semibold text-foreground">{i.number}</p><p className="text-xs text-muted-foreground">{i.billTo?.name || i.client}</p></div>
            <StatusBadge status={i.status} />
          </div>
          <p className="mt-3 text-2xl font-semibold text-foreground">{usd.format(invoiceTotal(i))}</p>
          <p className="text-xs text-muted-foreground">Issued {fmtDate(i.issueDate)} · due {fmtDate(i.dueDate)}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onOpen(i.id)}>Open</Button>
            <Button size="sm" variant="outline" onClick={() => onPreview(i.id)}><Printer className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanView({ rows, onOpen, onMove }: { rows: Invoice[]; onOpen: (id: string) => void; onMove: (i: Invoice, s: InvoiceStatus) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {INVOICE_STATUS_ORDER.map((status) => {
        const col = rows.filter((i) => i.status === status);
        const total = col.reduce((s, i) => s + invoiceTotal(i), 0);
        const idx = INVOICE_STATUS_ORDER.indexOf(status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1"><StatusBadge status={status} /><span className="text-xs text-muted-foreground">{usd.format(total)}</span></div>
            <div className="space-y-2">
              {col.map((i) => (
                <div key={i.id} className="rounded-md border border-border bg-background p-2.5">
                  <button onClick={() => onOpen(i.id)} className="w-full text-left">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium text-foreground">{i.number}</p><span className="text-xs font-semibold text-foreground">{usd.format(invoiceTotal(i))}</span></div>
                    <p className="truncate text-[11px] text-muted-foreground">{i.billTo?.name || i.client}</p>
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

// ── Robust editor ─────────────────────────────────────────────────────────────
function InvoiceEditor({ draft, onChange }: { draft: Invoice; onChange: (d: Invoice) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Invoice>(key: K, value: Invoice[K]) => onChange({ ...draft, [key]: value });
  const setFrom = (patch: Partial<NonNullable<Invoice["from"]>>) => onChange({ ...draft, from: { ...(draft.from ?? { name: "" }), ...patch } });
  const setBill = (patch: Partial<NonNullable<Invoice["billTo"]>>) => onChange({ ...draft, billTo: { ...(draft.billTo ?? { name: "" }), ...patch } });
  const items = draft.lineItems ?? [];
  const setItem = (id: string, patch: Partial<LineItem>) => set("lineItems", items.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  const addItem = () => set("lineItems", [...items, { id: genId("li"), description: "", qty: 1, rate: 0 }]);
  const removeItem = (id: string) => set("lineItems", items.filter((li) => li.id !== id));

  async function onLogo(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "invoices");
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) set("logoUrl", d.url);
    } finally { setUploading(false); }
  }

  const sub = invoiceSubtotal(draft);
  const tax = sub * ((draft.taxRate || 0) / 100);
  const total = invoiceTotal(draft);

  return (
    <div className="space-y-5">
      {/* Letterhead */}
      <section className="rounded-xl border border-border p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Letterhead / From</p>
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.logoUrl || DEFAULT_LOGO} alt="Logo" className="h-12 w-12 rounded-lg border border-border object-contain p-1" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); e.target.value = ""; }} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload logo"}</Button>
          <Button size="sm" variant="ghost" onClick={() => { set("logoUrl", DEFAULT_LOGO); onChange({ ...draft, logoUrl: DEFAULT_LOGO, from: { ...CHANNEL_CAST_FROM } }); }}>Use Channel Cast default</Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <FormField label="Business name"><Input value={draft.from?.name ?? ""} onChange={(e) => setFrom({ name: e.target.value })} /></FormField>
          <FormField label="Email"><Input value={draft.from?.email ?? ""} onChange={(e) => setFrom({ email: e.target.value })} /></FormField>
          <FormField label="Phone"><Input value={draft.from?.phone ?? ""} onChange={(e) => setFrom({ phone: e.target.value })} /></FormField>
          <FormField label="Address"><Input value={draft.from?.address ?? ""} onChange={(e) => setFrom({ address: e.target.value })} /></FormField>
        </div>
      </section>

      {/* Bill to + meta */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill to</p>
          <div className="space-y-3">
            <FormField label="Name"><Input value={draft.billTo?.name ?? ""} onChange={(e) => setBill({ name: e.target.value })} placeholder="Client name" /></FormField>
            <FormField label="Company"><Input value={draft.billTo?.company ?? ""} onChange={(e) => setBill({ company: e.target.value })} /></FormField>
            <FormField label="Email"><Input value={draft.billTo?.email ?? ""} onChange={(e) => setBill({ email: e.target.value })} /></FormField>
            <FormField label="Address"><Textarea rows={2} value={draft.billTo?.address ?? ""} onChange={(e) => setBill({ address: e.target.value })} /></FormField>
          </div>
        </section>
        <section className="rounded-xl border border-border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Invoice #"><Input value={draft.number} onChange={(e) => set("number", e.target.value)} /></FormField>
            <FormField label="Status">
              <Select value={draft.status} onValueChange={(v) => set("status", v as InvoiceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INVOICE_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{INVOICE_STATUS[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Issue date"><DatePicker value={draft.issueDate} onChange={(v) => set("issueDate", v)} /></FormField>
            <FormField label="Due date"><DatePicker value={draft.dueDate} onChange={(v) => set("dueDate", v)} /></FormField>
            <FormField label="Owner"><Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} /></FormField>
          </div>
        </section>
      </div>

      {/* Line items */}
      <section className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line items</p><Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5" /> Add item</Button></div>
        <div className="space-y-2">
          {items.map((li) => (
            <div key={li.id} className="grid grid-cols-[1fr_64px_90px_90px_32px] items-center gap-2">
              <Input value={li.description} onChange={(e) => setItem(li.id, { description: e.target.value })} placeholder="Description" />
              <Input type="number" min={0} value={li.qty} onChange={(e) => setItem(li.id, { qty: Number(e.target.value) || 0 })} placeholder="Qty" />
              <Input type="number" min={0} step="0.01" value={li.rate} onChange={(e) => setItem(li.id, { rate: Number(e.target.value) || 0 })} placeholder="Rate" />
              <span className="text-right text-sm font-medium text-foreground">{usd.format(lineAmount(li))}</span>
              <button onClick={() => removeItem(li.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No line items yet.</p>}
        </div>
        {/* Totals */}
        <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{usd.format(sub)}</span></div>
          <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Tax %</span><Input type="number" min={0} step="0.1" value={draft.taxRate ?? 0} onChange={(e) => set("taxRate", Number(e.target.value) || 0)} className="h-8 w-20 text-right" /></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="text-foreground">{usd.format(tax)}</span></div>
          <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Discount</span><Input type="number" min={0} step="0.01" value={draft.discount ?? 0} onChange={(e) => set("discount", Number(e.target.value) || 0)} className="h-8 w-24 text-right" /></div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><span>Total</span><span>{usd.format(total)}</span></div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Notes"><Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Thanks for your business!" /></FormField>
        <FormField label="Terms"><Textarea rows={2} value={draft.terms ?? ""} onChange={(e) => set("terms", e.target.value)} /></FormField>
      </div>
    </div>
  );
}

// ── Printable preview ─────────────────────────────────────────────────────────
function InvoicePreview({ inv }: { inv: Invoice }) {
  const sub = invoiceSubtotal(inv);
  const tax = sub * ((inv.taxRate || 0) / 100);
  const total = invoiceTotal(inv);
  const items = inv.lineItems ?? [];
  return (
    <div className="cc-print-area rounded-xl border border-border bg-white p-8 text-[#14241a]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={inv.logoUrl || DEFAULT_LOGO} alt="" className="h-12 w-12 object-contain" />
          <div>
            <p className="text-lg font-bold">{inv.from?.name || "Channel Cast"}</p>
            <p className="text-xs text-[#5b6b5b]">{[inv.from?.email, inv.from?.phone].filter(Boolean).join(" · ")}</p>
            {inv.from?.address && <p className="text-xs text-[#5b6b5b]">{inv.from.address}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">INVOICE</p>
          <p className="text-sm text-[#5b6b5b]">{inv.number}</p>
          <p className="mt-1 text-xs text-[#5b6b5b]">Issued {fmtDate(inv.issueDate)}</p>
          <p className="text-xs text-[#5b6b5b]">Due {fmtDate(inv.dueDate)}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a998a]">Bill to</p>
        <p className="text-sm font-medium">{inv.billTo?.name || inv.client}</p>
        {inv.billTo?.company && <p className="text-sm">{inv.billTo.company}</p>}
        {inv.billTo?.email && <p className="text-xs text-[#5b6b5b]">{inv.billTo.email}</p>}
        {inv.billTo?.address && <p className="whitespace-pre-wrap text-xs text-[#5b6b5b]">{inv.billTo.address}</p>}
      </div>

      <table className="mt-6 w-full text-sm">
        <thead><tr className="border-b border-[#dde5d3] text-left text-[11px] uppercase text-[#8a998a]"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Amount</th></tr></thead>
        <tbody>
          {items.map((li) => (
            <tr key={li.id} className="border-b border-[#eef2e9]"><td className="py-2">{li.description || "—"}</td><td className="py-2 text-right">{li.qty}</td><td className="py-2 text-right">{usd.format(li.rate)}</td><td className="py-2 text-right font-medium">{usd.format(lineAmount(li))}</td></tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-[#5b6b5b]">Subtotal</span><span>{usd.format(sub)}</span></div>
        {(inv.taxRate || 0) > 0 && <div className="flex justify-between"><span className="text-[#5b6b5b]">Tax ({inv.taxRate}%)</span><span>{usd.format(tax)}</span></div>}
        {(inv.discount || 0) > 0 && <div className="flex justify-between"><span className="text-[#5b6b5b]">Discount</span><span>−{usd.format(inv.discount || 0)}</span></div>}
        <div className="flex justify-between border-t border-[#dde5d3] pt-1.5 text-base font-bold"><span>Total</span><span>{usd.format(total)}</span></div>
      </div>

      {(inv.notes || inv.terms) && (
        <div className="mt-6 border-t border-[#dde5d3] pt-3 text-xs text-[#5b6b5b]">
          {inv.notes && <p><span className="font-semibold text-[#14241a]">Notes: </span>{inv.notes}</p>}
          {inv.terms && <p className="mt-1"><span className="font-semibold text-[#14241a]">Terms: </span>{inv.terms}</p>}
        </div>
      )}
    </div>
  );
}
