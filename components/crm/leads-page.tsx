"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CalendarDays, ExternalLink, LayoutGrid, List, Pencil, Plus, SquareKanban, Table as TableIcon, Trash2, UserPlus } from "lucide-react";

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
import { Toast, useToast } from "@/components/ui/toast";
import { LEAD_SOURCES, LEAD_STATUS, LEAD_STATUS_ORDER, Lead, LeadStatus, LeadView, phoneKey, seedLeads, toLeadView } from "@/lib/crm/leads";
import { Contact, seedContacts } from "@/lib/crm/contacts";
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

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function StageBadge({ stage }: { stage: LeadStatus }) {
  const s = LEAD_STATUS[stage] ?? LEAD_STATUS.new;
  return <Badge className={cn("border-transparent", s.tone)}>{s.label}</Badge>;
}

function blankLead(): LeadView {
  return {
    id: genId("ld"), contactId: null, status: "new", source: "Website", value: 0,
    owner: "Alex Rivera", notes: "", opportunityId: null, createdAt: new Date().toISOString(),
    name: "", company: "", title: "", email: "", phone: "", linked: false,
  };
}

export function LeadsPage() {
  const router = useRouter();
  const { items: rawLeads, create, update, remove } = useCollection<Lead>("leads", seedLeads);
  const contactsCol = useCollection<Contact>("contacts", seedContacts);

  // Identity is joined in at read time so a lead and its contact can never drift
  // into two different people.
  const items = useMemo(() => {
    const byId = new Map(contactsCol.items.map((c) => [c.id, c]));
    return rawLeads.map((l) => toLeadView(l, l.contactId ? byId.get(l.contactId) : null));
  }, [rawLeads, contactsCol.items]);
  const [view, setView] = useState<View>("kanban");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: LeadView; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<LeadView | null>(null);
  const { toast, flash } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((l) => {
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (!q) return true;
      return [l.name, l.company, l.title, l.owner, l.source].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, sourceFilter]);

  const stats = useMemo(() => {
    const open = items.filter((l) => LEAD_STATUS[l.status]?.open);
    const qualified = items.filter((l) => l.status === "qualified").length;
    const pipeline = open.reduce((s, l) => s + (l.value || 0), 0);
    return { total: items.length, new: items.filter((l) => l.status === "new").length, qualified, pipeline };
  }, [items]);

  const drawer = items.find((l) => l.id === drawerId) || null;

  const openNew = () => setEditing({ draft: blankLead(), isNew: true });
  const openEdit = (l: LeadView) => setEditing({ draft: { ...l }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    const d = editing.draft;

    // The person is written to contacts, matched on email/phone first so editing
    // a lead never creates a second copy of someone already in the CRM.
    const match =
      (d.contactId ? contactsCol.items.find((c) => c.id === d.contactId) : undefined) ||
      contactsCol.items.find(
        (c) =>
          (d.email !== "" && (c.email || "").toLowerCase() === d.email.toLowerCase()) ||
          (d.phone !== "" && phoneKey(c.phone) !== "" && phoneKey(c.phone) === phoneKey(d.phone)),
      );

    let contactId: string;
    if (match) {
      contactId = match.id;
      contactsCol.update(match.id, {
        ...match,
        name: d.name || match.name,
        company: d.company || match.company,
        title: d.title || match.title,
        email: d.email || match.email,
        phone: d.phone || match.phone,
      });
    } else {
      contactId = genId("ct");
      contactsCol.create({
        id: contactId,
        name: d.name,
        firstName: d.name.split(" ")[0] || "",
        lastName: d.name.split(" ").slice(1).join(" "),
        title: d.title,
        company: d.company,
        type: "lead",
        status: "active",
        email: d.email,
        phone: d.phone,
        city: "",
        state: "",
        source: d.source,
        owner: d.owner,
        tags: [],
        notes: "",
        lastContact: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      });
    }

    const lead: Lead = {
      id: d.id, contactId, status: d.status, source: d.source, campaign: d.campaign,
      interest: d.interest, kind: d.kind, subject: d.subject, message: d.message, meta: d.meta,
      value: d.value, owner: d.owner, notes: d.notes, opportunityId: d.opportunityId || null,
      createdAt: d.createdAt,
      capturedName: d.name || undefined, capturedEmail: d.email || undefined,
      capturedPhone: d.phone || undefined, capturedCompany: d.company || undefined,
    };
    if (editing.isNew) { create(lead); flash("Lead added."); }
    else { update(lead.id, lead); flash("Lead updated."); }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Lead deleted.");
  }
  const move = (l: LeadView, status: LeadStatus) => update(l.id, { status });

  const rowActions = (l: LeadView) => [
    ...(l.opportunityId
      ? [{ label: "Open opportunity", icon: Briefcase, onClick: () => router.push(`/app/admin/pipeline/${l.opportunityId}`) }]
      : []),
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(l.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(l) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(l), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserPlus}
        title="Leads"
        description="Inbound and sourced prospects moving toward qualification."
        action={
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> Add lead
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Total leads" value={stats.total} />
        <StatTile label="New" value={stats.new} accent />
        <StatTile label="Qualified" value={stats.qualified} />
        <StatTile label="Open pipeline" value={usd.format(stats.pipeline)} hint="Estimated value" />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search leads…" />
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Toast toast={toast} />
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No leads yet. Add your first prospect." : "No leads match your filters."} />
      ) : view === "kanban" ? (
        <KanbanView leads={filtered} onOpen={setDrawerId} onMove={move} />
      ) : view === "list" ? (
        <ListView leads={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView leads={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView leads={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : (
        <RecordCalendar items={filtered} getId={(l) => l.id} getDate={(l) => l.createdAt} getTitle={(l) => `${l.name} · ${l.company}`} onOpen={setDrawerId} footer="Leads placed by date added. Click one to open." />
      )}

      {/* Drawer */}
      <Sheet open={Boolean(drawer)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawer && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={drawer.name} className="h-12 w-12 text-sm" />
                  <div>
                    <SheetTitle>{drawer.name}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{drawer.title} · {drawer.company}</p>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <StageBadge stage={drawer.status} />
                <Badge variant="outline">{drawer.source}</Badge>
                <span className="text-sm font-semibold text-foreground">{usd.format(drawer.value)}</span>
              </div>
              <div>
                <DetailField label="Company">{drawer.company}</DetailField>
                <DetailField label="Email">{drawer.email ? <a href={`mailto:${drawer.email}`} className="text-brand-strong hover:underline">{drawer.email}</a> : ""}</DetailField>
                <DetailField label="Phone">{drawer.phone}</DetailField>
                <DetailField label="Source">{drawer.source}</DetailField>
                <DetailField label="Est. value">{usd.format(drawer.value)}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
                <DetailField label="Added">{new Date(drawer.createdAt).toLocaleDateString()}</DetailField>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Move to stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {LEAD_STATUS_ORDER.map((s) => (
                    <Button key={s} size="sm" variant={s === drawer.status ? "default" : "outline"} onClick={() => update(drawer.id, { status: s })}>
                      {LEAD_STATUS[s].label}
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
                {drawer.opportunityId && (
                  <Button onClick={() => router.push(`/app/admin/pipeline/${drawer.opportunityId}`)} className="flex-1">
                    <Briefcase className="h-4 w-4" /> Open opportunity
                  </Button>
                )}
                <Button variant={drawer.opportunityId ? "outline" : "default"} onClick={() => openEdit(drawer)} className={drawer.opportunityId ? "" : "flex-1"}><Pencil className="h-4 w-4" /> Edit</Button>
                <Button variant="outline" onClick={() => setDeleteItem(drawer)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.isNew ? "Add lead" : "Edit lead"}</DialogTitle></DialogHeader>
          {editing && <LeadForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Add lead" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete lead?</DialogTitle></DialogHeader>
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

function KanbanView({ leads, onOpen, onMove }: { leads: LeadView[]; onOpen: (id: string) => void; onMove: (l: LeadView, s: LeadStatus) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {LEAD_STATUS_ORDER.map((stage) => {
        const col = leads.filter((l) => l.status === stage);
        const total = col.reduce((s, l) => s + l.value, 0);
        return (
          <div key={stage} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StageBadge stage={stage} />
              <span className="text-xs text-muted-foreground">{col.length} · {usd.format(total)}</span>
            </div>
            <div className="space-y-2">
              {col.map((l) => (
                <div key={l.id} className="rounded-md border border-border bg-background p-2.5">
                  <button onClick={() => onOpen(l.id)} className="flex w-full items-center gap-2 text-left">
                    <Avatar name={l.name} className="h-8 w-8" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{l.company} · {usd.format(l.value)}</p>
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{l.source}</Badge>
                    <div className="flex gap-1">
                      {LEAD_STATUS_ORDER.indexOf(stage) > 0 && (
                        <button onClick={() => onMove(l, LEAD_STATUS_ORDER[LEAD_STATUS_ORDER.indexOf(stage) - 1])} className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground" title="Move back">‹</button>
                      )}
                      {LEAD_STATUS_ORDER.indexOf(stage) < LEAD_STATUS_ORDER.length - 1 && (
                        <button onClick={() => onMove(l, LEAD_STATUS_ORDER[LEAD_STATUS_ORDER.indexOf(stage) + 1])} className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground" title="Move forward">›</button>
                      )}
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

type LeadRowActions = (l: LeadView) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

function ListView({ leads, onOpen, rowActions }: { leads: LeadView[]; onOpen: (id: string) => void; rowActions: LeadRowActions }) {
  return (
    <div className="space-y-2">
      {leads.map((l) => (
        <Card key={l.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(l.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <Avatar name={l.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
                <StageBadge stage={l.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{l.company} · {l.source}</p>
            </div>
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">{usd.format(l.value)}</span>
            <RowActions actions={rowActions(l)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CardsView({ leads, onOpen, rowActions }: { leads: LeadView[]; onOpen: (id: string) => void; rowActions: LeadRowActions }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {leads.map((l) => (
        <Card key={l.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(l.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={l.name} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{l.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.title} · {l.company}</p>
                </div>
              </div>
              <RowActions actions={rowActions(l)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StageBadge stage={l.status} />
              <Badge variant="outline">{l.source}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{l.owner}</span>
              <span className="font-medium text-foreground">{usd.format(l.value)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ leads, onOpen, rowActions }: { leads: LeadView[]; onOpen: (id: string) => void; rowActions: LeadRowActions }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Est. value</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => onOpen(l.id)}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={l.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{l.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.title}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{l.company}</TableCell>
                <TableCell className="text-muted-foreground">{l.source}</TableCell>
                <TableCell><StageBadge stage={l.status} /></TableCell>
                <TableCell className="text-right text-foreground">{usd.format(l.value)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{l.owner}</TableCell>
                <TableCell><RowActions actions={rowActions(l)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LeadForm({ draft, onChange }: { draft: LeadView; onChange: (d: LeadView) => void }) {
  const set = <K extends keyof LeadView>(key: K, value: LeadView[K]) => onChange({ ...draft, [key]: value });
  const num = (v: string) => (v.trim() === "" ? 0 : Math.max(0, Number(v) || 0));
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Contact name">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" />
        </FormField>
        <FormField label="Title">
          <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Owner" />
        </FormField>
        <FormField label="Company">
          <Input value={draft.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Co" />
        </FormField>
        <FormField label="Account owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
        <FormField label="Source">
          <Select value={draft.source} onValueChange={(v) => set("source", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Stage">
          <Select value={draft.status} onValueChange={(v) => set("status", v as LeadStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{LEAD_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Email">
          <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@acme.com" />
        </FormField>
        <FormField label="Phone">
          <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
        </FormField>
        <FormField label="Estimated value (USD)">
          <Input inputMode="numeric" value={String(draft.value)} onChange={(e) => set("value", num(e.target.value))} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Context, fit, next steps…" />
      </FormField>
    </div>
  );
}
