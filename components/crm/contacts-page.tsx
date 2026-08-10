"use client";

import { useMemo, useRef, useState } from "react";
import {
  Archive, CalendarClock, CalendarDays, Contact as ContactIcon, Download, ExternalLink, LayoutGrid, List,
  ListChecks, Mail, Maximize2, Minimize2, MessageSquare, Pencil, Phone, Plus, Shuffle, SquareKanban,
  StickyNote, Table as TableIcon, Trash2, Upload, X,
} from "lucide-react";

import {
  EmptyState, FormField, PageHeader, RecordCalendar, RowActions, SearchBox, StatRow, StatTile, ViewSwitcher, initialsOf,
} from "@/components/crm/crm-ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTACT_STATUS, CONTACT_STATUS_ORDER, CONTACT_TAGS, CONTACT_TYPE, CONTACT_TYPE_NEXT, CONTACT_TYPE_ORDER,
  Contact, ContactStatus, ContactType, DETAIL_CATEGORIES, categorizeDetail, contactName, seedContacts,
} from "@/lib/crm/contacts";
import { ACTIVITY_KIND, Activity, ActivityKind, seedActivities } from "@/lib/crm/activities";
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

const dateFmt = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

function TypeBadge({ type }: { type: ContactType }) {
  return <Badge className={cn("border-transparent", CONTACT_TYPE[type].tone)}>{CONTACT_TYPE[type].label}</Badge>;
}
function StatusBadge({ status }: { status: ContactStatus }) {
  return <Badge className={cn("border-transparent", CONTACT_STATUS[status].tone)}>{CONTACT_STATUS[status].label}</Badge>;
}

// Avatar: profile photo → company logo → initials.
function ContactAvatar({ contact, className }: { contact: Contact; className?: string }) {
  const src = contact.photoUrl || contact.logoUrl;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("h-9 w-9 shrink-0 rounded-lg object-cover", className)} />;
  }
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-xs font-semibold text-brand-strong", className)}>
      {initialsOf(contactName(contact))}
    </span>
  );
}

function TagChips({ tags, max }: { tags: string[]; max?: number }) {
  if (!tags?.length) return null;
  const shown = max ? tags.slice(0, max) : tags;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{t}</span>)}
      {max && tags.length > max ? <span className="text-[10px] text-muted-foreground">+{tags.length - max}</span> : null}
    </div>
  );
}

function blankContact(type: ContactType = "contact"): Contact {
  return {
    id: genId("ct"), name: "", firstName: "", lastName: "", title: "", company: "", type, status: "active",
    email: "", phone: "", sms: "", website: "", address: "", city: "", state: "", zip: "", source: "",
    owner: "Jeremy Waters", tags: [], notes: "", lastContact: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(), details: {},
  };
}

