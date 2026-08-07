"use client";

import { useState } from "react";
import Link from "next/link";
import { Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { money } from "@/lib/marketing/marketplace";

export function BookingCard({ slug, pricePerWeek, audiencePerWeek, devices, type }: { slug: string; pricePerWeek: number; audiencePerWeek: number; devices: number; type: string }) {
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
  const params = start && end && weeks > 0 ? `?start=${start}&end=${end}` : "";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        {weeks > 0 ? (
          <>{money(total)} <span className="text-sm font-normal text-muted-foreground">for {weeks} week{weeks > 1 ? "s" : ""}</span></>
        ) : (
          <>{money(pricePerWeek)} <span className="text-sm font-normal text-muted-foreground">/ week</span></>
        )}
      </p>

      {/* Date selection */}
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

      <Button asChild className="mt-4 w-full"><Link href={`/marketplace/${slug}/book${params}`}>{weeks > 0 ? "Reserve" : "Check availability"}</Link></Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">You won&apos;t be charged yet</p>

      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between"><dt className="text-muted-foreground">Est. audience</dt><dd className="font-medium text-foreground">{audiencePerWeek.toLocaleString("en-US")}/wk</dd></div>
        <div className="flex items-center justify-between"><dt className="text-muted-foreground">Devices</dt><dd className="font-medium text-foreground">{devices}</dd></div>
        <div className="flex items-center justify-between"><dt className="text-muted-foreground">Type</dt><dd className="font-medium text-foreground">{type}</dd></div>
      </dl>
      <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Monitor className="h-3.5 w-3.5" /> Real plays tracked and reported.</p>
    </div>
  );
}
