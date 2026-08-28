"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clapperboard, Copy, ImageIcon, Link as LinkIcon, Loader2, Monitor, Plus, Trash2, Upload,
} from "lucide-react";

import { EmptyState, FormField, PageHeader } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type DisplayLoop, type DisplayLoopItem, type DisplayMedia,
  DEFAULT_IMAGE_SECONDS, PROVIDER_LABEL, formatSeconds, loopSeconds, parseVideoLink,
} from "@/lib/displays/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScreensTab } from "@/components/displays/screens-tab";
import { cn } from "@/lib/utils";

type Tab = "media" | "loops" | "screens";

export function DisplaysPage() {
  const [tab, setTab] = useState<Tab>("media");
  const [media, setMedia] = useState<DisplayMedia[]>([]);
  const [loops, setLoops] = useState<DisplayLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, l] = await Promise.all([
        fetch("/api/admin/displays/media").then((r) => r.json()),
        fetch("/api/admin/displays/loops").then((r) => r.json()),
      ]);
      setMedia(m.media ?? []);
      setLoops(l.loops ?? []);
    } catch { /* page still renders */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-5">
      <PageHeader icon={Monitor} title="Digital Displays" description="Creative library, playback loops, and what each screen is showing." />

      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {([["media", "Creative"], ["loops", "Loops"], ["screens", "Screens"]] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={cn("-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "border-brand-strong text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
        {toast && <span className="ml-2 text-sm text-brand-strong">{toast}</span>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : tab === "media" ? (
        <MediaLibrary media={media} onChanged={load} flash={flash} />
      ) : tab === "loops" ? (
        <LoopBuilder loops={loops} media={media} onChanged={load} flash={flash} />
      ) : (
        <ScreensTab loops={loops} flash={flash} />
      )}
    </div>
  );
}

// ── Creative ─────────────────────────────────────────────────────────────────
function MediaLibrary({ media, onChanged, flash }: { media: DisplayMedia[]; onChanged: () => void; flash: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkSeconds, setLinkSeconds] = useState("30");

  // Parsed live, so the provider is confirmed before anything is saved.
  const parsedLink = parseVideoLink(linkUrl);

  async function addLink() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/displays/media", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl, name: linkName, duration: Number(linkSeconds) || 30 }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d?.error || "That link could not be added."); return; }
      setLinkOpen(false); setLinkUrl(""); setLinkName(""); flash("Video link added."); onChanged();
    } finally { setBusy(false); }
  }

  /**
   * Dimensions and video duration are read in the browser and sent with the
   * upload — the server would need a media decoder to work them out otherwise.
   */
  async function probe(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
    const url = URL.createObjectURL(file);
    try {
      if (file.type.startsWith("image/")) {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        return { width: img.naturalWidth, height: img.naturalHeight };
      }
      const v = document.createElement("video");
      v.preload = "metadata";
      await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = rej; v.src = url; });
      return { width: v.videoWidth, height: v.videoHeight, duration: Math.round(v.duration) };
    } catch {
      return {};
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function upload(files: FileList) {
    setBusy(true); setError(null);
    let ok = 0;
    for (const file of Array.from(files)) {
      const meta = await probe(file);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name.replace(/\.[^.]+$/, ""));
      if (meta.width) fd.append("width", String(meta.width));
      if (meta.height) fd.append("height", String(meta.height));
      if (meta.duration) fd.append("duration", String(meta.duration));
      const res = await fetch("/api/admin/displays/media", { method: "POST", body: fd });
      if (res.ok) ok++;
      else { const d = await res.json().catch(() => ({})); setError(d?.error || `${file.name} failed to upload.`); }
    }
    setBusy(false);
    if (ok) { flash(`${ok} file${ok === 1 ? "" : "s"} uploaded.`); onChanged(); }
  }

  async function remove(m: DisplayMedia) {
    if (!confirm(`Delete "${m.name}"? Any loop using it will drop the item.`)) return;
    await fetch(`/api/admin/displays/media?id=${encodeURIComponent(m.id)}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Images and video shown on screens. Upload a file (up to 200MB) or link a YouTube, Vimeo or direct video URL.</p>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-destructive">{error}</span>}
          <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) void upload(e.target.files); e.target.value = ""; }} />
          <Button variant="outline" onClick={() => { setLinkOpen(true); setError(null); }}><LinkIcon className="h-4 w-4" /> Add video link</Button>
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload creative</>}
          </Button>
        </div>
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add a video link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FormField label="Video URL">
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://youtube.com/watch?v=… or https://…/spot.mp4" autoFocus />
            </FormField>
            {linkUrl.trim() && (
              <p className={cn("text-xs", parsedLink ? "text-brand-strong" : "text-destructive")}>
                {parsedLink
                  ? `Recognised as ${PROVIDER_LABEL[parsedLink.provider]}.`
                  : "Not a supported link — use YouTube, Vimeo, or a direct .mp4/.webm URL."}
              </p>
            )}
            <FormField label="Name"><Input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Spring promo" /></FormField>
            <FormField label="How long to show it (seconds)">
              <Input type="number" min={1} value={linkSeconds} onChange={(e) => setLinkSeconds(e.target.value)} />
            </FormField>
            <p className="text-xs text-muted-foreground">
              YouTube and Vimeo play in an embed, so the loop advances on this timer rather than when the video ends. A direct file plays natively.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button onClick={addLink} disabled={busy || !parsedLink}>Add video</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {media.length === 0 ? (
        <EmptyState message="No creative yet. Upload a file or add a video link to get started." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {media.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex aspect-video items-center justify-center bg-muted/40">
                {m.kind === "image" && m.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                ) : m.source === "link" && m.provider !== "direct" ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <LinkIcon className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wide">{PROVIDER_LABEL[(m.provider ?? "direct") as keyof typeof PROVIDER_LABEL]}</span>
                  </div>
                ) : m.url ? (
                  <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge className="border-transparent bg-muted text-[10px] capitalize">{m.kind}</Badge>
                  {m.source === "link" && <Badge className="border-transparent bg-brand/15 text-[10px] text-brand-strong">{PROVIDER_LABEL[(m.provider ?? "direct") as keyof typeof PROVIDER_LABEL] ?? "Link"}</Badge>}
                  {m.width && m.height ? <span>{m.width}×{m.height}</span> : null}
                  {m.duration_sec ? <span>· {formatSeconds(Number(m.duration_sec))}</span> : null}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { navigator.clipboard?.writeText(m.url ?? ""); flash("URL copied."); }}>
                    <Copy className="h-3.5 w-3.5" /> URL
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(m)} aria-label="Delete creative"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Loops ────────────────────────────────────────────────────────────────────
type DraftItem = Pick<DisplayLoopItem, "media_id" | "duration_sec" | "transition" | "enabled"> & { media?: DisplayMedia };

function LoopBuilder({ loops, media, onChanged, flash }: {
  loops: DisplayLoop[]; media: DisplayMedia[]; onChanged: () => void; flash: (m: string) => void;
}) {
  const [editing, setEditing] = useState<DisplayLoop | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  function start(loop: DisplayLoop | null) {
    setEditing(loop);
    setName(loop?.name ?? "");
    setDescription(loop?.description ?? "");
    setOrientation(loop?.orientation ?? "landscape");
    setItems((loop?.items ?? []).map((i) => ({
      media_id: i.media_id, duration_sec: Number(i.duration_sec), transition: i.transition, enabled: i.enabled, media: i.media,
    })));
    setOpen(true);
  }

  function addMedia(m: DisplayMedia) {
    setItems((prev) => [...prev, {
      media_id: m.id,
      // A video's own length is the sensible default; a still needs a dwell.
      duration_sec: m.kind === "video" ? Number(m.duration_sec) || DEFAULT_IMAGE_SECONDS : DEFAULT_IMAGE_SECONDS,
      transition: "fade", enabled: true, media: m,
    }]);
  }
  const patch = (i: number, p: Partial<DraftItem>) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  const move = (i: number, dir: -1 | 1) => setItems((prev) => {
    const j = i + dir;
    if (j < 0 || j >= prev.length) return prev;
    const next = prev.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const total = useMemo(() => loopSeconds(items), [items]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/displays/loops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing?.id, name, description, orientation, items }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); flash(d?.error || "Save failed."); return; }
      setOpen(false); onChanged(); flash("Loop saved.");
    } finally { setBusy(false); }
  }

  async function remove(loop: DisplayLoop) {
    if (!confirm(`Delete "${loop.name}"?`)) return;
    await fetch(`/api/admin/displays/loops?id=${encodeURIComponent(loop.id)}`, { method: "DELETE" });
    onChanged();
  }

  if (open) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{editing ? "Edit loop" : "New loop"}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save loop"}</Button>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 lg:grid-cols-[1fr_1fr_180px]">
          <FormField label="Loop name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Storefront daytime" /></FormField>
          <FormField label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></FormField>
          <FormField label="Orientation">
            <Select value={orientation} onValueChange={(v) => setOrientation(v as "landscape" | "portrait")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="landscape">Landscape</SelectItem><SelectItem value="portrait">Portrait</SelectItem></SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loop order</h3>
              <span className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"} · {formatSeconds(total)} total</span>
            </div>
            <div className="space-y-2 p-3">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Add creative from the right to build the loop.</p>
              ) : items.map((it, i) => (
                <div key={`${it.media_id}-${i}`} className={cn("flex flex-wrap items-center gap-2 rounded-lg border border-border p-2", !it.enabled && "opacity-50")}>
                  <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
                  <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-muted/40">
                    {it.media?.kind === "image" && it.media.url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={it.media.url} alt="" className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center"><Clapperboard className="h-4 w-4 text-muted-foreground" /></div>}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{it.media?.name ?? "Creative"}</span>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Input type="number" min={1} value={it.duration_sec}
                      onChange={(e) => patch(i, { duration_sec: Number(e.target.value) || 1 })} className="h-8 w-16 text-right" />s
                  </label>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1 text-xs text-muted-foreground disabled:opacity-30 hover:text-foreground">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded px-1 text-xs text-muted-foreground disabled:opacity-30 hover:text-foreground">↓</button>
                  <button type="button" onClick={() => patch(i, { enabled: !it.enabled })} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                    {it.enabled ? "On" : "Off"}
                  </button>
                  <button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="rounded px-1 text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creative library</h3>
            </div>
            <div className="max-h-[520px] space-y-1.5 overflow-y-auto p-3">
              {media.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">Upload creative first.</p> : media.map((m) => (
                <button key={m.id} type="button" onClick={() => addMedia(m)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left transition-colors hover:border-brand/40">
                  <div className="h-9 w-14 shrink-0 overflow-hidden rounded bg-muted/40">
                    {m.kind === "image" && m.url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.url} alt="" className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center"><Clapperboard className="h-3.5 w-3.5 text-muted-foreground" /></div>}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.name}</span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">A loop is the ordered set of creative a screen cycles through.</p>
        <Button onClick={() => start(null)}><Plus className="h-4 w-4" /> New loop</Button>
      </div>
      {loops.length === 0 ? (
        <EmptyState message="No loops yet. Create one and add creative to it." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loops.map((l) => (
            <div key={l.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{l.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.description || "No description"}</p>
                </div>
                <Badge className="border-transparent bg-muted text-[10px] capitalize">{l.orientation}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {(l.items ?? []).length} item{(l.items ?? []).length === 1 ? "" : "s"} · {formatSeconds(loopSeconds(l.items ?? []))} · v{l.version}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => start(l)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => remove(l)} aria-label="Delete loop"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