export function ContactsPage() {
  const { items, create, update, remove } = useCollection<Contact>("contacts", seedContacts);
  const activitiesCol = useCollection<Activity>("activities", seedActivities);
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<ContactType | "all">("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<ContactType>("prospect");
  const [viewId, setViewId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<{ draft: Contact; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Contact | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  // Normalize legacy records (older shape used `role`/other statuses) so they still render.
  const contacts = useMemo<Contact[]>(() => items.map((c) => ({
    ...c,
    type: (c.type ?? "contact") as ContactType,
    status: (["active", "inactive", "archived"].includes(c.status) ? c.status : "active") as ContactStatus,
    tags: Array.isArray(c.tags) ? c.tags : [],
    name: contactName(c),
  })), [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: contacts.length };
    for (const t of CONTACT_TYPE_ORDER) c[t] = contacts.filter((x) => x.type === t).length;
    return c;
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (tab !== "all" && c.type !== tab) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return [c.name, c.title, c.company, c.email, c.owner, ...(c.tags ?? [])].join(" ").toLowerCase().includes(q);
    });
  }, [contacts, tab, statusFilter, tagFilter, search]);

  const stats = useMemo(() => ({
    total: contacts.length,
    clients: contacts.filter((c) => c.type === "client").length,
    leads: contacts.filter((c) => c.type === "lead").length,
    companies: new Set(contacts.map((c) => c.company).filter(Boolean)).size,
  }), [contacts]);

  const drawer = contacts.find((c) => c.id === viewId) || null;

  const openNew = () => setEditing({ draft: blankContact(tab === "all" ? "contact" : tab), isNew: true });
  const openEdit = (c: Contact) => { setEditing({ draft: { ...c, tags: [...(c.tags ?? [])], details: { ...(c.details ?? {}) } }, isNew: false }); };
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    const draft = { ...editing.draft, name: editing.draft.name.trim() };
    if (editing.isNew) { create(draft); flash("Contact added."); } else { update(draft.id, draft); flash("Contact updated."); }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (viewId === deleteItem.id) setViewId(null);
    setSelected((s) => { const n = new Set(s); n.delete(deleteItem.id); return n; });
    setDeleteItem(null);
    flash("Contact deleted.");
  }
  function setType(c: Contact, type: ContactType) { update(c.id, { ...c, type }); flash(`Moved to ${CONTACT_TYPE[type].label}.`); }
  function setStatus(c: Contact, status: ContactStatus) { update(c.id, { ...c, status }); }

  // Selection helpers.
  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => { const n = new Set(s); if (allVisibleSelected) filtered.forEach((c) => n.delete(c.id)); else filtered.forEach((c) => n.add(c.id)); return n; });
  const clearSel = () => setSelected(new Set());
  function bulkApply(fn: (c: Contact) => void, msg: string) { contacts.filter((c) => selected.has(c.id)).forEach(fn); clearSel(); flash(msg); }

  const rowActions = (c: Contact) => [
    { label: "Open", icon: ExternalLink, onClick: () => setViewId(c.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(c) },
    ...(CONTACT_TYPE_NEXT[c.type] ? [{ label: `Convert to ${CONTACT_TYPE[CONTACT_TYPE_NEXT[c.type]!].label}`, icon: Shuffle, onClick: () => setType(c, CONTACT_TYPE_NEXT[c.type]!) }] : []),
    { label: c.status === "archived" ? "Unarchive" : "Archive", icon: Archive, onClick: () => setStatus(c, c.status === "archived" ? "active" : "archived") },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(c), destructive: true },
  ];

  const viewProps = { contacts: filtered, selected, toggleSel, onOpen: setViewId, rowActions };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ContactIcon}
        title="Contacts"
        description="Leads, prospects, clients, and contacts — one place to manage and convert them."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import</Button>
            <Button variant="outline" onClick={() => exportCsv(filtered)}><Download className="h-4 w-4" /> Export</Button>
            <Button onClick={openNew}><Plus className="h-4 w-4" /> Add contact</Button>
          </div>
        }
      />

      <StatRow>
        <StatTile label="Total" value={stats.total} />
        <StatTile label="Clients" value={stats.clients} accent />
        <StatTile label="Leads" value={stats.leads} />
        <StatTile label="Companies" value={stats.companies} />
      </StatRow>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border">
        {(["all", ...CONTACT_TYPE_ORDER] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); clearSel(); }}
            className={cn("-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition", tab === t ? "border-brand-strong text-brand-strong" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t === "all" ? "All" : CONTACT_TYPE[t].plural}
            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, company, email…" />
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All tags" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {CONTACT_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContactStatus | "all")}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CONTACT_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{CONTACT_STATUS[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand-strong">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/40 bg-accent/40 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <span className="text-xs text-muted-foreground">Convert to</span>
          <Select value={bulkType} onValueChange={(v) => setBulkType(v as ContactType)}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{CONTACT_TYPE_ORDER.map((t) => <SelectItem key={t} value={t}>{CONTACT_TYPE[t].label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => bulkApply((c) => update(c.id, { ...c, type: bulkType }), `Converted ${selected.size} to ${CONTACT_TYPE[bulkType].label}.`)}>Apply</Button>
          <Button size="sm" variant="outline" onClick={() => bulkApply((c) => update(c.id, { ...c, status: "archived" }), "Archived.")}><Archive className="h-3.5 w-3.5" /> Archive</Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => bulkApply((c) => remove(c.id), "Deleted.")}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
          <Button size="sm" variant="ghost" onClick={clearSel} className="ml-auto"><X className="h-3.5 w-3.5" /> Clear</Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState message={contacts.length === 0 ? "No contacts yet. Add your first person or import a CSV." : "No contacts match your filters."} />
      ) : view === "list" ? (
        <ListView {...viewProps} allSelected={allVisibleSelected} toggleAll={toggleAll} />
      ) : view === "table" ? (
        <TableView {...viewProps} allSelected={allVisibleSelected} toggleAll={toggleAll} />
      ) : view === "cards" ? (
        <CardsView {...viewProps} />
      ) : view === "kanban" ? (
        <KanbanView contacts={filtered} onOpen={setViewId} />
      ) : (
        <RecordCalendar items={filtered} getId={(c) => c.id} getDate={(c) => c.lastContact} getTitle={(c) => c.name} onOpen={setViewId} footer="Placed by last-contact date. Click one to open." />
      )}

      {/* Contact profile modal (expandable) */}
      <Dialog open={Boolean(drawer)} onOpenChange={(o) => { if (!o) { setViewId(null); setExpanded(false); } }}>
        <DialogContent className={cn("gap-0 overflow-hidden p-0", expanded ? "h-[96dvh] w-[96vw] max-w-[96vw]" : "max-w-2xl")}>
          {drawer && (
            <ContactProfile
              contact={drawer} expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)} onClose={() => { setViewId(null); setExpanded(false); }}
              onEdit={() => openEdit(drawer)} onDelete={() => setDeleteItem(drawer)}
              onConvert={(t) => setType(drawer, t)} onStatus={(s) => setStatus(drawer, s)}
              activities={activitiesCol.items.filter((a) => a.contactId === drawer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
              onLog={(kind, body) => activitiesCol.create({ id: genId("ac"), contactId: drawer.id, kind, body, actor: drawer.owner || "You", createdAt: new Date().toISOString() })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add / edit */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.isNew ? "Add contact" : "Edit contact"}</DialogTitle></DialogHeader>
          {editing && <ContactForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Add contact" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete contact?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">&ldquo;{deleteItem ? contactName(deleteItem) : ""}&rdquo; will be removed. This can&apos;t be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImport={(rows) => { rows.forEach((r) => create(r)); setImportOpen(false); flash(`Imported ${rows.length} contact${rows.length === 1 ? "" : "s"}.`); }} />}
    </div>
  );
}

