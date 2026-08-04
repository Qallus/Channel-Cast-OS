"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import s from "./device-anim.module.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QualificationForm } from "@/components/site/qualification-form";

const SC = 66 / 72; // device "width 66" scale, matches the reference proportions

const d = (secs: number): CSSProperties => ({ ["--d" as string]: `${secs}s` } as CSSProperties);

/* ── device glyph (wide, short rectangle with AI sensor + grille) ────────── */

function DeviceGroup({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse className={s.dShadow} cx="36" cy="44.5" rx="26" ry="3" />
      <rect className={s.dTop} x="28.5" y="9" width="15" height="8" rx="3" />
      <circle className={s.dLens} cx="36" cy="12.4" r="2.8" />
      <circle className={s.dPupil} cx="36" cy="12.4" r="1.4" />
      <rect className={s.dBody} x="8" y="16" width="56" height="24" rx="7" />
      <g className={s.dGrille}>
        {[21, 27, 33, 39, 45, 51].flatMap((cx) =>
          [27, 33].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.25" />),
        )}
      </g>
    </g>
  );
}

export function DeviceGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 48" className={className} role="img" aria-label="Channel Cast device">
      <DeviceGroup />
    </svg>
  );
}

function Cloud({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path className={s.cloud} d="M198 66 Q196 48 214 48 Q220 36 236 42 Q252 38 252 54 Q264 56 260 68 Q256 74 232 72 L210 72 Q198 74 198 66 Z" />
      <circle className={s.cloudI} cx="220" cy="59" r="2" />
      <circle className={s.cloudI} cx="230" cy="59" r="2" />
      <circle className={s.cloudI} cx="240" cy="59" r="2" />
    </g>
  );
}

/* ── canonical process steps ─────────────────────────────────────────────── */

export type Step = { n: number; title: string; short: string; detail: string; tag: string };

export const HOW_STEPS: Step[] = [
  { n: 1, title: "Vision-activated audio device", short: "Sense", tag: "Hardware", detail: "A weatherproof device with an AI sensor watches for presence on-site. When someone's nearby it's ready to play — processed on the device, privacy-first, no images stored." },
  { n: 2, title: "Audio files managed in the dashboard", short: "Manage", tag: "Software", detail: "You upload, record, and organize your audio spots in the Channel Cast dashboard, then assign them to a device or an ad space — all from your browser." },
  { n: 3, title: "File deployed to the cloud", short: "Deploy", tag: "Software → Network", detail: "Your chosen spot is pushed to the cloud, queued and ready to sync to the right devices in seconds — no USB sticks, no site visits." },
  { n: 4, title: "Targeted to your specific ad space", short: "Target", tag: "Hardware + Software", detail: "The spot lands on the devices at your booked ad space and plays the moment the sensor detects a real, present audience — the hardware and software working as one." },
];

/* ── Walkthrough (Version C): accordion drives a synced animation ─────────── */

