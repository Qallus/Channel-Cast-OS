"use client";

import { useState } from "react";
import { Baby, Briefcase, Dumbbell, GraduationCap, Plane, ShoppingBag, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Audience = { id: string; label: string; icon: typeof Baby; detected: string; message: string };

// Demonstrates AI Vision → dynamic content: pick an audience and the device
// swaps to the spot that fits. Illustrative only — no real inference here.
const AUDIENCES: Audience[] = [
  { id: "families", label: "Families", icon: Baby, detected: "Detected: a family group", message: "“Family movie night — 2-for-1 tickets at Harbor Cinemas this weekend.”" },
  { id: "commuters", label: "Commuters", icon: Briefcase, detected: "Detected: morning commuters", message: "“Beat the rush — 20% off your coffee before 8 AM.”" },
  { id: "students", label: "Students", icon: GraduationCap, detected: "Detected: college students", message: "“Student night — half-price wings with a valid ID.”" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, detected: "Detected: gym-goers", message: "“New class just dropped — your first session is free at Riverside Fitness.”" },
  { id: "shoppers", label: "Shoppers", icon: ShoppingBag, detected: "Detected: weekend shoppers", message: "“Flash sale — an extra 15% off, this weekend only.”" },
  { id: "tourists", label: "Tourists", icon: Plane, detected: "Detected: out-of-town visitors", message: "“New in town? Join the free downtown walking tour at noon.”" },
];

export function AiVisionDemo() {
  const [active, setActive] = useState<Audience>(AUDIENCES[0]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      {/* Audience selector */}
      <div>
        <p className="text-sm text-muted-foreground">Tap an audience — watch the device switch its message the way on-device AI Vision would in real life.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
          {AUDIENCES.map((a) => {
            const on = a.id === active.id;
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => setActive(a)}
                aria-pressed={on}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                  on ? "border-brand-strong bg-brand/10 text-brand-strong" : "border-border text-muted-foreground hover:border-brand-strong/40 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" /> {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Device screen */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Storefront device — live</span>
          <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand-strong">AI Vision</span>
        </div>

        {/* key re-mounts the panel so the fade + waveform replay on each switch */}
        <div key={active.id} className="cc-fade-up mt-4 rounded-xl border border-border bg-background p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">{active.detected}</p>
          <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{active.message}</p>
          <div className="mt-4 flex items-center gap-2">
            <Volume2 className="h-4 w-4 shrink-0 text-brand-strong" />
            <div className="flex h-6 items-end gap-0.5">
              {[8, 16, 24, 14, 28, 20, 12, 26, 18, 10, 22, 16].map((h, i) => (
                <span key={`${active.id}-${i}`} className="cc-eq-bar w-1 rounded-full bg-brand-strong/70" style={{ height: h, animationDelay: `${(i % 5) * 0.1}s` }} />
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">Now playing</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">On-device AI Vision reads the audience — no images stored or uploaded — and instantly plays the spot that fits.</p>
      </div>
    </div>
  );
}
