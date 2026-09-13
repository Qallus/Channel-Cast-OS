"use client";

import { useEffect, useState } from "react";
import { Eye, Play, Radar, Repeat } from "lucide-react";

const STEPS = [
  { icon: Eye, label: "Vision", note: "Sees the audience" },
  { icon: Radar, label: "Match", note: "Selects targeted audio content" },
  { icon: Play, label: "Play", note: "Hi fidelity audio content" },
  { icon: Repeat, label: "Repeat", note: "Plays unique content again" },
] as const;

const DWELL_MS = 2200;

/* The sense→play loop, one step at a time, sized to sit over the 3D device.
   Each step slides in, holds, then slides out before the next arrives. */
export function LoopOverlay({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Fade the current step out just before swapping, so the two never overlap.
    const out = setTimeout(() => setOn(false), DWELL_MS - 420);
    const next = setTimeout(() => {
      setI((n) => (n + 1) % STEPS.length);
      setOn(true);
    }, DWELL_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(next);
    };
  }, [i]);

  const step = STEPS[i];
  const Icon = step.icon;

  return (
    <div className={`pointer-events-none select-none ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Front Entrance
        </span>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand-strong">
          Live loop
        </span>
      </div>

      {/* Fixed height so the card doesn't jump as steps swap. */}
      <div className="mt-4 h-[5.5rem]">
        <div
          className="flex h-full items-center gap-4 rounded-2xl border border-border bg-card/90 p-4 shadow-2xl backdrop-blur transition-all duration-400 ease-out"
          style={{ opacity: on ? 1 : 0, transform: `translateX(${on ? 0 : 28}px)` }}
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand-strong">
            <Icon className="h-7 w-7" />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-brand" />
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">
              {i + 1} · {step.label}
            </p>
            <p className="truncate text-sm text-muted-foreground">{step.note}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {STEPS.map((s, n) => (
          <span
            key={s.label}
            className={`h-1.5 rounded-full transition-all duration-300 ${n === i ? "w-6 bg-brand" : "w-1.5 bg-border"}`}
          />
        ))}
      </div>

      <div className="mt-3 flex h-7 items-end justify-center gap-0.5">
        {[6, 14, 22, 12, 26, 18, 30, 16, 24, 10, 20, 28, 14, 8, 22].map((h, n) => (
          <span
            key={n}
            className="cc-eq-bar w-1.5 rounded-full bg-brand-strong/70"
            style={{ height: `${h}px`, animationDelay: `${(n % 5) * 0.12}s` }}
          />
        ))}
      </div>
    </div>
  );
}
