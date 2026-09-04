"use client";

import { useMemo, useState } from "react";
import { ExternalLink, LayoutGrid, List, MessageSquare, Pencil, Plus, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

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
import { CHANNEL, CHANNEL_ORDER, COMM_CATEGORIES, Channel, CommTemplate, TEMPLATE_STATUS, TEMPLATE_STATUS_ORDER, TemplateStatus, seedCommTemplates } from "@/lib/ops/communications";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "cards" | "kanban";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
];

const num = new Intl.NumberFormat("en-US");
const fmtDate = (iso: string | null) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never");

function ChannelBadge({ channel }: { channel: Channel }) {
  return <Badge className={cn("border-transparent", CHANNEL[channel].tone)}>{CHANNEL[channel].label}</Badge>;
}
function StatusBadge({ status }: { status: TemplateStatus }) {
  return <Badge className={cn("border-transparent", TEMPLATE_STATUS[status].tone)}>{TEMPLATE_STATUS[status].label}</Badge>;
}

function blank(): CommTemplate {
  return { id: genId("cm"), name: "", channel: "email", category: "Onboarding", subject: "", body: "", status: "draft", sends: 0, lastSent: null, owner: "Alex Rivera", createdAt: new Date().toISOString() };
}

type RowActionsFn = (t: CommTemplate) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

export function CommunicationsPage() {
  const { items, create, update, remove } = useCollection<CommTemplate>("comm_templates", seedCommTemplates);
  const [view, setView] = useState<View>("cards");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: CommTemplate; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<CommTemplate | null>(null);
  const { toast, flash } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((t) => {
      if (channelFilter !== "all" && t.channel !== channelFilter) return false;
      if (!q) return true;
      return [t.name, t.subject, t.category, t.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, channelFilter]);

  const stats = useMemo(() => {
    const active = items.filter((t) => t.status === "active").length;
    const sends = items.reduce((s, t) => s + t.sends, 0);
    const channels = new Set(items.map((t) => t.channel)).size;
    return { total: items.length, active, sends, channels };
  }, [items]);

  const drawer = items.find((t) => t.id === drawerId) || null;
  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (t: CommTemplate) => setEditing({ draft: { ...t }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Template created.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Template updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Template deleted.");
  }

  const rowActions: RowActionsFn = (t) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(t.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(t) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(t), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title="Communications"
        description="Message and notification templates across channels."
        action={<Button onClick={openNew} className="shrink-0"><Plus className="h-4 w-4" /> New template</Button>}
      />

      <StatRow>
        <StatTile label="Templates" value={stats.total} />
        <StatTile label="Active" value={stats.active} accent />
        <StatTile label="Channels" value={stats.channels} />
        <StatTile label="Total sends" value={num.format(stats.sends)} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search templates…" />
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as Channel | "all")}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {CHANNEL_ORDER.map((c) => <SelectItem key={c} value={c}>{CHANNEL[c].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Toast toast={toast} />
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No templates yet. Create your first message." : "No templates match your filters."} />
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
                <p className="text-sm text-muted-foreground">{drawer.category}</p>
              </SheetHeader>
              <div className="flex flex-wrap gap-2"><ChannelBadge channel={drawer.channel} /><StatusBadge status={drawer.status} /></div>
              {drawer.subject && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium text-foreground">{drawer.subject}</p>
                </div>
              )}
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Body</p>
                <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 font-sans text-sm text-foreground">{drawer.body}</pre>
              </div>
              <div>
                <DetailField label="Channel">{CHANNEL[drawer.channel].label}</DetailField>
                <DetailField label="Category">{drawer.category}</DetailField>
                <DetailField label="Total sends">{num.format(drawer.sends)}</DetailField>
                <DetailField label="Last sent">{fmtDate(drawer.lastSent)}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => openEdit(drawer)} className="flex-1"><Pencil className="h-4 w-4" /> Edit</Button>
                <Button variant="outline" onClick={() => setDeleteItem(drawer)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.isNew ? "New template" : "Edit template"}</DialogTitle></DialogHeader>
          {editing && <TemplateForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Create template" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete template?</DialogTitle></DialogHeader>
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

type ViewProps = { rows: CommTemplate[]; onOpen: (id: string) => void; rowActions: RowActionsFn };

function ListView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {rows.map((t) => (
        <Card key={t.id} className={cn("cursor-pointer transition-colors hover:border-brand/40", t.status === "archived" && "opacity-70")} onClick={() => onOpen(t.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                <ChannelBadge channel={t.channel} />
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.subject || t.body}</p>
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">{num.format(t.sends)} sends</span>
            <RowActions actions={rowActions(t)} />
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
              <TableHead>Template</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sends</TableHead>
              <TableHead>Last sent</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id} className={cn("cursor-pointer", t.status === "archived" && "opacity-70")} onClick={() => onOpen(t.id)}>
                <TableCell className="font-medium text-foreground">{t.name}</TableCell>
                <TableCell><ChannelBadge channel={t.channel} /></TableCell>
                <TableCell className="text-muted-foreground">{t.category}</TableCell>
                <TableCell><StatusBadge status={t.status} /></TableCell>
                <TableCell className="text-right text-foreground">{num.format(t.sends)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(t.lastSent)}</TableCell>
                <TableCell><RowActions actions={rowActions(t)} /></TableCell>
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
      {rows.map((t) => (
        <Card key={t.id} className={cn("cursor-pointer transition-colors hover:border-brand/40", t.status === "archived" && "opacity-70")} onClick={() => onOpen(t.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">{t.category}</p>
              </div>
              <RowActions actions={rowActions(t)} />
            </div>
            <div className="flex flex-wrap gap-2"><ChannelBadge channel={t.channel} /><StatusBadge status={t.status} /></div>
            <p className="line-clamp-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{t.subject || t.body}</p>
            <p className="text-[11px] text-muted-foreground">{num.format(t.sends)} sends · last {fmtDate(t.lastSent)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ rows, onOpen }: { rows: CommTemplate[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {CHANNEL_ORDER.map((channel) => {
        const col = rows.filter((t) => t.channel === channel);
        return (
          <div key={channel} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <ChannelBadge channel={channel} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((t) => (
                <button key={t.id} onClick={() => onOpen(t.id)} className={cn("w-full rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50", t.status === "archived" && "opacity-70")}>
                  <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{t.category} · {num.format(t.sends)} sends</p>
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

function TemplateForm({ draft, onChange }: { draft: CommTemplate; onChange: (d: CommTemplate) => void }) {
  const set = <K extends keyof CommTemplate>(key: K, value: CommTemplate[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Template name" className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Client welcome" />
        </FormField>
        <FormField label="Channel">
          <Select value={draft.channel} onValueChange={(v) => set("channel", v as Channel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CHANNEL_ORDER.map((c) => <SelectItem key={c} value={c}>{CHANNEL[c].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Category">
          <Select value={draft.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{COMM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as TemplateStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TEMPLATE_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{TEMPLATE_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
      </div>
      {draft.channel !== "sms" && (
        <FormField label="Subject">
          <Input value={draft.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Welcome to Channel Cast, {{client}}" />
        </FormField>
      )}
      <FormField label="Body">
        <Textarea rows={5} value={draft.body} onChange={(e) => set("body", e.target.value)} placeholder="Message body — use {{variables}} for merge fields…" />
      </FormField>
      <p className="text-xs text-muted-foreground">Use <code className="rounded bg-muted px-1">{"{{variables}}"}</code> like {"{{client}}"}, {"{{contact}}"}, {"{{amount}}"} for merge fields.</p>
    </div>
  );
}
