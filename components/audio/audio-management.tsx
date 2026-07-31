"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  ImagePlus,
  LayoutGrid,
  List,
  Map as MapIcon,
  MoreVertical,
  Pencil,
  Share2,
  SquareKanban,
  Table as TableIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { AudioPlayer } from "@/components/audio/audio-player";
import { AudioSpots } from "@/components/audio/audio-spots";
import { MediaStudio } from "@/components/audio/media-studio";
import { SpotThumb } from "@/components/audio/spot-thumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_META,
  SpotMeta,
  getMeta,
  imageToDataUrl,
  loadAllMeta,
  saveMeta,
} from "@/lib/audio/spot-meta";
import { SPOT_STATUS_META, SPOT_STATUS_ORDER, type AudioSpot, type SpotStatus } from "@/lib/audio/spots";
import { cn } from "@/lib/utils";

type LibAudio = { id: string; name: string; sizeBytes: number; createdAt: string; mime: string; archived?: boolean };
type Spot = LibAudio & SpotMeta;
type Tab = "library" | "studio" | "spots";
type LibView = "cards" | "list" | "table" | "kanban" | "calendar" | "map";

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
const fileExt = (a: LibAudio) => (a.mime?.includes("wav") ? "wav" : a.mime?.includes("mpeg") || a.mime?.includes("mp3") ? "mp3" : a.mime?.split("/")[1] || "audio");
const dateFmt = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const SpotsMap = dynamic(() => import("@/components/audio/spots-map"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">Loading map…</div>,
});

function StatusBadge({ status }: { status: SpotStatus }) {
  const m = SPOT_STATUS_META[status];
  return <Badge className={cn("border-transparent", m.tone)}>{m.label}</Badge>;
}

export function AudioManagement() {
  const [tab, setTab] = useState<Tab>("library");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audio Management</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Your audio library, the recording &amp; overlay studio, and every audio spot across the network.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 sm:w-fit">
        {(["library", "studio", "spots"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors sm:flex-none",
              tab === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "studio" ? "Media Studio" : t === "spots" ? "Audio Spots" : "Library"}
          </button>
        ))}
      </div>

      {tab === "library" && <LibraryTab />}
      {tab === "studio" && <MediaStudio />}
      {tab === "spots" && <AudioSpots />}
    </div>
  );
}

const LIB_VIEWS: { id: LibView; label: string; icon: typeof List }[] = [
  { id: "cards", label: "Cards", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "table", label: "Table", icon: TableIcon },
  { id: "kanban", label: "Kanban", icon: SquareKanban },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "map", label: "Map", icon: MapIcon },
];

type EditDraft = {
  name: string;
  description: string;
  status: SpotStatus;
  image: string | null;
  city: string;
  state: string;
  lat: string;
  lng: string;
};

