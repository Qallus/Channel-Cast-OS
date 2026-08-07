"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Check, MapPin, Monitor, Plus, Search, SlidersHorizontal, Store, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, type Listing } from "@/lib/marketing/marketplace";
import { useCart } from "@/components/cart/cart";
import { CartButton } from "@/components/cart/cart-drawer";
import { cn } from "@/lib/utils";

const MarketplaceMap = dynamic(() => import("@/components/site/marketplace-map"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">Loading map…</div>,
});

export function MarketplaceBrowser({ listings }: { listings: Listing[] }) {
  const router = useRouter();
  const [where, setWhere] = useState("");
  const [type, setType] = useState<string>("all");
  const [maxBudget, setMaxBudget] = useState<string>("any");
  const [tags, setTags] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showMap, setShowMap] = useState(false); // mobile

  const { add, has, setOpen } = useCart();
  const allTypes = useMemo(() => Array.from(new Set(listings.map((l) => l.type))).sort(), [listings]);
  const allTags = useMemo(() => Array.from(new Set(listings.flatMap((l) => l.tags))).sort(), [listings]);
  const maxPrice = useMemo(() => Math.max(100, ...listings.map((l) => l.pricePerWeek)), [listings]);

  const filtered = useMemo(() => {
    const q = where.trim().toLowerCase();
    const budgetCap = maxBudget === "any" ? Infinity : Number(maxBudget);
    return listings.filter((l) => {
      if (type !== "all" && l.type !== type) return false;
      if (l.pricePerWeek > budgetCap) return false;
      if (priceMax != null && l.pricePerWeek > priceMax) return false;
      if (tags.length && !tags.every((t) => l.tags.includes(t))) return false;
      if (!q) return true;
      return [l.name, l.city, l.state, l.type, ...l.tags].join(" ").toLowerCase().includes(q);
    });
  }, [listings, where, type, maxBudget, priceMax, tags]);

  const activeFilters = (type !== "all" ? 1 : 0) + tags.length + (priceMax != null ? 1 : 0);
  const clearAll = () => { setType("all"); setTags([]); setPriceMax(null); setMaxBudget("any"); };

  return (
    <div>
      {/* Search combo bar */}
      <div className="sticky top-16 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1760px] flex-wrap items-center gap-3 px-5 py-3 sm:px-8">
          <div className="flex flex-1 items-center rounded-full border border-border bg-card shadow-sm">
            <label className="flex flex-1 flex-col px-4 py-1.5">
              <span className="text-[11px] font-semibold text-foreground">Where</span>
              <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Search city or space" className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </label>
            <span className="h-8 w-px bg-border" />
            <div className="hidden flex-col px-4 py-1 sm:flex">
              <span className="text-[11px] font-semibold text-foreground">Space type</span>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-auto w-auto gap-1 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 [&>svg]:opacity-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any type</SelectItem>
                  {allTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <span className="hidden h-8 w-px bg-border sm:block" />
            <div className="hidden flex-col px-4 py-1 sm:flex">
              <span className="text-[11px] font-semibold text-foreground">Budget</span>
              <Select value={maxBudget} onValueChange={setMaxBudget}>
                <SelectTrigger className="h-auto w-auto gap-1 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 [&>svg]:opacity-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any budget</SelectItem>
                  <SelectItem value="100">Under $100/wk</SelectItem>
                  <SelectItem value="200">Under $200/wk</SelectItem>
                  <SelectItem value="500">Under $500/wk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground"><Search className="h-4 w-4" /></span>
            <span className="w-1" />
          </div>
          <Button variant="outline" onClick={() => setFiltersOpen(true)} className="rounded-full">
            <SlidersHorizontal className="h-4 w-4" /> Filters{activeFilters ? ` · ${activeFilters}` : ""}
          </Button>
        </div>
      </div>

      {/* Split: list + map */}
      <div className="mx-auto grid max-w-[1760px] grid-cols-1 gap-0 px-0 lg:grid-cols-[1fr_40%]">
        <div className="px-5 pb-28 pt-6 sm:px-8">
          <p className="mb-4 text-sm text-muted-foreground">{filtered.length} ad space{filtered.length === 1 ? "" : "s"}{where ? ` matching “${where}”` : ""}</p>
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No ad spaces match your search. <button onClick={clearAll} className="font-medium text-brand-strong hover:underline">Clear filters</button>.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((l) => (
                <Link
                  key={l.slug}
                  href={`/marketplace/${l.slug}`}
                  onMouseEnter={() => setHovered(l.slug)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn("group relative overflow-hidden rounded-xl border bg-card transition-colors", hovered === l.slug ? "border-brand-strong" : "border-border hover:border-brand/50")}
                >
                  {l.imageUrl ? (
                    <img src={l.imageUrl} alt="" className="h-36 w-full object-cover" />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-[radial-gradient(80%_80%_at_50%_20%,hsl(var(--brand)/0.15),transparent)]"><Store className="h-9 w-9 text-brand-strong/70" /></div>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (has(l.slug)) { setOpen(true); } else { add({ slug: l.slug, name: l.name, type: l.type, city: l.city, state: l.state, imageUrl: l.imageUrl, pricePerWeek: l.pricePerWeek }); setOpen(true); } }}
                    aria-label={has(l.slug) ? "In campaign" : "Add to campaign"}
                    className={cn("absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-colors", has(l.slug) ? "bg-brand-strong text-background" : "bg-card/90 text-foreground hover:bg-brand hover:text-brand-foreground")}
                  >
                    {has(l.slug) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </button>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand-strong">{l.name}</p>
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-brand-strong">{l.type}</span>
                    </div>
                    {(l.city || l.state) && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {[l.city, l.state].filter(Boolean).join(", ")}</p>}
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {l.audiencePerWeek.toLocaleString("en-US")}/wk</span>
                      <span className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5" /> {l.devices}</span>
                      <span className="font-semibold text-foreground">{money(l.pricePerWeek)}/wk</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Map (desktop sticky) */}
        <div className="hidden lg:sticky lg:top-[7.5rem] lg:block lg:h-[calc(100vh-7.5rem)] lg:p-4">
          <MarketplaceMap listings={filtered} highlightSlug={hovered} onHover={setHovered} onSelect={(slug) => router.push(`/marketplace/${slug}`)} />
        </div>
      </div>

      {/* Sticky bottom search bar (mobile + desktop) */}
      <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
        <div className="flex w-full max-w-2xl items-center gap-2 rounded-full border border-border bg-card/95 py-2 pl-4 pr-2 shadow-2xl backdrop-blur">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="Search city or space"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{filtered.length} space{filtered.length === 1 ? "" : "s"}</span>
          <button onClick={() => setShowMap(true)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground lg:hidden">
            <MapPin className="h-3.5 w-3.5" /> Map
          </button>
          <CartButton className="shrink-0" />
          <Button size="sm" onClick={() => setFiltersOpen(true)} className="shrink-0 rounded-full">
            <SlidersHorizontal className="h-4 w-4" />{activeFilters ? ` ${activeFilters}` : ""}
          </Button>
        </div>
      </div>
      {showMap && (
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{filtered.length} ad spaces</p>
            <button onClick={() => setShowMap(false)} className="rounded-md border border-border p-1.5 text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="h-[calc(100%-3.25rem)] p-3">
            <MarketplaceMap listings={filtered} highlightSlug={hovered} onHover={setHovered} onSelect={(slug) => router.push(`/marketplace/${slug}`)} />
          </div>
        </div>
      )}

      {/* Filters modal */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Filters</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-foreground">Type of space</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["all", ...allTypes].map((t) => (
                  <button key={t} onClick={() => setType(t)} className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", t === type ? "border-foreground bg-accent text-foreground" : "border-border text-muted-foreground hover:border-foreground/40")}>{t === "all" ? "Any type" : t}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">Max price / week</p>
              <p className="text-xs text-muted-foreground">{priceMax != null ? `Up to ${money(priceMax)}` : "Any price"}</p>
              <Histogram listings={listings} max={maxPrice} value={priceMax} />
              <input type="range" min={0} max={maxPrice} step={10} value={priceMax ?? maxPrice} onChange={(e) => setPriceMax(Number(e.target.value) >= maxPrice ? null : Number(e.target.value))} className="mt-2 h-2 w-full cursor-pointer rounded-full bg-muted" style={{ accentColor: "hsl(var(--brand-strong))" }} />
            </div>

            {allTags.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground">Attributes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allTags.map((t) => {
                    const on = tags.includes(t);
                    return <button key={t} onClick={() => setTags((prev) => on ? prev.filter((x) => x !== t) : [...prev, t])} className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", on ? "border-foreground bg-accent text-foreground" : "border-border text-muted-foreground hover:border-foreground/40")}>{t}</button>;
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <button onClick={clearAll} className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline">Clear all</button>
            <Button onClick={() => setFiltersOpen(false)}>Show {filtered.length} space{filtered.length === 1 ? "" : "s"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Histogram({ listings, max, value }: { listings: Listing[]; max: number; value: number | null }) {
  const buckets = 28;
  const counts = new Array(buckets).fill(0);
  listings.forEach((l) => {
    const i = Math.min(buckets - 1, Math.floor((l.pricePerWeek / max) * buckets));
    counts[i]++;
  });
  const peak = Math.max(1, ...counts);
  const cap = value ?? max;
  return (
    <div className="mt-3 flex h-16 items-end gap-0.5">
      {counts.map((c, i) => {
        const bucketPrice = (i / buckets) * max;
        return <span key={i} className={cn("flex-1 rounded-sm", bucketPrice <= cap ? "bg-brand-strong/70" : "bg-muted")} style={{ height: `${Math.max(6, (c / peak) * 100)}%` }} />;
      })}
    </div>
  );
}
