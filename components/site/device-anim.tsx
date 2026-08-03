"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import s from "./device-anim.module.css";
import { cn } from "@/lib/utils";

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