// ── The rich contact profile modal ──────────────────────────────────────────────

function ContactProfile({
  contact, expanded, onToggleExpand, onClose, onEdit, onDelete, onConvert, onStatus, activities, onLog,
}: {
  contact: Contact; expanded: boolean; onToggleExpand: () => void; onClose: () => void;
  onEdit: () => void; onDelete: () => void; onConvert: (t: ContactType) => void; onStatus: (s: ContactStatus) => void;
  activities: Activity[]; onLog: (kind: ActivityKind, body: string) => void;
}) {
  const next = CONTACT_TYPE_NEXT[contact.type];
  const location = [contact.city, contact.state, contact.zip].filter(Boolean).join(", ");
  const details = contact.details ?? {};
  const byCategory = DETAIL_CATEGORIES.map((cat) => ({ cat, entries: Object.entries(details).filter(([k]) => categorizeDetail(k) === cat) })).filter((g) => g.entries.length);

  return (
    <div className="flex h-full max-h-[96dvh] flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <DialogTitle className="text-base">{contact.name}</DialogTitle>
        <div className="flex items-center gap-1">
          <button onClick={onToggleExpand} aria-label={expanded ? "Collapse" : "Expand"} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto p-5", expanded && "mx-auto w-full max-w-3xl")}>
        {/* Quick actions */}
        <div className="flex flex-wrap gap-1.5">
          {contact.phone && <ActionBtn href={`tel:${contact.phone}`} icon={Phone} label="Call" onLog={() => onLog("call", `Call to ${contact.phone}`)} />}
          {(contact.sms || contact.phone) && <ActionBtn href={`sms:${contact.sms || contact.phone}`} icon={MessageSquare} label="Text" onLog={() => onLog("sms", `SMS to ${contact.sms || contact.phone}`)} />}
          {contact.email && <ActionBtn href={`mailto:${contact.email}`} icon={Mail} label="Email" onLog={() => onLog("email", `Email to ${contact.email}`)} />}
          <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          <Button size="sm" variant="outline" onClick={() => onStatus(contact.status === "archived" ? "active" : "archived")}><Archive className="h-3.5 w-3.5" /> {contact.status === "archived" ? "Unarchive" : "Archive"}</Button>
          <Select value={contact.status} onValueChange={(v) => onStatus(v as ContactStatus)}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{CONTACT_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{CONTACT_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
        </div>

        {/* Identity */}
        <div className="mt-5 flex items-start gap-3">
          <ContactAvatar contact={contact} className="h-14 w-14 rounded-xl text-base" />
          <div className="min-w-0">
            <p className="text-xl font-semibold tracking-tight">{contact.name}</p>
            <p className="text-sm text-muted-foreground">{[contact.title, contact.company].filter(Boolean).join(" · ")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TypeBadge type={contact.type} />
              <StatusBadge status={contact.status} />
              <TagChips tags={contact.tags} />
            </div>
          </div>
        </div>

        {/* Core info */}
        <div className="mt-4 grid gap-x-6 gap-y-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <Info label="Email" icon={Mail}>{contact.email ? <a href={`mailto:${contact.email}`} className="text-brand-strong hover:underline">{contact.email}</a> : "—"}</Info>
          <Info label="Phone" icon={Phone}>{contact.phone || "—"}</Info>
          <Info label="Company">{contact.company || "—"}</Info>
          <Info label="Source">{contact.source || "—"}</Info>
          <Info label="Owner">{contact.owner || "—"}</Info>
          <Info label="Location">{location || "—"}</Info>
          {contact.website ? <Info label="Website"><a href={contact.website} target="_blank" rel="noreferrer" className="text-brand-strong hover:underline">{contact.website}</a></Info> : null}
          <Info label="Last contact">{dateFmt(contact.lastContact)}</Info>
        </div>

        {contact.notes ? (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="text-sm">{contact.notes}</p>
          </div>
        ) : null}

        {/* Imported detail categories (accordion) */}
        {byCategory.length ? (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><ExternalLink className="h-3.5 w-3.5" /> Imported details</p>
            <Accordion type="multiple" className="space-y-2">
              {byCategory.map(({ cat, entries }) => (
                <AccordionItem key={cat} value={cat} className="rounded-lg border border-border bg-card px-3">
                  <AccordionTrigger className="py-2.5 text-sm hover:no-underline">
                    <span className="flex items-center gap-2">{cat}<span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{entries.length}</span></span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-x-6 gap-y-3 pb-2 sm:grid-cols-2 lg:grid-cols-3">
                      {entries.map(([k, v]) => <Info key={k} label={k}>{v || "—"}</Info>)}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : null}

        {/* Activity & communications */}
        <ActivityTimeline activities={activities} onLog={onLog} />

        {/* Convert */}
        {next ? (
          <div className="mt-5">
            <Button variant="outline" onClick={() => onConvert(next)}><Shuffle className="h-4 w-4" /> Convert to {CONTACT_TYPE[next].label}</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActionBtn({ href, icon: Icon, label, onLog }: { href: string; icon: typeof Phone; label: string; onLog?: () => void }) {
  return <Button asChild size="sm" variant="outline"><a href={href} onClick={() => onLog?.()}><Icon className="h-3.5 w-3.5" /> {label}</a></Button>;
}

const ACTIVITY_ICON: Record<ActivityKind, typeof Phone> = {
  note: StickyNote, call: Phone, sms: MessageSquare, email: Mail, meeting: CalendarClock, task: ListChecks, stage: Shuffle,
};

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function ActivityTimeline({ activities, onLog }: { activities: Activity[]; onLog: (kind: ActivityKind, body: string) => void }) {
  const [kind, setKind] = useState<ActivityKind>("note");
  const [body, setBody] = useState("");
  function submit() { if (body.trim()) { onLog(kind, body.trim()); setBody(""); } }
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity &amp; communications</p>
      {/* Composer */}
      <div className="mb-3 flex gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as ActivityKind)}>
          <SelectTrigger className="h-9 w-[110px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{(["note", "call", "sms", "email", "meeting"] as ActivityKind[]).map((k) => <SelectItem key={k} value={k}>{ACTIVITY_KIND[k].label}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder="Log a call, note, or message…" className="flex-1" />
        <Button size="sm" onClick={submit} disabled={!body.trim()}>Log</Button>
      </div>
      {activities.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">No activity yet. Log the first touchpoint above.</p>
      ) : (
        <ol className="space-y-2">
          {activities.map((a) => {
            const Icon = ACTIVITY_ICON[a.kind] ?? StickyNote;
            return (
              <li key={a.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", ACTIVITY_KIND[a.kind].tone)}><Icon className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{ACTIVITY_KIND[a.kind].label}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground">{a.body}</p>
                  {a.actor ? <p className="mt-0.5 text-[11px] text-muted-foreground">{a.actor}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
function Info({ label, icon: Icon, children }: { label: string; icon?: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">{Icon ? <Icon className="h-3 w-3" /> : null}{label}</p>
      <p className="mt-0.5 truncate text-sm text-foreground">{children}</p>
    </div>
  );
}

// ── Views ────────────────────────────────────────────────────────────────────────

type ViewProps = {
  contacts: Contact[];
  selected: Set<string>;
  toggleSel: (id: string) => void;
  onOpen: (id: string) => void;
  rowActions: (c: Contact) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];
};

function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <input type="checkbox" checked={checked} onClick={(e) => e.stopPropagation()} onChange={onChange}
      className="h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-brand" aria-label="Select contact" />
  );
}

function ListView({ contacts, selected, toggleSel, onOpen, rowActions, allSelected, toggleAll }: ViewProps & { allSelected: boolean; toggleAll: () => void }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-input accent-brand" /> Select all
      </label>
      {contacts.map((c) => (
        <Card key={c.id} className={cn("cursor-pointer transition-colors hover:border-brand/40", selected.has(c.id) && "border-brand/50 bg-accent/30")} onClick={() => onOpen(c.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <Check checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} />
            <ContactAvatar contact={c} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                <TypeBadge type={c.type} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{[c.title, c.company].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="hidden md:block"><TagChips tags={c.tags} max={2} /></div>
            <span className="hidden truncate text-xs text-muted-foreground lg:block">{c.email}</span>
            <RowActions actions={rowActions(c)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ contacts, selected, toggleSel, onOpen, rowActions, allSelected, toggleAll }: ViewProps & { allSelected: boolean; toggleAll: () => void }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-input accent-brand" aria-label="Select all" /></TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => (
              <TableRow key={c.id} className={cn("cursor-pointer", selected.has(c.id) && "bg-accent/30")} onClick={() => onOpen(c.id)}>
                <TableCell onClick={(e) => e.stopPropagation()}><Check checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <ContactAvatar contact={c} />
                    <div className="min-w-0"><p className="truncate font-medium text-foreground">{c.name}</p><p className="truncate text-xs text-muted-foreground">{c.title}</p></div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.company}</TableCell>
                <TableCell><TypeBadge type={c.type} /></TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell><TagChips tags={c.tags} max={2} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{c.owner}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}><RowActions actions={rowActions(c)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CardsView({ contacts, selected, toggleSel, onOpen, rowActions }: ViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {contacts.map((c) => (
        <Card key={c.id} className={cn("cursor-pointer transition-colors hover:border-brand/40", selected.has(c.id) && "border-brand/50")} onClick={() => onOpen(c.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Check checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} />
                <ContactAvatar contact={c} />
                <div className="min-w-0"><p className="truncate font-medium text-foreground">{c.name}</p><p className="truncate text-xs text-muted-foreground">{[c.title, c.company].filter(Boolean).join(" · ")}</p></div>
              </div>
              <RowActions actions={rowActions(c)} />
            </div>
            <div className="flex flex-wrap gap-2"><TypeBadge type={c.type} /><StatusBadge status={c.status} /></div>
            <TagChips tags={c.tags} max={4} />
            <p className="truncate text-xs text-muted-foreground">{c.email}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ contacts, onOpen }: { contacts: Contact[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {CONTACT_TYPE_ORDER.map((type) => {
        const col = contacts.filter((c) => c.type === type);
        return (
          <div key={type} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1"><TypeBadge type={type} /><span className="text-xs text-muted-foreground">{col.length}</span></div>
            <div className="space-y-2">
              {col.map((c) => (
                <button key={c.id} onClick={() => onOpen(c.id)} className="flex w-full items-center gap-2 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50">
                  <ContactAvatar contact={c} className="h-8 w-8" />
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{c.name}</p><p className="truncate text-[11px] text-muted-foreground">{c.company}</p></div>
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

// ── Add / edit form ──────────────────────────────────────────────────────────────

function ContactForm({ draft, onChange }: { draft: Contact; onChange: (d: Contact) => void }) {
  const set = <K extends keyof Contact>(key: K, value: Contact[K]) => onChange({ ...draft, [key]: value });
  const toggleTag = (t: string) => set("tags", draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t]);
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name"><Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" /></FormField>
        <FormField label="Title"><Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="VP Operations" /></FormField>
        <FormField label="Company"><Input value={draft.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Resorts" /></FormField>
        <FormField label="Account owner"><Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} /></FormField>
        <FormField label="Type">
          <Select value={draft.type} onValueChange={(v) => set("type", v as ContactType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONTACT_TYPE_ORDER.map((t) => <SelectItem key={t} value={t}>{CONTACT_TYPE[t].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as ContactStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONTACT_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{CONTACT_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Email"><Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@acme.com" /></FormField>
        <FormField label="Phone"><Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" /></FormField>
        <FormField label="Website"><Input value={draft.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></FormField>
        <FormField label="Source"><Input value={draft.source ?? ""} onChange={(e) => set("source", e.target.value)} placeholder="Referral, website…" /></FormField>
        <FormField label="City"><Input value={draft.city} onChange={(e) => set("city", e.target.value)} placeholder="Austin" /></FormField>
        <FormField label="State"><Input value={draft.state} onChange={(e) => set("state", e.target.value)} placeholder="TX" /></FormField>
        <FormField label="Profile photo URL"><Input value={draft.photoUrl ?? ""} onChange={(e) => set("photoUrl", e.target.value)} placeholder="https://…" /></FormField>
        <FormField label="Company logo URL"><Input value={draft.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" /></FormField>
        <FormField label="Last contact"><DatePicker value={draft.lastContact} onChange={(v) => set("lastContact", v)} /></FormField>
      </div>
      <FormField label="Tags">
        <div className="flex flex-wrap gap-1.5">
          {CONTACT_TAGS.map((t) => {
            const on = draft.tags.includes(t);
            return <button key={t} type="button" onClick={() => toggleTag(t)} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition", on ? "border-brand-strong bg-accent text-brand-strong" : "border-border text-muted-foreground hover:bg-accent/40")}>{t}</button>;
          })}
        </div>
      </FormField>
      <FormField label="Notes"><Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Relationship notes, next steps…" /></FormField>
    </div>
  );
}

// ── CSV import / export ──────────────────────────────────────────────────────────

// Minimal CSV parser (handles quoted fields + commas/newlines inside quotes).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (ch !== "\r") cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const FIELD_ALIASES: Record<string, keyof Contact> = {
  name: "name", "full name": "name", "first name": "firstName", "last name": "lastName", title: "title", "job title": "title",
  company: "company", type: "type", status: "status", email: "email", phone: "phone", sms: "sms", website: "website",
  address: "address", city: "city", state: "state", zip: "zip", "zip code": "zip", source: "source", owner: "owner",
  "lead owner": "owner", tags: "tags", notes: "notes",
};

function rowsToContacts(rows: string[][]): Contact[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const base = blankContact();
    const details: Record<string, string> = {};
    headers.forEach((h, i) => {
      const val = (r[i] ?? "").trim();
      if (!val) return;
      const key = FIELD_ALIASES[h.toLowerCase()];
      if (key === "tags") base.tags = val.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
      else if (key === "type") { const t = val.toLowerCase(); base.type = (["contact", "lead", "prospect", "client"].includes(t) ? t : "contact") as ContactType; }
      else if (key === "status") { const s = val.toLowerCase(); base.status = (["active", "inactive", "archived"].includes(s) ? s : "active") as ContactStatus; }
      else if (key) (base as Record<string, unknown>)[key] = val;
      else details[h] = val; // unknown column → imported detail
    });
    base.name = contactName({ ...base });
    base.details = details;
    return base;
  }).filter((c) => c.name && c.name !== "Unnamed");
}

function exportCsv(contacts: Contact[]) {
  const cols: (keyof Contact)[] = ["name", "title", "company", "type", "status", "email", "phone", "website", "city", "state", "source", "owner", "notes"];
  const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const head = [...cols, "tags"].join(",");
  const body = contacts.map((c) => [...cols.map((k) => esc(String(c[k] ?? ""))), esc((c.tags ?? []).join("; "))].join(",")).join("\n");
  const blob = new Blob([`${head}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (rows: Contact[]) => void }) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => (text.trim() ? rowsToContacts(parseCsv(text)) : []), [text]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Import contacts (CSV)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Upload or paste CSV. Recognized columns (name, title, company, type, status, email, phone, website, city, state, source, owner, tags, notes) map to fields; any other columns become imported details.</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = ""; }} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Choose CSV file</Button>
          <Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={"name,company,email,type,tags\nJane Doe,Acme,jane@acme.com,lead,Advertiser; Agency"} className="font-mono text-xs" />
          {text.trim() ? <p className="text-xs text-muted-foreground">{parsed.length} contact{parsed.length === 1 ? "" : "s"} ready to import.</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onImport(parsed)} disabled={!parsed.length}>Import {parsed.length || ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
