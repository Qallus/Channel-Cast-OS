"use client";

import { useEffect, useRef } from "react";

export type Stat = { label: string; value: string };

const VISIBLE = 3; // cards on screen at once
const DWELL_MS = 2600;

/* A single row of stat cards: three visible, the rest reachable by auto-advance
   or by dragging. Scrolling is native (so trackpad and touch work for free);
   the pointer handlers only add click-and-drag for a mouse. */
export function StatRail({ stats, className }: { stats: Stat[]; className?: string }) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // One card plus one gap — measured rather than assumed, so the step stays
    // correct at any container width.
    const step = () => {
      const first = rail.firstElementChild as HTMLElement | null;
      if (!first) return 0;
      const gap = parseFloat(getComputedStyle(rail).columnGap || "0") || 0;
      return first.offsetWidth + gap;
    };

    let held = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const advance = () => {
      const s = step();
      if (!s || held) return;
      const last = Math.max(0, stats.length - VISIBLE);
      const at = Math.round(rail.scrollLeft / s);
      const next = at >= last ? 0 : at + 1;
      rail.scrollTo({ left: next * s, behavior: "smooth" });
    };
    if (!reduce) timer = setInterval(advance, DWELL_MS);

    // Hold the carousel while the pointer is on it, so it never slides out
    // from under someone reading or dragging.
    const hold = () => { held = true; };
    const release = () => { held = false; };
    rail.addEventListener("pointerenter", hold);
    rail.addEventListener("pointerleave", release);

    // Click-and-drag for mouse users; touch already pans natively.
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    const down = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      dragging = true;
      held = true;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
      rail.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      rail.scrollLeft = startLeft - (e.clientX - startX);
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      held = false;
      if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId);
    };
    rail.addEventListener("pointerdown", down);
    rail.addEventListener("pointermove", move);
    rail.addEventListener("pointerup", up);
    rail.addEventListener("pointercancel", up);

    return () => {
      if (timer) clearInterval(timer);
      rail.removeEventListener("pointerenter", hold);
      rail.removeEventListener("pointerleave", release);
      rail.removeEventListener("pointerdown", down);
      rail.removeEventListener("pointermove", move);
      rail.removeEventListener("pointerup", up);
      rail.removeEventListener("pointercancel", up);
    };
  }, [stats.length]);

  return (
    <div
      ref={railRef}
      className={`pointer-events-auto flex cursor-grab snap-x snap-mandatory gap-2 overflow-x-auto text-center [-ms-overflow-style:none] [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden ${className ?? ""}`}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          // basis: a third of the row once the two gaps are taken out.
          className="cc-fade-up shrink-0 basis-[calc((100%-1rem)/3)] snap-start rounded-lg border border-border bg-card/90 p-2 shadow-lg backdrop-blur"
          style={{ animationDelay: `${0.35 + i * 0.09}s` }}
        >
          <p className="text-lg font-semibold text-foreground">{s.value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
