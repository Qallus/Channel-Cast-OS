"use client";

import { useState } from "react";
import { Check, Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { money } from "@/lib/marketing/marketplace";
import { useCart } from "@/components/cart/cart";

export function BookingCard({ slug, name, type, city, state, imageUrl, pricePerWeek, audiencePerWeek, devices }: {
  slug: string; name: string; type: string; city?: string; state?: string; imageUrl?: string | null;
  pricePerWeek: number; audiencePerWeek: number; devices: number;
}) {
  const { add, setOpen, has } = useCart();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const weeks = (() => {
    if (!start || !end) return 0;
    const s = new Date(`${start}T12:00:00`).getTime();
    const e = new Date(`${end}T12:00:00`).getTime();
    const days = Math.round((e - s) / 86_400_000);
    return days > 0 ? Math.max(1, Math.ceil(days / 7)) : 0;
  })();
  const total = weeks * pricePerWeek;
  const inCart = has(slug);

  function reserve() {
    add({ slug, name, type, city, state, imageUrl, pricePerWeek, start: start || undefined, end: end || undefined });
    setOpen(true);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        {weeks > 0 ? (
          <>{money(total)} <span className="text-sm font-normal text-muted-foreground">for {weeks} week{weeks > 1 ? "s" : ""}</span></>
        ) : (
          <>{money(pricePerWeek)} <span className="text-sm font-normal text-muted-foreground">/ week</span></>
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Start date</span>
          <DatePicker value={start} onChange={setStart} placeholder="Add date" />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">End date</span>
          <DatePicker value={end} onChange={setEnd} placeholder="Add date" />
        </label>
      </div>

      {weeks > 0 && (
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between"><dt className="text-muted-foreground">{money(pricePerWeek)} × {weeks} week{weeks > 1 ? "s" : ""}</dt><dd className="text-foreground">{money(total)}</dd></div>
          <div className="flex items-center justify-between font-semibold"><dt className="text-foreground">Total</dt><dd className="text-foreground">{money(total)}</dd></div>
        </dl>
      )}

      <Button onClick={reserve} className="mt-4 w-full">{inCart ? <><Check className="h-4 w-4" /> In your campaign</> : "Reserve"}</Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">You won&apos;t be charged yet · book multiple locations</p>

      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between"><dt className="text-muted-foreground">Est. audience</dt><dd className="font-medium text-foreground">{audiencePerWeek.toLocaleString("en-US")}/wk</dd></div>
        <div className="flex items-center justify-between"><dt className="text-muted-foreground">Devices</dt><dd className="font-medium text-foreground">{devices}</dd></div>
        <div className="flex items-center justify-between"><dt className="text-muted-foreground">Type</dt><dd className="font-medium text-foreground">{type}</dd></div>
      </dl>
      <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Monitor className="h-3.5 w-3.5" /> Real plays tracked and reported.</p>
    </div>
  );
}

// Compact sticky bar for mobile — adds to the campaign cart.
export function MobileReserveBar({ item, rating, reviewCount }: { item: { slug: string; name: string; type: string; city?: string; state?: string; imageUrl?: string | null; pricePerWeek: number }; rating: number; reviewCount: number }) {
  const { add, setOpen, has } = useCart();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{money(item.pricePerWeek)} <span className="text-sm font-normal text-muted-foreground">/ wk</span></p>
          <p className="text-xs text-muted-foreground">★ {rating.toFixed(2)} · {reviewCount} reviews</p>
        </div>
        <Button onClick={() => { add(item); setOpen(true); }}>{has(item.slug) ? "In campaign" : "Reserve"}</Button>
      </div>
    </div>
  );
}
