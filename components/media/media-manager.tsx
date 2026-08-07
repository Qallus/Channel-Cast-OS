"use client";

import { useState } from "react";
import { Check, ImageIcon, Loader2, Pencil, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SITE_SLOTS, STOCK_IMAGES, siteSlotDefault, stockForType } from "@/lib/stock-images";
import type { Feature, ListingContentOverride } from "@/lib/marketing/listing-content";
import { cn } from "@/lib/utils";

type Listing = { slug: string; name: string; type: string };
type Overrides = { listings: Record<string, string>; slots: Record<string, string> };
type ContentMap = Record<string, ListingContentOverride>;
type PickTarget = { kind: "listings" | "slots"; id: string; label: string } | null;

export function MediaManager({ listings, initial, content: initialContent }: { listings: Listing[]; initial: Overrides; content: ContentMap }) {
  const [ov, setOv] = useState<Overrides>({ listings: { ...initial.listings }, slots: { ...initial.slots } });
  const [target, setTarget] = useState<PickTarget>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [content, setContent] = useState<ContentMap>({ ...initialContent });
  const [editing, setEditing] = useState<Listing | null>(null);
  const [savingC, setSavingC] = useState(false);

  function setImage(kind: "listings" | "slots", id: string, src: string) {
    setOv((o) => {
      const map = { ...o[kind] };
      if (src) map[id] = src;
      else delete map[id];
      return { ...o, [kind]: map };
    });
  }

  async function saveImages() {
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

  function patchContent(slug: string, patch: ListingContentOverride) {
    setContent((c) => {
      const cur = { ...(c[slug] || {}), ...patch };
      // drop empty entries
      (Object.keys(cur) as (keyof ListingContentOverride)[]).forEach((k) => {
        const v = cur[k];
        if (v === "" || v === undefined || (Array.isArray(v) && v.length === 0)) delete cur[k];
      });
      const next = { ...c };
      if (Object.keys(cur).length) next[slug] = cur;
      else delete next[slug];
      return next;
    });
  }

  async function saveContent() {
    setSavingC(true);
    try {
      await fetch("/api/admin/listing-content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
    } catch {
      /* ignore */
    }
    setSavingC(false);
    setEditing(null);
  }

  const listSrc = (l: Listing) => ov.listings[l.slug] || stockForType(l.type);
  const slotSrc = (key: string) => ov.slots[key] || siteSlotDefault(key);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Set the photo and details for each marketplace space. Pick from the royalty-free library or paste any image URL.</p>
        <div className="flex shrink-0 items-center gap-2">
          {saved ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong"><Check className="h-4 w-4" /> Saved</span> : null}
          <Button onClick={saveImages} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save photos</Button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Marketing images</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SITE_SLOTS.map((slot) => (
            <Tile key={slot.key} src={slotSrc(slot.key)} title={slot.label} overridden={!!ov.slots[slot.key]} onChange={() => { setTarget({ kind: "slots", id: slot.key, label: slot.label }); setUrlDraft(ov.slots[slot.key] || ""); }} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Marketplace spaces ({listings.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Tile
              key={l.slug}
              src={listSrc(l)}
              title={l.name}
              subtitle={l.type}
              overridden={!!ov.listings[l.slug]}
              customized={!!content[l.slug]}
              onChange={() => { setTarget({ kind: "listings", id: l.slug, label: l.name }); setUrlDraft(ov.listings[l.slug] || ""); }}
              onDetails={() => setEditing(l)}
            />
          ))}
        </div>
      </section>

      {/* Image picker */}
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

      {/* Content editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Listing details{editing ? ` · ${editing.name}` : ""}</DialogTitle></DialogHeader>
          {editing && (() => {
            const slug = editing.slug;
            const c = content[slug] || {};
            const featText = (c.features || []).map((f) => `${f.label}${f.detail ? ` | ${f.detail}` : ""}`).join("\n");
            const setFeatures = (text: string) => {
              const features: Feature[] = text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
                const [label, ...rest] = line.split("|");
                const detail = rest.join("|").trim();
                return { label: label.trim(), detail: detail || undefined };
              });
              patchContent(slug, { features });
            };
            return (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Leave a field blank to use the smart default derived from this space.</p>
                <Field label="Headline"><Input value={c.headline || ""} onChange={(e) => patchContent(slug, { headline: e.target.value })} placeholder="Reach a present audience at…" /></Field>
                <Field label="Tagline"><Input value={c.tagline || ""} onChange={(e) => patchContent(slug, { tagline: e.target.value })} placeholder="Short one-liner" /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Rating (0–5)"><Input type="number" min={0} max={5} step={0.01} value={c.rating ?? ""} onChange={(e) => patchContent(slug, { rating: e.target.value === "" ? undefined : Math.max(0, Math.min(5, Number(e.target.value))) })} placeholder="auto" /></Field>
                  <Field label="Review count"><Input type="number" min={0} value={c.reviewCount ?? ""} onChange={(e) => patchContent(slug, { reviewCount: e.target.value === "" ? undefined : Math.max(0, Math.round(Number(e.target.value))) })} placeholder="auto" /></Field>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={c.favorite === true} onChange={(e) => patchContent(slug, { favorite: e.target.checked ? true : false })} className="h-4 w-4 accent-[hsl(var(--brand-strong))]" />
                  <span className="font-medium text-foreground">Show &ldquo;Advertiser favorite&rdquo; badge</span>
                </label>
                <Field label="What this location offers">
                  <Textarea rows={7} value={featText} onChange={(e) => setFeatures(e.target.value)} placeholder={"One feature per line, e.g.\nFoot traffic | ~3,400 people / week\nLive feed video | On-device camera view"} />
                  <p className="mt-1 text-xs text-muted-foreground">Format: <code>Label | detail</code> — one per line. Blank uses the default set.</p>
                </Field>
                <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                  <Button variant="ghost" onClick={() => { patchContent(slug, { headline: undefined, tagline: undefined, rating: undefined, reviewCount: undefined, features: [] }); }}>Reset to defaults</Button>
                  <Button onClick={saveContent} disabled={savingC}>{savingC ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save details</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Tile({ src, title, subtitle, overridden, customized, onChange, onDetails }: { src: string; title: string; subtitle?: string; overridden: boolean; customized?: boolean; onChange: () => void; onDetails?: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative h-32 bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
        <div className="absolute left-2 top-2 flex gap-1.5">
          {overridden ? <span className="inline-flex items-center gap-1 rounded-full bg-brand-strong px-2 py-0.5 text-[10px] font-bold text-background"><ImageIcon className="h-3 w-3" /> Custom photo</span> : null}
          {customized ? <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background"><Pencil className="h-3 w-3" /> Edited</span> : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 gap-1.5">
          {onDetails ? <Button size="sm" variant="outline" onClick={onDetails}><Pencil className="h-3.5 w-3.5" /></Button> : null}
          <Button size="sm" variant="outline" onClick={onChange}>Photo</Button>
        </div>
      </div>
    </div>
  );
}
