"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, type Listing } from "@/lib/marketing/marketplace";

const WINDOWS = ["All day", "Business hours", "Mornings", "Evenings", "Weekends"];

export function BookingForm({ listing }: { listing: Listing }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState("");
  const [weeks, setWeeks] = useState("4");
  const [start, setStart] = useState("");
  const [win, setWin] = useState("All day");

  const w = Math.max(1, Number(weeks) || 1);
  const total = listing.pricePerWeek * w;

  function toCheckout() {
    const q = new URLSearchParams({ slug: listing.slug, campaign: campaign.trim() || "Untitled campaign", weeks: String(w), start: start || "", window: win });
    router.push(`/checkout?${q.toString()}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href={`/marketplace/${listing.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {listing.name}</Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Book {listing.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{listing.city}, {listing.state} · {money(listing.pricePerWeek)}/week · est. {listing.audiencePerWeek.toLocaleString("en-US")} audience/wk</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Campaign name</span><Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Summer Sale 2026" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Weeks</span><Input type="number" min={1} value={weeks} onChange={(e) => setWeeks(e.target.value)} /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Start date</span><DatePicker value={start} onChange={setStart} placeholder="Pick a date" /></label>
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Play window</span>
            <Select value={win} onValueChange={setWin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{WINDOWS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">You&apos;ll add or record your audio spot after checkout.</p>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Summary</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{money(listing.pricePerWeek)} × {w} wk</dt><dd className="font-medium text-foreground">{money(total)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Window</dt><dd className="font-medium text-foreground">{win}</dd></div>
            </dl>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold text-foreground"><span>Total</span><span>{money(total)}</span></div>
            <Button className="mt-5 w-full" onClick={toCheckout}>Continue to checkout <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
