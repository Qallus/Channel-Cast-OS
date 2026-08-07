"use client";

import { useState } from "react";
import { BarChart3, Building2, CalendarClock, DollarSign, Footprints, MapPin, Monitor, PieChart, Radar, ShieldCheck, Sparkles, Star, Users, Video, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Feature } from "@/lib/marketing/listing-content";

const ICONS: [string, LucideIcon][] = [
  ["foot traffic", Footprints], ["traffic", Footprints],
  ["demographic", PieChart], ["audience", Users], ["daypart", PieChart],
  ["play window", CalendarClock], ["schedule", CalendarClock], ["play", CalendarClock],
  ["report", BarChart3], ["motion", Radar], ["video", Video], ["camera", Video], ["live feed", Video],
  ["review", Star], ["property", Building2], ["spot", Monitor], ["device", Monitor],
  ["privacy", ShieldCheck], ["local", MapPin], ["budget", DollarSign], ["price", DollarSign],
];

function iconFor(label: string): LucideIcon {
  const t = label.toLowerCase();
  for (const [k, I] of ICONS) if (t.includes(k)) return I;
  return Sparkles;
}

function Row({ f }: { f: Feature }) {
  const Icon = iconFor(f.label);
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground/80" />
      <div>
        <p className="text-sm font-medium text-foreground">{f.label}</p>
        {f.detail ? <p className="text-xs text-muted-foreground">{f.detail}</p> : null}
      </div>
    </div>
  );
}

export function LocationOffers({ features }: { features: Feature[] }) {
  const [open, setOpen] = useState(false);
  const top = features.slice(0, 10);

  return (
    <section className="mt-8 border-t border-border pt-8">
      <h2 className="text-xl font-semibold text-foreground">What this location offers</h2>
      <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {top.map((f, i) => <Row key={i} f={f} />)}
      </div>
      {features.length > 10 && (
        <Button variant="outline" className="mt-6" onClick={() => setOpen(true)}>Show all {features.length} features</Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>What this location offers</DialogTitle></DialogHeader>
          <div>
            {features.map((f, i) => (
              <div key={i} className="border-b border-border py-3 last:border-0"><Row f={f} /></div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
