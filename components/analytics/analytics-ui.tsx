"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { Stat, Tone } from "@/lib/analytics/analytics-data";
import { cn } from "@/lib/utils";

// Slider item widths: ~1.5 per row on mobile, ~2.5 on tablet, full grid on desktop.
const ITEM = "snap-start shrink-0 min-w-[66%] sm:min-w-[40%] lg:min-w-0";

function toneClass(tone?: Tone) {
  switch (tone) {
    case "brand":
      return "text-brand-strong";
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "destructive":
      return "text-destructive";
    case "muted":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

/** Responsive row: horizontal snap-slider on mobile/tablet, N-column grid on desktop. */
export function StatSlider({ cols = 5, children }: { cols?: 5 | 6; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x lg:grid lg:overflow-visible lg:pb-0",
        cols === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5",
      )}
    >
      {children}
    </div>
  );
}

/** A stat tile that links to its source page. */
export function LinkStat({ stat }: { stat: Stat }) {
  return (
    <Link
      href={stat.href}
      className={cn(ITEM, "group rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/50")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-hover:text-brand-strong" />
      </div>
      <p className={cn("mt-1 text-2xl font-semibold", toneClass(stat.tone))}>{stat.value}</p>
      {stat.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{stat.hint}</p> : null}
    </Link>
  );
}

/** Slider wrapper for chart cards (same responsive behaviour, wider items). */
export function ChartSlider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
      {children}
    </div>
  );
}

export const CHART_ITEM = "snap-start shrink-0 min-w-[85%] sm:min-w-[46%] lg:min-w-0";

export function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h2>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
