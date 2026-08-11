"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles, Trash2, Upload, Video } from "lucide-react";

import { genId, useCollection } from "@/lib/crm/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// "Train Your Device" — a starting-point training ground where device and
// placement-site owners upload example images/videos of their real audience and
// tag the demographic, building a dataset to tune what AI Vision plays on site.
// v1 collects & organizes the training samples; the inference/tuning loop follows.
type TrainingSample = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  audience: string;
  note: string;
  createdAt: string;
};

const AUDIENCES = ["Families", "Commuters", "Students", "Fitness", "Shoppers", "Tourists", "Seniors", "Professionals", "Nightlife"];

export function TrainDevice() {
  const { items, loaded, create, remove } = useCollection<TrainingSample>("device_training", []);
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "device-training");
      try {
        const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Upload failed."); continue; }
        create({ id: genId("train"), url: data.url, mediaType: file.type.startsWith("video") ? "video" : "image", audience, note, createdAt: new Date().toISOString() });
      } catch {
        setError("Upload failed. Check your connection and try again.");
      }
    }
    setUploading(false);
    setNote("");
  }

  const groups = AUDIENCES.map((a) => ({ audience: a, samples: items.filter((s) => s.audience === a) })).filter((g) => g.samples.length);

  return (
    <div className="space-y-6">
      <Link href="/app/admin/devices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to devices</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Train Your Device</h1>
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand-strong">Beta</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Upload example photos or short clips of who actually visits your location and tag the demographic. Over time this trains your device&apos;s AI Vision to play content geared to your location&apos;s real audience.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{loaded ? `${items.length} sample${items.length === 1 ? "" : "s"}` : "…"}</span>
      </div>

      {/* Upload panel */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-4 w-4 text-brand-strong" /> Add training samples</p>

        <p className="mt-4 mb-1.5 text-xs font-medium text-muted-foreground">1 · Tag the demographic</p>
        <div className="flex flex-wrap gap-1.5">
          {AUDIENCES.map((a) => (
            <button key={a} onClick={() => setAudience(a)} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", audience === a ? "border-brand-strong bg-brand/10 text-brand-strong" : "border-border text-muted-foreground hover:text-foreground")}>{a}</button>
          ))}
        </div>

        <p className="mt-4 mb-1.5 text-xs font-medium text-muted-foreground">2 · Add a note (optional)</p>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weekday lunch crowd, front entrance" className="max-w-md" />

        <p className="mt-4 mb-1.5 text-xs font-medium text-muted-foreground">3 · Upload images or video</p>
        <label className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition hover:border-brand-strong/50 hover:bg-accent/40", uploading && "pointer-events-none opacity-60")}>
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-brand-strong" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
          <span className="text-sm font-medium text-foreground">{uploading ? "Uploading…" : "Drop files here or tap to browse"}</span>
          <span className="text-xs text-muted-foreground">Tagged as <span className="font-medium text-brand-strong">{audience}</span> · images or short clips (max 8MB each)</span>
          <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        </label>
        {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
      </div>

      {/* Training gallery */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No training samples yet. Tag a demographic and upload your first examples above.</div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.audience}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold">{g.audience}</h2>
                <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{g.samples.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {g.samples.map((s) => (
                  <div key={s.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
                    {s.mediaType === "video" ? (
                      <div className="flex aspect-video items-center justify-center bg-muted"><Video className="h-6 w-6 text-muted-foreground" /></div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.url} alt={s.note || g.audience} className="aspect-video w-full object-cover" />
                    )}
                    {s.note && <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">{s.note}</p>}
                    <button onClick={() => remove(s.id)} aria-label="Delete sample" className="absolute right-1.5 top-1.5 rounded-md bg-background/80 p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
