"use client";

import { useMemo, useState } from "react";
import { ExternalLink, LayoutGrid, List, Mail, Pencil, Plus, SquareKanban, Table as TableIcon, Trash2, Users } from "lucide-react";

import {
  Avatar,
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
import { DEPARTMENTS, MEMBER_STATUS, MEMBER_STATUS_ORDER, MemberStatus, TeamMember, seedTeam } from "@/lib/ops/team";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "cards" | "kanban";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
];

function StatusBadge({ status }: { status: MemberStatus }) {
  return <Badge className={cn("border-transparent", MEMBER_STATUS[status].tone)}>{MEMBER_STATUS[status].label}</Badge>;
}

function blank(): TeamMember {
  return { id: genId("tm"), name: "", email: "", role: "", department: "Sales", status: "invited", phone: "", location: "", notes: "", createdAt: new Date().toISOString() };
}

type RowActionsFn = (m: TeamMember) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];

export function TeamPage() {
  const { items, create, update, remove } = useCollection<TeamMember>("team_members", seedTeam);
  const [view, setView] = useState<View>("cards");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: TeamMember; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<TeamMember | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      if (deptFilter !== "all" && m.department !== deptFilter) return false;
      if (!q) return true;
      return [m.name, m.email, m.role, m.department, m.location].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, deptFilter]);

  const stats = useMemo(() => {
    const active = items.filter((m) => m.status === "active").length;
    const invited = items.filter((m) => m.status === "invited").length;
    const depts = new Set(items.map((m) => m.department)).size;
    return { total: items.length, active, invited, depts };
  }, [items]);

  const drawer = items.find((m) => m.id === drawerId) || null;
  const openNew = () => setEditing({ draft: blank(), isNew: true });
  const openEdit = (m: TeamMember) => setEditing({ draft: { ...m }, isNew: false });
  function saveDraft() {
    if (!editing || !editing.draft.name.trim()) return;
    if (editing.isNew) {
      create(editing.draft);
      flash("Member added.");
    } else {
      update(editing.draft.id, editing.draft);
      flash("Member updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Member removed.");
  }

  const rowActions: RowActionsFn = (m) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(m.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(m) },
    { label: "Remove", icon: Trash2, onClick: () => setDeleteItem(m), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Team"
        description="Team members, roles, and invitations."
        action={<Button onClick={openNew} className="shrink-0"><Plus className="h-4 w-4" /> Invite member</Button>}
      />

      <StatRow>
        <StatTile label="Members" value={stats.total} />
        <StatTile label="Active" value={stats.active} accent />
        <StatTile label="Invited" value={stats.invited} />
        <StatTile label="Departments" value={stats.depts} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search team…" />
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No team members yet. Invite your first teammate." : "No members match your filters."} />
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
                <div className="flex items-center gap-3">
                  <Avatar name={drawer.name} className="h-12 w-12 text-sm" />
                  <div>
                    <SheetTitle>{drawer.name}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{drawer.role} · {drawer.department}</p>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex flex-wrap gap-2"><StatusBadge status={drawer.status} /><Badge variant="outline">{drawer.department}</Badge></div>
              {drawer.email && (
                <Button asChild variant="outline" size="sm"><a href={`mailto:${drawer.email}`}><Mail className="h-4 w-4" /> Email</a></Button>
              )}
              <div>
                <DetailField label="Email">{drawer.email ? <a href={`mailto:${drawer.email}`} className="text-brand hover:underline">{drawer.email}</a> : ""}</DetailField>
                <DetailField label="Phone">{drawer.phone}</DetailField>
                <DetailField label="Role">{drawer.role}</DetailField>
                <DetailField label="Department">{drawer.department}</DetailField>
                <DetailField label="Location">{drawer.location}</DetailField>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Set status</p>
                <div className="flex flex-wrap gap-1.5">
                  {MEMBER_STATUS_ORDER.map((s) => (
                    <Button key={s} size="sm" variant={s === drawer.status ? "default" : "outline"} onClick={() => update(drawer.id, { status: s })}>{MEMBER_STATUS[s].label}</Button>
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
                <Button variant="outline" onClick={() => setDeleteItem(drawer)}><Trash2 className="h-4 w-4" /> Remove</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.isNew ? "Invite member" : "Edit member"}</DialogTitle></DialogHeader>
          {editing && <MemberForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>{editing?.isNew ? "Send invite" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Remove member?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">&ldquo;{deleteItem?.name}&rdquo; will lose access. This can&apos;t be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ViewProps = { rows: TeamMember[]; onOpen: (id: string) => void; rowActions: RowActionsFn };

function ListView({ rows, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {rows.map((m) => (
        <Card key={m.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(m.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <Avatar name={m.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.role} · {m.department}</p>
            </div>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">{m.email}</span>
            <RowActions actions={rowActions(m)} />
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
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id} className="cursor-pointer" onClick={() => onOpen(m.id)}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.role}</TableCell>
                <TableCell className="text-muted-foreground">{m.department}</TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{m.location}</TableCell>
                <TableCell><RowActions actions={rowActions(m)} /></TableCell>
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
      {rows.map((m) => (
        <Card key={m.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(m.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={m.name} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                </div>
              </div>
              <RowActions actions={rowActions(m)} />
            </div>
            <div className="flex flex-wrap gap-2"><StatusBadge status={m.status} /><Badge variant="outline">{m.department}</Badge></div>
            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ rows, onOpen }: { rows: TeamMember[]; onOpen: (id: string) => void }) {
  const depts = DEPARTMENTS.filter((d) => rows.some((m) => m.department === d));
  const cols = depts.length ? depts : DEPARTMENTS;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cols.map((dept) => {
        const col = rows.filter((m) => m.department === dept);
        return (
          <div key={dept} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-medium text-foreground">{dept}</span>
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((m) => (
                <button key={m.id} onClick={() => onOpen(m.id)} className="flex w-full items-center gap-2 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50">
                  <Avatar name={m.name} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{m.role}</p>
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

function MemberForm({ draft, onChange }: { draft: TeamMember; onChange: (d: TeamMember) => void }) {
  const set = <K extends keyof TeamMember>(key: K, value: TeamMember[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@channelcast.example" />
        </FormField>
        <FormField label="Role">
          <Input value={draft.role} onChange={(e) => set("role", e.target.value)} placeholder="Account Executive" />
        </FormField>
        <FormField label="Department">
          <Select value={draft.department} onValueChange={(v) => set("department", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as MemberStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MEMBER_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{MEMBER_STATUS[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Phone">
          <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
        </FormField>
        <FormField label="Location">
          <Input value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder="Austin, TX / Remote" />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Responsibilities, context…" />
      </FormField>
    </div>
  );
}
