"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  CalendarDays,
  Cpu,
  ExternalLink,
  LayoutGrid,
  List,
  Mail,
  Map as MapIcon,
  MapPin,
  Pencil,
  Phone,
  Plus,
  SquareKanban,
  Table as TableIcon,
  Trash2,
} from "lucide-react";

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
import {
  CLIENT_HEALTH,
  CLIENT_STATUS,
  CLIENT_STATUS_ORDER,
  Client,
  ClientHealth,
  ClientStatus,
  INDUSTRIES,
  seedClients,
} from "@/lib/crm/clients";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type View = "list" | "table" | "cards" | "kanban" | "calendar" | "map";
const VIEWS = [
  { id: "list" as const, label: "List", icon: List },
  { id: "table" as const, label: "Table", icon: TableIcon },
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "kanban" as const, label: "Kanban", icon: SquareKanban },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
  { id: "map" as const, label: "Map", icon: MapIcon },
];

const ClientsMap = dynamic(() => import("@/components/crm/records-map"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">Loading map…</div>,
});

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function StatusBadge({ status }: { status: ClientStatus }) {
  return <Badge className={cn("border-transparent", CLIENT_STATUS[status].tone)}>{CLIENT_STATUS[status].label}</Badge>;
}
function HealthBadge({ health }: { health: ClientHealth }) {
  return <Badge className={cn("border-transparent", CLIENT_HEALTH[health].tone)}>{CLIENT_HEALTH[health].label}</Badge>;
}

