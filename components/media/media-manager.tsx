"use client";

import { useState } from "react";
import { Check, ImageIcon, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SITE_SLOTS, STOCK_IMAGES, siteSlotDefault, stockForType } from "@/lib/stock-images";
import { cn } from "@/lib/utils";

type Listing = { slug: string; name: string; type: string };
type Overrides = { listings: Record<string, string>; slots: Record<string, string> };
type Target = { kind: "listings" | "slots"; id: string; label: string; fallback: string } | null;

export function MediaManager({ listings, initial }: { listings: Listing[]; initial: Overrides }) {
  const [ov, setOv] = useState<Overrides>({ listings: { ...initial.listings }, slots: { ...initial.slots } });
  const [target, setTarget] = useState<Target>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setImage(kind: "listings" | "slots", id: string, src: string) {
    setOv((o) => {
      const map = { ...o[kind] };
      if (src) map[id] = src;
      else delete map[id];
      return { ...o, [kind]: map };
    });
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/admin/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ov) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  const listSrc = (l: Listing) => ov.listings[l.slug] || stockForType(l.type);
  const slotSrc = (key: string) => ov.slots[key] || siteSlotDefault(key);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Set the photo for each marketplace space and marketing slot. Pick from the royalty-free library or paste any image URL.</p>
        <div className="flex shrink-0 items-center gap-2">
          {saved ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong"><Check className="h-4 w-4" /> Saved</span> : null}
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save changes</Button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Marketing images</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SITE_SLOTS.map((slot) => (
            <Tile key={slot.key} src={slotSrc(slot.key)} title={slot.label} overridden={!!ov.slots[slot.key]} onChange={() => { setTarget({ kind: "slots", id: slot.key, label: slot.label, fallback: siteSlotDefault(slot.key) }); setUrlDraft(ov.slots[slot.key] || ""); }} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Marketplace spaces ({listings.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Tile key={l.slug} src={listSrc(l)} title={l.name} subtitle={l.type} overridden={!!ov.listings[l.slug]} onChange={() => { setTarget({ kind: "listings", id: l.slug, label: l.name, fallback: stockForType(l.type) }); setUrlDraft(ov.listings[l.slug] || ""); }} />
          ))}
        </div>
      </section>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Choose a photo{target ? ` · ${target.label}` : ""}</DialogTitle></DialogHeader>
          {target && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stock library</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {STOCK_IMAGES.map((img) => {
                    const active = ov[target.kind][target.id] === img.src;
                    return (
                      <button key={img.id} onClick={() => { setImage(target.kind, target.id, img.src); setTarget(null); }} className={cn("group overflow-hidden rounded-lg border-2 transition-colors", active ? "border-brand-strong" : "border-transparent hover:border-brand/50")}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt={img.label} className="h-20 w-full object-cover" />
                        <span className="block truncate bg-card px-1.5 py-1 text-[11px] text-muted-foreground">{img.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Or paste an image URL</p>
                <div className="flex gap-2">
                  <Input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="https://…/photo.jpg" />
                  <Button variant="outline" onClick={() => { setImage(target.kind, target.id, urlDraft.trim()); setTarget(null); }} disabled={!urlDraft.trim()}>Use URL</Button>
                </div>
              </div>
              <button onClick={() => { setImage(target.kind, target.id, ""); setTarget(null); }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Reset to default
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ src, title, subtitle, overridden, onChange }: { src: string; title: string; subtitle?: string; overridden: boolean; onChange: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative h-32 bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
        {overridden ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-strong px-2 py-0.5 text-[10px] font-bold text-background"><ImageIcon className="h-3 w-3" /> Custom</span> : null}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Button size="sm" variant="outline" onClick={onChange}>Change</Button>
      </div>
    </div>
  );
}