function LibraryTab() {
  const [items, setItems] = useState<LibAudio[]>([]);
  const [meta, setMeta] = useState<Record<string, SpotMeta>>({});
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<LibView>("cards");
  const [showArchived, setShowArchived] = useState(false);
  const [editItem, setEditItem] = useState<LibAudio | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [deleteItem, setDeleteItem] = useState<LibAudio | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/audio");
      if (res.ok) setItems(await res.json());
    } catch {
      /* offline / supabase down — keep what we have */
    }
    setMeta(loadAllMeta());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch("/api/admin/audio", { method: "POST", body: fd });
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    load();
  }

  function openEdit(a: LibAudio) {
    const m = getMeta(a.id);
    setEditItem(a);
    setDraft({
      name: a.name,
      description: m.description,
      status: m.status,
      image: m.image,
      city: m.city,
      state: m.state,
      lat: m.lat === null ? "" : String(m.lat),
      lng: m.lng === null ? "" : String(m.lng),
    });
  }

  async function saveEdit() {
    if (!editItem || !draft) return;
    const name = draft.name.trim() || editItem.name;
    // Name is the canonical audio record field — persist it via the API (prod).
    if (name !== editItem.name) {
      await fetch(`/api/admin/audio/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).catch(() => {});
    }
    const nextMeta = saveMeta(editItem.id, {
      description: draft.description.trim(),
      status: draft.status,
      image: draft.image,
      city: draft.city.trim(),
      state: draft.state.trim(),
      lat: draft.lat.trim() === "" ? null : Number(draft.lat),
      lng: draft.lng.trim() === "" ? null : Number(draft.lng),
    });
    setItems((prev) => prev.map((i) => (i.id === editItem.id ? { ...i, name } : i)));
    setMeta((prev) => ({ ...prev, [editItem.id]: nextMeta }));
    setEditItem(null);
    setDraft(null);
    flash("Spot saved.");
  }

  async function toggleArchive(a: LibAudio) {
    await fetch(`/api/admin/audio/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !a.archived }),
    });
    await load();
    flash(a.archived ? "Restored from archive." : "Archived.");
  }
  async function confirmDelete() {
    if (!deleteItem) return;
    await fetch(`/api/admin/audio/${deleteItem.id}`, { method: "DELETE" });
    setDeleteItem(null);
    await load();
    flash("Deleted.");
  }
  function share(a: LibAudio) {
    const url = `${window.location.origin}/api/audio/${a.id}/file`;
    navigator.clipboard?.writeText(url).then(() => flash("Share link copied."), () => flash(url));
  }

  const src = (a: LibAudio) => `/api/audio/${a.id}/file`;
  const dl = (a: LibAudio) => `${a.name}.${fileExt(a)}`;

  const archivedCount = items.filter((a) => a.archived).length;
  const spots: Spot[] = useMemo(
    () =>
      items
        .filter((a) => (showArchived ? true : !a.archived))
        .map((a) => ({ ...a, ...DEFAULT_META, ...(meta[a.id] ?? {}) })),
    [items, meta, showArchived],
  );

  const actions = (a: LibAudio) => (
    <RowActions
      archived={Boolean(a.archived)}
      onEdit={() => openEdit(a)}
      onArchive={() => toggleArchive(a)}
      onShare={() => share(a)}
      onDelete={() => setDeleteItem(a)}
    />
  );

  const player = (a: LibAudio, props?: { compact?: boolean; className?: string }) => (
    <AudioPlayer src={src(a)} downloadName={dl(a)} {...props} />
  );

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept="audio/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload audio"}
          </Button>
          {archivedCount > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--brand))]" />
              Show archived ({archivedCount})
            </label>
          )}
          {toast && <span className="text-sm text-brand-strong">{toast}</span>}
        </div>
        {items.length > 0 && (
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
            {LIB_VIEWS.map((v) => {
              const Icon = v.icon;
              const active = v.id === view;
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-brand-strong")} /> {v.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {spots.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No audio yet. Upload files, or render a mix in the Media Studio." : "No audio in this view."}
          </CardContent>
        </Card>
      ) : view === "cards" ? (
        <CardsView spots={spots} actions={actions} player={player} />
      ) : view === "list" ? (
        <ListView spots={spots} actions={actions} player={player} />
      ) : view === "table" ? (
        <TableViewLib spots={spots} actions={actions} player={player} />
      ) : view === "kanban" ? (
        <KanbanView spots={spots} onOpen={openEdit} />
      ) : view === "calendar" ? (
        <CalendarView spots={spots} onOpen={openEdit} />
      ) : (
        <MapViewLib spots={spots} />
      )}

      {/* Edit spot dialog */}
      <Dialog open={Boolean(editItem)} onOpenChange={(o) => !o && (setEditItem(null), setDraft(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit spot</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <ImageField image={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Name</span>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Spot name" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Description</span>
                <Textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this spot is, who it's for, key message…" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Status</span>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as SpotStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPOT_STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SPOT_STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">City</span>
                  <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Austin" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">State</span>
                  <Input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} placeholder="TX" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Latitude</span>
                  <Input value={draft.lat} onChange={(e) => setDraft({ ...draft, lat: e.target.value })} placeholder="30.27" inputMode="decimal" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Longitude</span>
                  <Input value={draft.lng} onChange={(e) => setDraft({ ...draft, lng: e.target.value })} placeholder="-97.74" inputMode="decimal" />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">City/coordinates place this spot on the Map view.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => (setEditItem(null), setDraft(null))}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!draft?.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteItem)} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete audio?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteItem?.name}&rdquo; will be permanently removed from the library. This can&apos;t be undone.
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

/* ── Image picker field ──────────────────────────────────────────────── */

function ImageField({ image, onChange }: { image: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      onChange(await imageToDataUrl(file));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <SpotThumb image={image} size="lg" />
      <div className="flex items-center gap-2">
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files)} />
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
          <ImagePlus className="h-4 w-4" /> {busy ? "Processing…" : image ? "Replace image" : "Add image"}
        </Button>
        {image && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="h-4 w-4" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Views ───────────────────────────────────────────────────────────── */

type ViewProps = {
  spots: Spot[];
  actions: (a: Spot) => React.ReactNode;
  player: (a: Spot, props?: { compact?: boolean; className?: string }) => React.ReactNode;
};

function TitleWithThumb({ spot, size = "sm" }: { spot: Spot; size?: "sm" | "md" | "lg" }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate text-sm font-medium text-foreground" title={spot.name}>{spot.name}</span>
      <SpotThumb image={spot.image} alt={spot.name} size={size} />
    </div>
  );
}

function CardsView({ spots, actions, player }: ViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {spots.map((a) => (
        <Card key={a.id} className={cn(a.archived && "opacity-70")}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <TitleWithThumb spot={a} size="md" />
              {actions(a)}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={a.status} />
              {a.archived && <Badge variant="secondary" className="text-[10px]">Archived</Badge>}
            </div>
            {a.description && <p className="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>}
            {player(a)}
            <p className="text-xs text-muted-foreground">
              {fileExt(a).toUpperCase()} · {mb(a.sizeBytes)} · {dateFmt(a.createdAt)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListView({ spots, actions, player }: ViewProps) {
  return (
    <div className="space-y-2">
      {spots.map((a) => (
        <Card key={a.id} className={cn(a.archived && "opacity-70")}>
          <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
            <div className="min-w-0 lg:w-72">
              <TitleWithThumb spot={a} />
              <p className="mt-0.5 text-xs text-muted-foreground">
                {SPOT_STATUS_META[a.status].label} · {fileExt(a).toUpperCase()} · {mb(a.sizeBytes)}
              </p>
            </div>
            {player(a, { className: "flex-1" })}
            {actions(a)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableViewLib({ spots, actions, player }: ViewProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Spot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-[260px]">Player</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {spots.map((a) => (
              <TableRow key={a.id} className={cn(a.archived && "opacity-70")}>
                <TableCell className="max-w-[260px]">
                  <TitleWithThumb spot={a} />
                </TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell className="uppercase text-muted-foreground">{fileExt(a)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{mb(a.sizeBytes)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{dateFmt(a.createdAt)}</TableCell>
                <TableCell>{player(a, { compact: true })}</TableCell>
                <TableCell>{actions(a)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function KanbanView({ spots, onOpen }: { spots: Spot[]; onOpen: (a: Spot) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {SPOT_STATUS_ORDER.map((status) => {
        const items = spots.filter((s) => s.status === status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onOpen(s)}
                  className="flex w-full items-center gap-2 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-brand/50"
                >
                  <SpotThumb image={s.image} alt={s.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    {s.description && <p className="truncate text-[11px] text-muted-foreground">{s.description}</p>}
                  </div>
                </button>
              ))}
              {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground/60">Empty</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ spots, onOpen }: { spots: Spot[]; onOpen: (a: Spot) => void }) {
  const initial = useMemo(() => {
    const d = spots[0] ? new Date(spots[0].createdAt) : new Date(2026, 6, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [spots]);
  const [cursor, setCursor] = useState(initial);

  const first = new Date(cursor.year, cursor.month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const byDay = useMemo(() => {
    const map = new Map<number, Spot[]>();
    spots.forEach((s) => {
      const d = new Date(s.createdAt);
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), s]);
      }
    });
    return map;
  }, [spots, cursor]);

  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground hover:text-foreground">‹</button>
          <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
          <button onClick={() => shift(1)} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground hover:text-foreground">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => (
            <div key={i} className={cn("min-h-[76px] rounded-md border p-1", day ? "border-border" : "border-transparent")}>
              {day && (
                <>
                  <span className="text-xs text-muted-foreground">{day}</span>
                  <div className="mt-1 space-y-1">
                    {(byDay.get(day) ?? []).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onOpen(s)}
                        className="flex w-full items-center gap-1 truncate rounded bg-brand/15 px-1 py-0.5 text-left text-[10px] font-medium text-brand-strong"
                        title={s.name}
                      >
                        <SpotThumb image={s.image} alt={s.name} size="sm" className="h-3.5 w-3.5 rounded-[3px]" />
                        <span className="truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Spots placed by date added. Click one to edit.</p>
      </CardContent>
    </Card>
  );
}

function MapViewLib({ spots }: { spots: Spot[] }) {
  const located: AudioSpot[] = spots
    .filter((s) => s.lat !== null && s.lng !== null)
    .map((s) => ({
      id: s.id,
      name: s.name,
      advertiser: s.description || "—",
      status: s.status,
      durationSec: 0,
      start: s.createdAt.slice(0, 10),
      end: s.createdAt.slice(0, 10),
      city: s.city,
      state: s.state,
      lat: s.lat as number,
      lng: s.lng as number,
      plays: 0,
    }));

  if (located.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          No spots have a location yet. Edit a spot and add a city or latitude/longitude to plot it here.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-4">
        <SpotsMap spots={located} />
        <p className="mt-2 text-xs text-muted-foreground">{located.length} located spot{located.length === 1 ? "" : "s"} plotted. Click a marker for details.</p>
      </CardContent>
    </Card>
  );
}

/* ── Row actions menu ────────────────────────────────────────────────── */

function RowActions({
  archived,
  onEdit,
  onArchive,
  onShare,
  onDelete,
}: {
  archived: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const item = (label: string, Icon: typeof Pencil, onClick: () => void, destructive?: boolean) => (
    <button
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent",
        destructive ? "text-destructive hover:text-destructive" : "text-foreground",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-border bg-popover p-1 shadow-md">
          {item("Edit", Pencil, onEdit)}
          {item(archived ? "Unarchive" : "Archive", archived ? ArchiveRestore : Archive, onArchive)}
          {item("Share", Share2, onShare)}
          {item("Delete", Trash2, onDelete, true)}
        </div>
      )}
    </div>
  );
}
