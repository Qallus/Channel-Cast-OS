"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Share2,
  Table as TableIcon,
  Trash2,
  Upload,
} from "lucide-react";

import { AudioPlayer } from "@/components/audio/audio-player";
import { AudioSpots } from "@/components/audio/audio-spots";
import { MediaStudio } from "@/components/audio/media-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type LibAudio = { id: string; name: string; sizeBytes: number; createdAt: string; mime: string; archived?: boolean };
type Tab = "library" | "studio" | "spots";
type LibView = "cards" | "list" | "table";

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
const fileExt = (a: LibAudio) => (a.mime?.includes("wav") ? "wav" : a.mime?.includes("mpeg") || a.mime?.includes("mp3") ? "mp3" : a.mime?.split("/")[1] || "audio");
const dateFmt = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

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
];

function LibraryTab() {
  const [items, setItems] = useState<LibAudio[]>([]);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<LibView>("cards");
  const [showArchived, setShowArchived] = useState(false);
  const [editItem, setEditItem] = useState<LibAudio | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteItem, setDeleteItem] = useState<LibAudio | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => setItems(await (await fetch("/api/admin/audio")).json()), []);
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

  async function saveRename() {
    if (!editItem) return;
    await fetch(`/api/admin/audio/${editItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditItem(null);
    await load();
    flash("Renamed.");
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
  const visible = items.filter((a) => (showArchived ? true : !a.archived));

  const actions = (a: LibAudio) => (
    <RowActions
      archived={Boolean(a.archived)}
      onEdit={() => {
        setEditItem(a);
        setEditName(a.name);
      }}
      onArchive={() => toggleArchive(a)}
      onShare={() => share(a)}
      onDelete={() => setDeleteItem(a)}
    />
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
          {toast && <span className="text-sm text-brand">{toast}</span>}
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
                  <Icon className={cn("h-4 w-4", active && "text-brand")} /> {v.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No audio yet. Upload files, or render a mix in the Media Studio." : "No audio in this view."}
          </CardContent>
        </Card>
      ) : view === "cards" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((a) => (
            <Card key={a.id} className={cn(a.archived && "opacity-70")}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                    {a.archived && <Badge variant="secondary" className="shrink-0 text-[10px]">Archived</Badge>}
                  </div>
                  {actions(a)}
                </div>
                <AudioPlayer src={src(a)} downloadName={dl(a)} />
                <p className="text-xs text-muted-foreground">{fileExt(a).toUpperCase()} · {mb(a.sizeBytes)} · {dateFmt(a.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {visible.map((a) => (
            <Card key={a.id} className={cn(a.archived && "opacity-70")}>
              <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
                <div className="flex min-w-0 items-center gap-2 lg:w-64">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{fileExt(a).toUpperCase()} · {mb(a.sizeBytes)}</p>
                  </div>
                  {a.archived && <Badge variant="secondary" className="shrink-0 text-[10px]">Archived</Badge>}
                </div>
                <AudioPlayer src={src(a)} downloadName={dl(a)} className="flex-1" />
                {actions(a)}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[260px]">Player</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((a) => (
                  <TableRow key={a.id} className={cn(a.archived && "opacity-70")}>
                    <TableCell className="max-w-[220px] truncate font-medium text-foreground">
                      {a.name}
                      {a.archived && <Badge variant="secondary" className="ml-2 text-[10px]">Archived</Badge>}
                    </TableCell>
                    <TableCell className="uppercase text-muted-foreground">{fileExt(a)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{mb(a.sizeBytes)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{dateFmt(a.createdAt)}</TableCell>
                    <TableCell>
                      <AudioPlayer src={src(a)} downloadName={dl(a)} compact />
                    </TableCell>
                    <TableCell>{actions(a)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Rename dialog */}
      <Dialog open={Boolean(editItem)} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename audio</DialogTitle>
          </DialogHeader>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Track name" onKeyDown={(e) => e.key === "Enter" && saveRename()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={saveRename} disabled={!editName.trim()}>Save</Button>
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