function blankClient(): Client {
  return {
    id: genId("cl"),
    name: "",
    industry: "Hospitality",
    status: "prospect",
    health: "watch",
    website: "",
    city: "",
    state: "",
    primaryContact: "",
    email: "",
    phone: "",
    locations: 0,
    devices: 0,
    mrr: 0,
    lat: null,
    lng: null,
    owner: "Alex Rivera",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

export function ClientsPage() {
  const { items, create, update, remove } = useCollection<Client>("clients", seedClients);
  const [view, setView] = useState<View>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: Client; isNew: boolean } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Client | null>(null);
  const { toast, flash } = useToast();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.name, c.primaryContact, c.city, c.state, c.industry, c.owner].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const active = items.filter((c) => c.status === "active").length;
    const atRisk = items.filter((c) => c.status === "at_risk").length;
    const mrr = items.reduce((sum, c) => sum + (c.mrr || 0), 0);
    return { total: items.length, active, atRisk, mrr };
  }, [items]);

  const drawerClient = items.find((c) => c.id === drawerId) || null;

  function openNew() {
    setEditing({ draft: blankClient(), isNew: true });
  }
  function openEdit(c: Client) {
    setEditing({ draft: { ...c }, isNew: false });
  }
  function saveDraft() {
    if (!editing) return;
    const d = editing.draft;
    if (!d.name.trim()) return;
    if (editing.isNew) {
      create(d);
      flash("Client added.");
    } else {
      update(d.id, d);
      flash("Client updated.");
    }
    setEditing(null);
  }
  function confirmDelete() {
    if (!deleteItem) return;
    remove(deleteItem.id);
    if (drawerId === deleteItem.id) setDrawerId(null);
    setDeleteItem(null);
    flash("Client deleted.");
  }

  const rowActions = (c: Client) => [
    { label: "Open", icon: ExternalLink, onClick: () => setDrawerId(c.id) },
    { label: "Edit", icon: Pencil, onClick: () => openEdit(c) },
    { label: "Delete", icon: Trash2, onClick: () => setDeleteItem(c), destructive: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Clients"
        description="Organizations and accounts across the network."
        action={
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> Add client
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Total clients" value={stats.total} />
        <StatTile label="Active" value={stats.active} accent />
        <StatTile label="At risk" value={stats.atRisk} hint="Needs attention" />
        <StatTile label="Total MRR" value={usd.format(stats.mrr)} hint="Monthly recurring" />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search clients…" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ClientStatus | "all")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CLIENT_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {CLIENT_STATUS[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Toast toast={toast} />
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "No clients yet. Add your first account." : "No clients match your filters."} />
      ) : view === "list" ? (
        <ListView clients={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "table" ? (
        <TableView clients={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "cards" ? (
        <CardsView clients={filtered} onOpen={setDrawerId} rowActions={rowActions} />
      ) : view === "kanban" ? (
        <KanbanView clients={filtered} onOpen={setDrawerId} />
      ) : view === "calendar" ? (
        <RecordCalendar items={filtered} getId={(c) => c.id} getDate={(c) => c.createdAt} getTitle={(c) => c.name} onOpen={setDrawerId} footer="Clients placed by date added. Click one to open." />
      ) : (
        <MapView clients={filtered} onOpen={setDrawerId} />
      )}

      {/* Detail drawer */}
      <Sheet open={Boolean(drawerClient)} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent className="overflow-y-auto">
          {drawerClient && (
            <div className="space-y-5">
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={drawerClient.name} className="h-12 w-12 text-sm" />
                  <div>
                    <SheetTitle>{drawerClient.name}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{drawerClient.industry}</p>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={drawerClient.status} />
                <HealthBadge health={drawerClient.health} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Locations" value={drawerClient.locations} icon={MapPin} />
                <MiniStat label="Devices" value={drawerClient.devices} icon={Cpu} />
                <MiniStat label="MRR" value={usd.format(drawerClient.mrr)} />
              </div>
              <div>
                <DetailField label="Primary contact">{drawerClient.primaryContact}</DetailField>
                <DetailField label="Email">
                  {drawerClient.email ? <a href={`mailto:${drawerClient.email}`} className="text-brand-strong hover:underline">{drawerClient.email}</a> : ""}
                </DetailField>
                <DetailField label="Phone">{drawerClient.phone}</DetailField>
                <DetailField label="Website">
                  {drawerClient.website ? (
                    <a href={`https://${drawerClient.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-strong hover:underline">
                      {drawerClient.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : ""}
                </DetailField>
                <DetailField label="Location">{[drawerClient.city, drawerClient.state].filter(Boolean).join(", ")}</DetailField>
                <DetailField label="Account owner">{drawerClient.owner}</DetailField>
                <DetailField label="Client since">{new Date(drawerClient.createdAt).toLocaleDateString()}</DetailField>
              </div>
              {drawerClient.notes && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="text-sm text-foreground">{drawerClient.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => openEdit(drawerClient)} className="flex-1">
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="outline" onClick={() => setDeleteItem(drawerClient)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / edit modal */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.isNew ? "Add client" : "Edit client"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ClientForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!editing?.draft.name.trim()}>
              {editing?.isNew ? "Add client" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete client?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteItem?.name}&rdquo; and its CRM record will be removed. This can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string | number; icon?: typeof Cpu }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

/* ── Views ───────────────────────────────────────────────────────────── */

type ViewProps = {
  clients: Client[];
  onOpen: (id: string) => void;
  rowActions: (c: Client) => { label: string; icon: typeof Pencil; onClick: () => void; destructive?: boolean }[];
};

function ListView({ clients, onOpen, rowActions }: ViewProps) {
  return (
    <div className="space-y-2">
      {clients.map((c) => (
        <Card key={c.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(c.id)}>
          <CardContent className="flex items-center gap-3 p-3">
            <Avatar name={c.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.industry} · {[c.city, c.state].filter(Boolean).join(", ")}</p>
            </div>
            <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:block">{c.devices} devices</span>
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">{usd.format(c.mrr)}/mo</span>
            <RowActions actions={rowActions(c)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MapView({ clients, onOpen }: { clients: Client[]; onOpen: (id: string) => void }) {
  const points = clients
    .filter((c) => c.lat !== null && c.lng !== null)
    .map((c) => ({ id: c.id, lat: c.lat as number, lng: c.lng as number, title: c.name, subtitle: `${[c.city, c.state].filter(Boolean).join(", ")} · ${CLIENT_STATUS[c.status].label}` }));
  if (points.length === 0) return <EmptyState message="No clients have a location yet. Edit a client and add coordinates to plot it." />;
  return (
    <Card>
      <CardContent className="p-4">
        <ClientsMap points={points} onOpen={onOpen} />
        <p className="mt-2 text-xs text-muted-foreground">{points.length} located client{points.length === 1 ? "" : "s"} plotted. Click a marker to open.</p>
      </CardContent>
    </Card>
  );
}

function TableView({ clients, onOpen, rowActions }: ViewProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Devices</TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => onOpen(c.id)}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.industry}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell><HealthBadge health={c.health} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ")}</TableCell>
                <TableCell className="text-right text-foreground">{c.devices}</TableCell>
                <TableCell className="text-right text-foreground">{usd.format(c.mrr)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{c.owner}</TableCell>
                <TableCell><RowActions actions={rowActions(c)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CardsView({ clients, onOpen, rowActions }: ViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {clients.map((c) => (
        <Card key={c.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => onOpen(c.id)}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={c.name} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.industry} · {[c.city, c.state].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              <RowActions actions={rowActions(c)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={c.status} />
              <HealthBadge health={c.health} />
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{c.locations} locations · {c.devices} devices</span>
              <span className="font-medium text-foreground">{usd.format(c.mrr)}/mo</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ clients, onOpen }: { clients: Client[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {CLIENT_STATUS_ORDER.map((status) => {
        const col = clients.filter((c) => c.status === status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpen(c.id)}
                  className="flex w-full items-center gap-2 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50"
                >
                  <Avatar name={c.name} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{usd.format(c.mrr)}/mo · {c.devices} devices</p>
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

/* ── Form ────────────────────────────────────────────────────────────── */

function ClientForm({ draft, onChange }: { draft: Client; onChange: (d: Client) => void }) {
  const set = <K extends keyof Client>(key: K, value: Client[K]) => onChange({ ...draft, [key]: value });
  const num = (v: string) => (v.trim() === "" ? 0 : Math.max(0, Number(v) || 0));

  return (
    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Client name" className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Resorts" />
        </FormField>
        <FormField label="Industry">
          <Select value={draft.industry} onValueChange={(v) => set("industry", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Website">
          <Input value={draft.website} onChange={(e) => set("website", e.target.value)} placeholder="acme.com" />
        </FormField>
        <FormField label="Status">
          <Select value={draft.status} onValueChange={(v) => set("status", v as ClientStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLIENT_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{CLIENT_STATUS[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Health">
          <Select value={draft.health} onValueChange={(v) => set("health", v as ClientHealth)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["good", "watch", "poor"] as ClientHealth[]).map((h) => <SelectItem key={h} value={h}>{CLIENT_HEALTH[h].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Primary contact">
          <Input value={draft.primaryContact} onChange={(e) => set("primaryContact", e.target.value)} placeholder="Jane Doe" />
        </FormField>
        <FormField label="Account owner">
          <Input value={draft.owner} onChange={(e) => set("owner", e.target.value)} />
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
        <FormField label="Latitude">
          <Input inputMode="decimal" value={draft.lat === null ? "" : String(draft.lat)} onChange={(e) => set("lat", e.target.value.trim() === "" ? null : Number(e.target.value))} placeholder="30.27" />
        </FormField>
        <FormField label="Longitude">
          <Input inputMode="decimal" value={draft.lng === null ? "" : String(draft.lng)} onChange={(e) => set("lng", e.target.value.trim() === "" ? null : Number(e.target.value))} placeholder="-97.74" />
        </FormField>
        <FormField label="Locations">
          <Input inputMode="numeric" value={String(draft.locations)} onChange={(e) => set("locations", num(e.target.value))} />
        </FormField>
        <FormField label="Devices">
          <Input inputMode="numeric" value={String(draft.devices)} onChange={(e) => set("devices", num(e.target.value))} />
        </FormField>
        <FormField label="MRR (USD/mo)">
          <Input inputMode="numeric" value={String(draft.mrr)} onChange={(e) => set("mrr", num(e.target.value))} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Context, risks, next steps…" />
      </FormField>
    </div>
  );
}
