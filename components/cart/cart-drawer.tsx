"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Plus, ShoppingBag, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { money } from "@/lib/marketing/marketplace";
import { cn } from "@/lib/utils";
import { itemTotal, useCart, weeksBetween, type CartItem } from "@/components/cart/cart";

type Catalog = Pick<CartItem, "slug" | "name" | "type" | "city" | "state" | "imageUrl" | "pricePerWeek">;

export function CartDrawer() {
  const { items, open, setOpen, remove, add, count } = useCart();
  const [catalog, setCatalog] = useState<Catalog[]>([]);

  useEffect(() => {
    if (!open || catalog.length) return;
    fetch("/api/marketplace/listings").then((r) => r.json()).then((d) => setCatalog(d.listings || [])).catch(() => {});
  }, [open, catalog.length]);

  const subtotal = items.reduce((s, i) => s + itemTotal(i), 0);
  const dated = items.find((i) => i.start && i.end);
  const upsell = catalog.filter((c) => !items.some((i) => i.slug === c.slug)).slice(0, 4);

  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-[calc(100vw-1.5rem)] flex-col bg-card shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <p className="flex items-center gap-2 text-lg font-semibold text-foreground"><ShoppingBag className="h-5 w-5 text-brand-strong" /> Your campaign {count ? `· ${count}` : ""}</p>
          <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="mt-10 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">No spaces yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add ad spaces from the marketplace to build a multi-location campaign.</p>
              <Button asChild variant="outline" className="mt-4" onClick={() => setOpen(false)}><Link href="/marketplace">Browse the marketplace</Link></Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((i) => {
                const w = weeksBetween(i.start, i.end);
                return (
                  <div key={i.slug} className="flex gap-3 rounded-xl border border-border p-3">
                    {i.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : <div className="h-16 w-16 shrink-0 rounded-lg bg-muted" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{i.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{i.type}{i.city ? ` · ${i.city}, ${i.state}` : ""}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {w > 0 ? <>{w} week{w > 1 ? "s" : ""} · <span className="font-semibold text-foreground">{money(itemTotal(i))}</span></> : <>{money(i.pricePerWeek)}/wk · <span className="text-brand-strong">set dates at checkout</span></>}
                      </p>
                    </div>
                    <button onClick={() => remove(i.slug)} aria-label="Remove" className="self-start rounded-md p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}

              {upsell.length > 0 && (
                <div className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add more reach</p>
                  <div className="mt-2 space-y-2">
                    {upsell.map((u) => (
                      <div key={u.slug} className="flex items-center gap-3 rounded-xl border border-border p-2">
                        {u.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                        ) : <div className="h-11 w-11 shrink-0 rounded-lg bg-muted" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.type} · {money(u.pricePerWeek)}/wk</p>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => add({ ...u, start: dated?.start, end: dated?.end })}><Plus className="h-3.5 w-3.5" /> Add</Button>
                      </div>
                    ))}
                  </div>
                  <Link href="/marketplace" onClick={() => setOpen(false)} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-strong hover:underline"><MapPin className="h-3.5 w-3.5" /> Browse all spaces</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{count} space{count > 1 ? "s" : ""} · subtotal</span>
              <span className="text-lg font-semibold text-foreground">{subtotal > 0 ? money(subtotal) : "—"}</span>
            </div>
            <Button asChild className="mt-3 w-full" onClick={() => setOpen(false)}><Link href="/checkout">Go to checkout <ArrowRight className="h-4 w-4" /></Link></Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">You won&apos;t be charged yet</p>
          </div>
        )}
      </aside>
    </>
  );
}

export function CartButton({ className }: { className?: string }) {
  const { count, setOpen } = useCart();
  return (
    <button onClick={() => setOpen(true)} className={cn("relative inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground", className)}>
      <ShoppingBag className="h-4 w-4" /> Campaign
      {count > 0 && <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-strong px-1 text-[11px] font-bold text-background">{count}</span>}
    </button>
  );
}
