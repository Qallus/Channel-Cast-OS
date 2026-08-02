"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Contact as ContactIcon, ExternalLink, LayoutGrid, List, Mail, Pencil, Phone, Plus, SquareKanban, Table as TableIcon, Trash2 } from "lucide-react";

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
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTACT_ROLE,
  CONTACT_ROLE_ORDER,
  CONTACT_STATUS,
  CONTACT_STATUS_ORDER,
  Contact,
  ContactRole,
  ContactStatus,
  seedContacts,
} from "@/lib/crm/contacts";
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

function StatusBadge({ status }: { status: ContactStatus }) {
  return <Badge className={cn("border-transparent", CONTACT_STATUS[status].tone)}>{CONTACT_STATUS[status].label}</Badge>;
}
function RoleBadge({ role }: { role: ContactRole }) {
  return <Badge className={cn("border-transparent", CONTACT_ROLE[role].tone)}>{CONTACT_ROLE[role].label}</Badge>;
}

function blankContact(): Contact {
  return {
    id: genId("ct"),
    name: "",
    title: "",
    company: "",
    role: "influencer",
    status: "prospect",
    email: "",
    phone: "",
    city: "",
    state: "",
    owner: "Alex Rivera",
    lastContact: new Date().toISOString().slice(0, 10),
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

export function ContactsPage() {
  const { items, create, update, remove } = useCollection<Contact>("contacts", seedContacts);
  const [view, setView] = useState<View>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Contact; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Contact | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.name, c.title, c.company, c.email, c.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const active = items.filter((c) => c.status === "active").length;
    const dm = items.filter((c) => c.role === "decision_maker").length;
    const companies = new Set(items.map((c) => c.company)).size;
    return { total: items.length, active, dm, companies };
  }, [items]);

  const drawer = items.find((c) => c.id === drawerId) || null;

  const openNew = () => setEditing({ draft: blankContact(), isNew: true });
  const openEdit = (c: Contact) => setEditing({ draft: { ...c }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Contact added.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Contact updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Contact deleted.");
  }

  const rowActions = (c: Contact) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(c.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(c) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(c), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ContactIcon}
        title="Contacts"
        description="People across your client and prospect accounts."
        action={
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> Add contact
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Total contacts" value={stats.total} />
        <StatTile label="Active" value={stats.active} accent />
        <StatTile label="Decision makers" value={stats.dm} />
        <StatTile label="Companies" value={stats.companies} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search contacts…" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContactStatus | "all")}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CONTACT_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{CONTACT_STATUS[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand-strong">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No contacts yet. Add your first person." : "No contacts match your filters."} />
      ) : view === "list" ? (
        <ListView contacts={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView contacts={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView contacts={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "kanban" ? (
        <KanbanView contacts={filtered} onOpen={setDrawerId} />
      ) : (
        <RecordCalendar items={filtered} getId={(c) => c.id} getDate={(c) => c.lastContact} getTitle={(c) => c.name} onOpen={setDrawerId} footer="Contacts placed by last-contact date. Click one to open." />
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
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={drawer.status} />
                <RoleBadge role={drawer.role} />
              </div>
              <div className="flex flex-wrap gap-2">
                {drawer.email && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`mailto:${drawer.email}`}><Mail className="h-4 w-4" /> Email</a>
                  </Button>
                )}
                {drawer.phone && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`tel:${drawer.phone}`}><Phone className="h-4 w-4" /> Call</a>
                  </Button>
                )}
              </div>
              <div>
                <DetailField label="Email">{drawer.email ? <a href={`mailto:${drawer.email}`} className="text-brand-strong hover:underline">{drawer.email}</a> : ""}</DetailField>
                <DetailField label="Phone">{drawer.phone}</DetailField>
                <DetailField label="Company">{drawer.company}</DetailField>
                <DetailField label="Location">{[drawer.city, drawer.state].filter(Boolean).join(", ")}</DetailField>
                <DetailField label="Owner">{drawer.owner}</DetailField>
                <DetailField label="Last contact">{dateFmt(drawer.lastContact)}</DetailField>
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
          <DialogHeader>
            <DialogTitle>{editing?.isNew ? "Add contact" : "Edit contact"}</DialogTitle>
          </DialogHeader>
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
  contacts: Contact[];
  onOpen: (id: string) => void;
  rowActions: (c: Contact) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];
};

function ListView({ contacts, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {contacts.map((c) => (
        <Card key={c.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(c.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <Avatar name={c.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                <RoleBadge role={c.role} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.title} · {c.company}</p>
            </div>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">{c.email}</span>
            <RowActions actions={rowActions(c)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ contacts, onOpen, rowActions }: ViewProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Last contact</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => onOpen(c.id)}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.title}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.company}</TableCell>
                <TableCell><RoleBadge role={c.role} /></TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{c.owner}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{dateFmt(c.lastContact)}</TableCell>
                <TableCell><RowActions actions={rowActions(c)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CardsView({ contacts, onOpen, rowActions }: ViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {contacts.map((c) => (
        <Card key={c.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(c.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={c.name} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.title} · {c.company}</p>
                </div>
              </div>
              <RowActions actions={rowActions(c)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <RoleBadge role={c.role} />
              <StatusBadge status={c.status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">{c.email}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ contacts, onOpen }: { contacts: Contact[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
      {CONTACT_ROLE_ORDER.map((role) => {
        const col = contacts.filter((c) => c.role === role);
        return (
          <div key={role} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <RoleBadge role={role} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((c) => (
                <button key={c.id} onClick={() => onOpen(c.id)} className="flex w-full items-center gap-2 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50">
                  <Avatar name={c.name} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{c.company}</p>
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

function ContactForm({ draft, onChange }: { draft: Contact; onChange: (d: Contact) => void }) {
  const set = <K extends keyof Contact>(key: K, value: Contact[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" />
        </FormField>
        <FormField label="Title">
          <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="VP Operations" />
        </FormField>
        <FormField label="Company">
          <Input value={draft.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Resorts" />
        </FormField>
        <FormField label="Account owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
        </FormField>
        <FormField label="Role">
          <Select value={draft.role} onValueChange={(v) => set("role", v as ContactRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTACT_ROLE_ORDER.map((r) => <SelectItem key={r} value={r}>{CONTACT_ROLE[r].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as ContactStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTACT_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{CONTACT_STATUS[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Email">
          <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@acme.com" />
        </FormField>
        <FormField label="Phone">
          <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
        </FormField>
        <FormField label="City">
          <Input value={draft.city} onChange={(e) => set("city", e.target.value)} placeholder="Austin" />
        </FormField>
        <FormField label="State">
          <Input value={draft.state} onChange={(e) => set("state", e.target.value)} placeholder="TX" />
        </FormField>
        <FormField label="Last contact">
          <DatePicker value={draft.lastContact} onChange={(v) => set("lastContact", v)} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Relationship notes, next steps…" />
      </FormField>
    </div>
  );
}
