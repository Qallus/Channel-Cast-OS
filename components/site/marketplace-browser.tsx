"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Monitor, Search, Store, Users } from "lucide-react";

import { money, type Listing } from "@/lib/marketing/marketplace";
import { cn } from "@/lib/utils";

export function MarketplaceBrowser({ listings }: { listings: Listing[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("all");

  const types = useMemo(() => Array.from(new Set(listings.map((l) => l.type))).sort(), [listings]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (type !== "all" && l.type !== type) return false;
      if (!q) return true;
      return [l.name, l.city, l.state, l.type, ...l.tags].join(" ").toLowerCase().includes(q);
    });
  }, [listings, query, type]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search by name, city, type, or tag…" className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring" />
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {["all", ...types].map((t) => (
          <button key={t} onClick={() => setType(t)} className={cn("shrink-0 rounded-md px-3.5 py-2 text-sm font-medium capitalize transition-colors", t === type ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>{t === "all" ? "All spaces" : t}</button>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{filtered.length} ad space{filtered.length === 1 ? "" : "s"}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => (
          <Link key={l.slug} href={`/marketplace/${l.slug}`} className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-brand/50">
            {l.imageUrl ? (
              <img src={l.imageUrl} alt="" className="h-32 w-full object-cover" />
            ) : (
              <div className="flex h-32 items-center justify-center bg-[radial-gradient(80%_80%_at_50%_20%,hsl(var(--brand)/0.15),transparent)]"><Store className="h-9 w-9 text-brand-strong/70" /></div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand-strong">{l.name}</p>
                <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-brand-strong">{l.type}</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {l.city}, {l.state}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {l.audiencePerWeek.toLocaleString("en-US")}/wk</span>
                <span className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5" /> {l.devices} device{l.devices === 1 ? "" : "s"}</span>
                <span className="font-semibold text-foreground">{money(l.pricePerWeek)}/wk</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && <p className="mt-10 text-center text-sm text-muted-foreground">No ad spaces match your search.</p>}
    </div>
  );
}