export function DeviceWalkthrough({ steps = HOW_STEPS }: { steps?: Step[] }) {
  const [active, setActive] = useState(0);
  const hovering = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const playRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    function stop() {
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
    }
    function play() {
      stop();
      if (!reduced && !hovering.current) timer.current = setInterval(() => {
        if (!hovering.current) setActive((i) => (i + 1) % steps.length);
      }, 4000);
    }
    playRef.current = play;
    stopRef.current = stop;
    play();
    return stop;
  }, [steps.length]);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card"
      onMouseEnter={() => { hovering.current = true; stopRef.current(); }}
      onMouseLeave={() => { hovering.current = false; playRef.current(); }}
    >
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        {/* LEFT · accordion */}
        <div className="flex flex-col gap-1 border-b border-border p-5 lg:border-b-0 lg:border-r">
          {steps.map((st, i) => {
            const on = i === active;
            return (
              <div key={st.n}>
                <button
                  onClick={() => { setActive(i); playRef.current(); }}
                  aria-expanded={on}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    on ? "border-brand-strong bg-brand/5 shadow-[0_0_0_3px_hsl(var(--brand-strong)/0.14)]" : "border-border hover:border-brand-strong/40",
                  )}
                >
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", on ? cn(s.accPulse, "bg-brand-strong text-background") : "bg-muted text-foreground")}>{st.n}</span>
                  <span className="flex-1 text-sm font-semibold text-foreground">{st.title}</span>
                  <span className={cn("text-muted-foreground transition-transform", on && "rotate-90 text-brand-strong")}>›</span>
                </button>
                <div className={cn("grid transition-all duration-300", on ? "mt-1 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <div className="overflow-hidden pl-[50px] pr-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">{st.detail}</p>
                    <span className="mt-2 inline-block rounded-full bg-brand/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-brand-strong">{st.tag}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT · synced stage */}
        <div className={cn(s.stage, "min-h-[300px] bg-[radial-gradient(80%_90%_at_50%_6%,hsl(var(--brand)/0.09),transparent_70%)]")}>
          <div className={s.bg} aria-hidden>
            <span className={s.grid} />
            <span className={s.blob} />
            <span style={{ left: "12%", top: "22%", width: 6, height: 6, animationDuration: "9s" }} />
            <span style={{ left: "82%", top: "28%", width: 5, height: 5, animationDuration: "11s", animationDelay: ".8s" }} />
            <span style={{ left: "66%", top: "72%", width: 7, height: 7, animationDuration: "13s", animationDelay: ".3s" }} />
            <span style={{ left: "22%", top: "74%", width: 5, height: 5, animationDuration: "10s", animationDelay: "1.2s" }} />
            <span style={{ left: "46%", top: "12%", width: 4, height: 4, animationDuration: "12s", animationDelay: ".5s" }} />
            <span style={{ left: "90%", top: "58%", width: 4, height: 4, animationDuration: "8s", animationDelay: ".9s" }} />
          </div>

          <div className={cn(s.scene, active === 0 && s.sceneOn)}>
            <svg viewBox="0 0 260 200" className="h-auto w-full max-h-[264px]" role="img" aria-label="Device senses presence">
              <circle className={s.ring} cx="130" cy="96" r="5" />
              <circle className={cn(s.ring, s.ring2)} cx="130" cy="96" r="5" />
              <circle className={cn(s.ring, s.ring3)} cx="130" cy="96" r="5" />
              <DeviceGroup x={97} y={96} scale={SC} />
              <text className={s.label} x="130" y="168">Sensing presence on-site</text>
            </svg>
          </div>

          <div className={cn(s.scene, active === 1 && s.sceneOn)}>
            <div className="w-[90%] max-w-[290px] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <div className="flex items-center gap-1.5 border-b border-border bg-brand/5 px-3 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-border" /><span className="h-1.5 w-1.5 rounded-full bg-border" /><span className="h-1.5 w-1.5 rounded-full bg-border" />
                <span className="ml-1.5 text-xs font-bold text-foreground">Audio library</span>
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                {[
                  { name: "Summer Sale · 15s", on: true },
                  { name: "Weekend Promo · 20s", on: false },
                  { name: "Store Hours · 10s", on: false },
                ].map((row, ri) => (
                  <div key={ri} className={cn("flex items-center gap-2.5 rounded-lg border px-2.5 py-2", row.on ? "border-brand-strong bg-brand/8" : "border-transparent")}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-strong text-[8px] text-background">▶</span>
                    <span className="text-xs font-semibold text-foreground">{row.name}</span>
                    <span className="ml-auto flex h-4 items-end gap-0.5">
                      {[6, 12, 9, 14, 7].map((h, hi) => (
                        <i key={hi} className={cn("w-[2.5px] rounded-sm", row.on ? s.htmlBar : "bg-brand-strong/40")} style={{ height: h, animationDelay: `${hi * 0.12}s` }} />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={cn(s.scene, active === 2 && s.sceneOn)}>
            <svg viewBox="0 0 260 200" className="h-auto w-full max-h-[264px]" role="img" aria-label="File deploys to the cloud">
              <path id="cc-up" className={s.track} d="M130 128 L130 66" />
              <Cloud x={-100} y={-6} />
              <DeviceGroup x={97} y={118} scale={SC} />
              <g>
                <rect className={s.chipBox} x="-15" y="-9" width="30" height="18" rx="4" />
                <rect className={s.chipBar} x="-9" y="-2" width="2.6" height="4" rx="1" />
                <rect className={s.chipBar} x="-4.5" y="-5" width="2.6" height="10" rx="1" />
                <rect className={s.chipBar} x="0" y="-4" width="2.6" height="8" rx="1" />
                <rect className={s.chipBar} x="4.5" y="-6" width="2.6" height="12" rx="1" />
                <animateMotion dur="2.4s" repeatCount="indefinite"><mpath href="#cc-up" /></animateMotion>
              </g>
              <text className={s.label} x="130" y="188">Deploying to the cloud</text>
            </svg>
          </div>

          <div className={cn(s.scene, active === 3 && s.sceneOn)}>
            <svg viewBox="0 0 260 200" className="h-auto w-full max-h-[264px]" role="img" aria-label="Spot plays at your ad space">
              <path id="cc-dn" className={s.track} d="M95 62 Q140 84 168 116" />
              <Cloud x={-145} y={-4} />
              <g>
                {[86, 86, 86, 86, 86].map((y, bi) => (
                  <rect key={bi} className={s.bar} x={150 + bi * 9} y={y} width="5" height="18" rx="1.5" style={{ animationDelay: `${[0, 0.16, 0.32, 0.1, 0.26][bi]}s` }} />
                ))}
              </g>
              <DeviceGroup x={140} y={112} scale={SC} />
              <circle className={s.ringImpact} cx="171" cy="120" r="5">
                <animate attributeName="r" dur="1.8s" repeatCount="indefinite" keyTimes="0;0.2;1" values="5;26;26" />
                <animate attributeName="opacity" dur="1.8s" repeatCount="indefinite" keyTimes="0;0.2;1" values="0.9;0;0" />
              </circle>
              <circle className={s.packet} r="4"><animateMotion dur="1.8s" repeatCount="indefinite"><mpath href="#cc-dn" /></animateMotion></circle>
              <text className={s.label} x="130" y="188">Playing at your ad space</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Version B · text-chip process flows ─────────────────────────────────── */

export function ChipStepper({ steps = HOW_STEPS }: { steps?: Step[] }) {
  return (
    <div className={cn(s.stage, "rounded-2xl border border-border bg-[radial-gradient(80%_90%_at_50%_6%,hsl(var(--brand)/0.07),transparent_70%)] px-6 py-8")}>
      <div className={cn(s.rail, "flex justify-between")}>
        <span className={s.fill} />
        {steps.map((st, i) => (
          <div key={st.n} className="relative z-[1] flex w-1/4 flex-col items-center gap-2.5" style={d(i * 1.4)}>
            <span className={cn(s.nodeDot, "h-[22px] w-[22px] rounded-full border-2 border-border bg-card")} />
            <span className="text-center text-[11px] font-semibold leading-tight text-muted-foreground">{st.short === "Sense" ? "Vision device" : st.short === "Manage" ? "Managed in dashboard" : st.short === "Deploy" ? "Deployed to cloud" : "Targeted to ad space"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChipVertical({ steps = HOW_STEPS }: { steps?: Step[] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-[radial-gradient(80%_90%_at_50%_6%,hsl(var(--brand)/0.07),transparent_70%)] p-6">
      {steps.map((st, i) => (
        <div key={st.n}>
          <div className={cn(s.stepGlow, "flex items-center gap-3 rounded-xl border border-border bg-brand/5 px-3.5 py-3")} style={d(i * 1.5)}>
            <span className={cn(s.badge, "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-strong text-xs font-bold text-background")} style={d(i * 1.5)}>{st.n}</span>
            <span className="text-[13.5px] font-semibold text-foreground">{st.title}</span>
          </div>
          {i < steps.length - 1 && <div className={s.vlink} style={d(i * 1.5)}><b /></div>}
        </div>
      ))}
    </div>
  );
}

export function ChipInline({ steps = HOW_STEPS }: { steps?: Step[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-border bg-[radial-gradient(80%_90%_at_50%_6%,hsl(var(--brand)/0.07),transparent_70%)] px-6 py-7">
      {steps.map((st, i) => (
        <span key={st.n} className="contents">
          <span className={cn(s.stepGlow, "rounded-full border border-border bg-brand/5 px-3.5 py-2 text-sm font-semibold text-foreground")} style={d(i * 1.5)}>{st.title}</span>
          {i < steps.length - 1 && <span className={cn(s.arrow, "font-bold text-muted-foreground")} style={d(i * 1.5 + 0.6)}>→</span>}
        </span>
      ))}
    </div>
  );
}

export function DeviceCaption({ steps = HOW_STEPS }: { steps?: Step[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={cn(s.stage, "bg-[radial-gradient(80%_90%_at_50%_6%,hsl(var(--brand)/0.08),transparent_70%)]")}>
        <svg viewBox="0 0 440 150" className="block h-auto w-full" role="img" aria-label="Data travels between two devices">
          <path id="cc-mini" className={s.track} d="M96 78 Q220 20 344 78" />
          <circle className={s.ring} cx="96" cy="80" r="5" />
          <DeviceGroup x={63} y={66} scale={SC} />
          <DeviceGroup x={311} y={66} scale={SC} />
          <circle className={s.ringImpact} cx="344" cy="80" r="5">
            <animate attributeName="r" dur="2.4s" repeatCount="indefinite" keyTimes="0;0.18;1" values="5;30;30" />
            <animate attributeName="opacity" dur="2.4s" repeatCount="indefinite" keyTimes="0;0.18;1" values="0.9;0;0" />
          </circle>
          <circle className={s.packet} r="4.5"><animateMotion dur="2.4s" repeatCount="indefinite"><mpath href="#cc-mini" /></animateMotion></circle>
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 border-t border-border px-5 py-4">
        {steps.map((st, i) => (
          <span key={st.n} className="contents">
            <span className={cn(s.stepGlow, "rounded-full border border-border bg-brand/5 px-3.5 py-1.5 text-sm font-semibold text-foreground")} style={d(i * 1.5)}>{st.short}</span>
            {i < steps.length - 1 && <span className={cn(s.arrow, "font-bold text-muted-foreground")} style={d(i * 1.5 + 0.6)}>→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Free vs Paid placement scene (toggle + revenue counter) ──────────────── */

function EqBars() {
  return (
    <g>
      {[150, 158, 166, 174, 182, 190, 198].map((x, i) => (
        <rect key={x} className={s.bar} x={x} y="98" width="5" height="16" rx="1.5" style={{ animationDelay: `${[0, 0.16, 0.32, 0.1, 0.26, 0.2, 0.34][i]}s` }} />
      ))}
    </g>
  );
}

export function PlacementScene({ minDailyVisitors }: { minDailyVisitors?: number } = {}) {
  const [mode, setMode] = useState<"free" | "paid">("free");
  const [rev, setRev] = useState(0);

  useEffect(() => {
    if (mode !== "paid") return;
    const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRev(0);
    if (reduced) { setRev(248.5); return; }
    const t = setInterval(() => setRev((r) => (r > 999 ? 0 : r + 0.5 + Math.random() * 3.2)), 220);
    return () => clearInterval(t);
  }, [mode]);

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex gap-1.5 p-4 pb-0">
        {(["free", "paid"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-selected={mode === m}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl border px-3 py-3 text-sm font-bold transition-colors",
              mode === m ? "border-brand-strong bg-brand/8 text-foreground shadow-[0_0_0_3px_hsl(var(--brand-strong)/0.13)]" : "border-border text-muted-foreground hover:border-brand-strong/40",
            )}
          >
            {m === "free" ? "Free placement" : "Paid placement"}
            <span className={cn("text-[11px] font-semibold", mode === m ? "text-brand-strong" : "text-muted-foreground")}>{m === "free" ? "You have the traffic" : "You earn the revenue"}</span>
          </button>
        ))}
      </div>

      <div className={cn(s.stage, "m-4 min-h-[268px] rounded-xl border border-border bg-[radial-gradient(80%_90%_at_50%_4%,hsl(var(--brand)/0.10),transparent_70%)]")}>
        {/* FREE */}
        <div className={cn(s.scene, mode === "free" && s.sceneOn)}>
          <div className="absolute left-4 top-4 flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <span>Foot traffic · High</span>
            <span className="flex h-4 items-end gap-[3px]">{[7, 11, 14, 16].map((h) => <i key={h} className="w-[5px] rounded-sm bg-brand-strong" style={{ height: h }} />)}</span>
          </div>
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-card px-2.5 py-1.5 text-xs font-bold text-success shadow-sm">● $0 to host</span>
          <svg viewBox="0 0 360 200" className="h-full w-full" role="img" aria-label="A busy location hosts a device for free">
            <circle className={s.tdot} cx="18" cy="48" r="3" style={{ animationDelay: "0s" }} />
            <circle className={s.tdot} cx="12" cy="60" r="2.3" style={{ animationDelay: "1.1s" }} />
            <circle className={s.tdot} cx="24" cy="42" r="3.3" style={{ animationDelay: "2.2s" }} />
            <circle className={s.tdot} cx="16" cy="54" r="2.6" style={{ animationDelay: "3.3s" }} />
            <circle className={s.tdot} cx="20" cy="66" r="2.2" style={{ animationDelay: "1.7s" }} />
            <circle className={s.ring} cx="180" cy="120" r="5" />
            <circle className={cn(s.ring, s.ring2)} cx="180" cy="120" r="5" />
            <EqBars />
            <DeviceGroup x={147} y={120} scale={SC} />
            <text className={s.label} x="180" y="184">We provide the device — free</text>
          </svg>
        </div>

        {/* PAID */}
        <div className={cn(s.scene, mode === "paid" && s.sceneOn)}>
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-card px-2.5 py-1.5 text-xs font-bold text-success shadow-sm">▲ You earn</span>
          <div className="absolute left-1/2 top-5 -translate-x-1/2 text-center">
            <div className="text-3xl font-extrabold tracking-tight text-success [font-variant-numeric:tabular-nums]">{fmt(rev)}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Revenue this month</div>
          </div>
          <span className="absolute bottom-11 left-4 rounded-full border border-brand-strong/30 bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand-strong">Sell your own ad space →</span>
          <svg viewBox="0 0 360 200" className="h-full w-full" role="img" aria-label="A location pays a small fee and earns revenue">
            <path id="cc-feein" d="M180 92 L180 118" style={{ display: "none" }} />
            <g>
              <circle className={s.coin} cx="180" cy="92" r="8" />
              <text className={s.coinT} x="180" y="96" textAnchor="middle">$</text>
              <animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;0.28;0.28" keyTimes="0;0.28;1" calcMode="linear"><mpath href="#cc-feein" /></animateMotion>
              <animate attributeName="opacity" dur="3.2s" repeatCount="indefinite" keyTimes="0;0.24;0.3;1" values="0;1;0;0" />
            </g>
            <EqBars />
            <DeviceGroup x={147} y={120} scale={SC} />
            <text className={s.label} x="180" y="184">Pay a small fee — keep the revenue</text>
          </svg>
        </div>
      </div>

      <div className="px-5 pb-5">
        {mode === "free" ? (
          <>
            <p className="text-[15px] text-foreground"><b className="text-brand-strong">You have the traffic — we bring the device, free.</b> Qualify on foot traffic and host a Channel Cast device at no cost. Hardware and software included; nothing to pay.</p>
            <div className="mt-3 flex flex-wrap gap-2">{["$0 to host", "Qualify on foot traffic", "Hardware + software included", "Zero maintenance"].map((c) => <span key={c} className="rounded-full border border-border bg-brand/5 px-3 py-1.5 text-xs font-semibold text-foreground">{c}</span>)}</div>
          </>
        ) : (
          <>
            <p className="text-[15px] text-foreground"><b className="text-brand-strong">Pay a little — sell your space and keep the revenue.</b> A small monthly fee unlocks the full platform, including the ability to sell ad space to your own clients and keep what you earn.</p>
            <div className="mt-3 flex flex-wrap gap-2">{["Small monthly fee", "Any location qualifies", "Sell your own ad space", "Keep the revenue"].map((c) => <span key={c} className="rounded-full border border-border bg-brand/5 px-3 py-1.5 text-xs font-semibold text-foreground">{c}</span>)}</div>
          </>
        )}
      </div>

      {/* Under the animation: qualify form (free) or a get-started CTA (paid) */}
      <div className="border-t border-border p-5 sm:p-6">
        {mode === "free" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">See if you qualify</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Find out where your location fits</h3>
            <p className="mt-1 text-sm text-muted-foreground">Answer a few questions and we&apos;ll tell you whether you qualify for free placement — or how paid placement can earn for you.</p>
            <div className="mt-5"><QualificationForm minDailyVisitors={minDailyVisitors} bare /></div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">Any location qualifies</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Start earning with paid placement</h3>
              <p className="mt-1 text-sm text-muted-foreground">A small monthly fee unlocks the device, the dashboard, and the ability to sell your own ad space.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild><Link href="/register">Get started <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild variant="outline"><Link href="/contact">Talk to us</Link></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlacementCompare() {
  const rows: [string, string, string][] = [
    ["How you qualify", "Sufficient foot traffic", "Any location"],
    ["Cost to the location", "$0", "Small monthly fee"],
    ["Device hardware", "Provided", "Provided"],
    ["Dashboard & software", "Included", "Included"],
    ["Sell your own ad space", "—", "Yes"],
    ["Keep the revenue", "—", "Yes"],
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand/5 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 text-left font-semibold">&nbsp;</th>
            <th className="px-4 py-3 text-center font-semibold">Free</th>
            <th className="px-4 py-3 text-center font-semibold">Paid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, free, paid], i) => (
            <tr key={label} className={i < rows.length - 1 ? "border-b border-border" : ""}>
              <td className="w-2/5 px-4 py-3 font-semibold text-muted-foreground">{label}</td>
              <td className={cn("bg-brand/5 px-4 py-3 text-center font-semibold", free === "—" ? "text-muted-foreground/60" : free === "$0" || free === "Provided" || free === "Included" ? "text-success" : "text-foreground")}>{free}</td>
              <td className={cn("px-4 py-3 text-center font-semibold", paid === "Yes" || paid === "Provided" || paid === "Included" ? "text-success" : "text-foreground")}>{paid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
