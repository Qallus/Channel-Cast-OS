"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileText, LayoutGrid, List, Pencil, Plus, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

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
import { DOC_STATUS, DOC_STATUS_ORDER, DOC_TYPES, DocStatus, DocType, Document, seedDocuments } from "@/lib/ops/documents";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "cards" | "kanban";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtSize = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

function StatusBadge({ status }: { status: DocStatus }) {
  return <Badge className={cn("border-transparent", DOC_STATUS[status].tone)}>{DOC_STATUS[status].label}</Badge>;
}

function blank(): Document {
  return { id: genId("doc"), name: "", type: "Contract", relatedTo: "", status: "draft", owner: "Alex Rivera", sizeKb: 0, notes: "", createdAt: new Date().toISOString() };
}

type RowActionsFn = (d: Document) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

export function DocumentsPage() {
  const { items, create, update, remove } = useCollection<Document>("documents", seedDocuments);
  const [view, setView] = useState<View>("list");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocType | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Document; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Document | null>(null);
  const { toast, flash } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (!q) return true;
      return [d.name, d.relatedTo, d.type, d.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, typeFilter]);

  const stats = useMemo(() => {
    const signed = items.filter((d) => d.status === "signed").length;
    const pending = items.filter((d) => d.status === "sent").length;
    const drafts = items.filter((d) => d.status === "draft").length;
    return { total: items.length, signed, pending, drafts };
  }, [items]);

  const drawer = items.find((d) => d.id === drawerId) || null;
  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (d: Document) => setEditing({ draft: { ...d }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Document added.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Document updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Document deleted.");
  }

  const rowActions: RowActionsFn = (d) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(d.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(d) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(d), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Documents"
        description="Contracts, agreements, and shared files."
        action={<Button onClick={openNew} className="shrink-0"><Plus className="h-4 w-4" /> Upload document</Button>}
      />

      <StatRow>
        <StatTile label="Documents" value={stats.total} />
        <StatTile label="Signed" value={stats.signed} accent />
        <StatTile label="Awaiting signature" value={stats.pending} />
        <StatTile label="Drafts" value={stats.drafts} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search documents…" />
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocType | "all")}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Toast toast={toast} />
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No documents yet." : "No documents match your filters."} />
      ) : view === "list" ? (
        <ListView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView rows={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : (
        <KanbanView rows={filtered} onOpen={setDrawerId} />
      )}

      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{drawer.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{drawer.type} · {drawer.relatedTo}</p>
              </SheetHeader>
              <div className="flex flex-wrap gap-2"><StatusBadge status={drawer.status} /><Badge variant="outline">{drawer.type}</Badge></div>
              <div>
                <DetailField label="Related to">{drawer.relatedTo}</DetailField>
                <DetailField label="Type">{drawer.type}</DetailField>
                <DetailField label="Size">{fmtSize(drawer.sizeKb)}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
                <DetailField label="Created">{fmtDate(drawer.createdAt)}</DetailField>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Set status</p>
                <div className="flex flex-wrap gap-1.5">
                  {DOC_STATUS_ORDER.map((s) => (
                    <Button key={s} size="sm" variant={s === drawer.status ? "default" : "outline"} onClick={() => update(drawer.id, { status: s })}>{DOC_STATUS[s].label}</Button>
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
          <DialogHeader><DialogTitle>{editing?.isNew ? "Upload document" : "Edit document"}</DialogTitle></DialogHeader>
          {editing && <DocForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Add document" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete document?</DialogTitle></DialogHeader>
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

type ViewProps = { rows: Document[]; onOpen: (id: string) => void; rowActions: RowActionsFn };

function ListView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {rows.map((d) => (
        <Card key={d.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(d.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                <StatusBadge status={d.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.type} · {d.relatedTo} · {fmtSize(d.sizeKb)}</p>
            </div>
            <RowActions actions={rowActions(d)} />
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
              <TableHead>Document</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Related to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id} className="cursor-pointer" onClick={() => onOpen(d.id)}>
                <TableCell className="max-w-[280px] truncate font-medium text-foreground">{d.name}</TableCell>
                <TableCell className="text-muted-foreground">{d.type}</TableCell>
                <TableCell className="text-muted-foreground">{d.relatedTo}</TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
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

function CardsView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((d) => (
        <Card key={d.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(d.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <p className="min-w-0 truncate font-medium text-foreground">{d.name}</p>
              </div>
              <RowActions actions={rowActions(d)} />
            </div>
            <div className="flex flex-wrap gap-2"><StatusBadge status={d.status} /><Badge variant="outline">{d.type}</Badge></div>
            <p className="text-xs text-muted-foreground">{d.relatedTo} · {fmtSize(d.sizeKb)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ rows, onOpen }: { rows: Document[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {DOC_STATUS_ORDER.map((status) => {
        const col = rows.filter((d) => d.status === status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((d) => (
                <button key={d.id} onClick={() => onOpen(d.id)} className="flex w-full items-start gap-2 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{d.relatedTo}</p>
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

function DocForm({ draft, onChange }: { draft: Document; onChange: (d: Document) => void }) {
  const set = <K extends keyof Document>(key: K, value: Document[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <FormField label="Document name">
        <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme — Master Service Agreement" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Type">
          <Select value={draft.type} onValueChange={(v) => set("type", v as DocType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as DocStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{DOC_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Related to">
          <Input value={draft.relatedTo} onChange={(e) => set("relatedTo", e.target.value)} placeholder="Acme Co" />
        </FormField>
        <FormField label="Owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
        <FormField label="Size (KB)">
          <Input inputMode="numeric" value={String(draft.sizeKb)} onChange={(e) => set("sizeKb", e.target.value.trim() === "" ? 0 : Math.max(0, Number(e.target.value) || 0))} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Context, e-sign status…" />
      </FormField>
    </div>
  );
}
