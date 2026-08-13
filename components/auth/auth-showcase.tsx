"use client";

import { useEffect, useRef } from "react";

import { AppIcon } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Channel Cast auth animation — "presence → sound." A glowing device core sits
 * inside a circular audio visualizer; sound rings radiate outward continuously,
 * and every so often on-device vision "detects" someone approaching (a lime ping
 * drifting in from the edge) — on arrival the audio spikes, a bright pulse fires,
 * and the core flares. Pure canvas, theme-dark, respects reduced motion.
 */
export function AuthShowcase({
  className,
  heading = "Motion-triggered audio, everywhere your audience is.",
  subtext = "Manage devices, campaigns, and playback across your entire network from one console.",
}: {
  className?: string;
  heading?: string;
  subtext?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const LIME: [number, number, number] = [204, 255, 0];
    const PALE: [number, number, number] = [196, 214, 196];

    let w = 0, h = 0, cx = 0, cy = 0, scale = 1;
    let rings: { born: number; bright: number }[] = [];
    let dets: { ang: number; dist: number; born: number; triggered: boolean; dead: number }[] = [];
    let energy = 0;
    let lastRing = -1, lastDet = 0, lastNow = 0, detGap = 2.6;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      w = rect.width; h = rect.height;
      if (!w || !h) return;
      canvas!.width = w * dpr; canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2; cy = h / 2; scale = Math.min(w, h) / 900;
    }

    function draw(t: number, dt: number) {
      ctx!.clearRect(0, 0, w, h);
      const maxR = Math.min(w, h) * 0.46;
      const coreR = 44 * scale;
      const baseR = Math.max(88, 120 * scale);
      const amp = 42 * scale;
      const triggerR = baseR + amp * 0.4;

      // Ambient breathing glow
      const breathe = 1 + Math.sin(t * 0.9) * 0.06;
      const amb = ctx!.createRadialGradient(cx, cy, 0, cx, cy, maxR * breathe);
      amb.addColorStop(0, `rgba(204,255,0,${0.10 + energy * 0.06})`);
      amb.addColorStop(0.45, "rgba(150,200,0,0.05)");
      amb.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = amb;
      ctx!.fillRect(0, 0, w, h);

      // Spawn sound rings + presence detections
      if (t - lastRing > 0.9) { lastRing = t; rings.push({ born: t, bright: 0 }); }
      if (t - lastDet > detGap) { lastDet = t; detGap = rnd(2.0, 3.6); dets.push({ ang: rnd(0, Math.PI * 2), dist: maxR * 0.98, born: t, triggered: false, dead: 0 }); }

      // Sound rings (expanding, fading)
      rings = rings.filter((r) => {
        const p = (t - r.born) / 3.4;
        if (p >= 1) return false;
        const rr = coreR + p * (maxR - coreR);
        ctx!.strokeStyle = `rgba(204,255,0,${((1 - p) * (0.32 + r.bright * 0.4)).toFixed(3)})`;
        ctx!.lineWidth = (0.8 + r.bright * 1.4) * scale;
        ctx!.beginPath(); ctx!.arc(cx, cy, rr, 0, Math.PI * 2); ctx!.stroke();
        return true;
      });

      // Circular audio visualizer
      const N = 76;
      ctx!.lineCap = "round";
      ctx!.lineWidth = Math.max(1, 1.6 * scale);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        let wv = 0.5 + 0.32 * Math.sin(a * 8 + t * 2.3) + 0.18 * Math.sin(a * 3 - t * 1.4);
        wv = Math.max(0, Math.min(1, wv));
        const len = (7 + wv * amp) * (1 + energy * 1.1);
        const ca = Math.cos(a), sa = Math.sin(a);
        const mix = Math.min(1, 0.15 + wv * 0.85 + energy * 0.3);
        const c = PALE.map((p, k) => Math.round(p + (LIME[k] - p) * mix));
        const alpha = Math.min(1, 0.25 + wv * 0.55 + energy * 0.2);
        ctx!.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
        ctx!.beginPath();
        ctx!.moveTo(cx + ca * baseR, cy + sa * baseR);
        ctx!.lineTo(cx + ca * (baseR + len), cy + sa * (baseR + len));
        ctx!.stroke();
      }

      // Presence detections drifting inward
      dets = dets.filter((d) => {
        const age = t - d.born;
        if (!d.triggered) {
          d.dist -= (maxR / 3.2) * dt;
          if (d.dist <= triggerR) { d.triggered = true; d.dead = t; energy = 1; rings.push({ born: t, bright: 1 }); }
        }
        let alpha: number;
        if (!d.triggered) alpha = Math.min(1, age / 0.35) * 0.9;
        else { const da = t - d.dead; if (da > 0.6) return false; alpha = (1 - da / 0.6) * 0.9; }
        const x = cx + Math.cos(d.ang) * d.dist, y = cy + Math.sin(d.ang) * d.dist;
        const g = ctx!.createRadialGradient(x, y, 0, x, y, 11 * scale);
        g.addColorStop(0, `rgba(226,255,150,${alpha})`);
        g.addColorStop(1, "rgba(204,255,0,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath(); ctx!.arc(x, y, 11 * scale, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = `rgba(232,255,170,${alpha})`;
        ctx!.beginPath(); ctx!.arc(x, y, 2.2 * scale, 0, Math.PI * 2); ctx!.fill();
        return true;
      });

      // Core device orb (breathing + flares on detection)
      energy = Math.max(0, energy - dt * 1.5);
      const cp = coreR * 2.4 * (1 + Math.sin(t * 1.6) * 0.1 + energy * 0.25);
      const core = ctx!.createRadialGradient(cx, cy, 0, cx, cy, cp);
      core.addColorStop(0, `rgba(232,255,150,${0.7 + energy * 0.3})`);
      core.addColorStop(0.3, "rgba(204,255,0,0.4)");
      core.addColorStop(1, "rgba(204,255,0,0)");
      ctx!.fillStyle = core;
      ctx!.beginPath(); ctx!.arc(cx, cy, cp, 0, Math.PI * 2); ctx!.fill();
      ctx!.fillStyle = "rgba(210,255,90,0.92)";
      ctx!.beginPath(); ctx!.arc(cx, cy, coreR * 0.5, 0, Math.PI * 2); ctx!.fill();
    }

    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function frame(now: number) {
      const t = now / 1000;
      const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
      lastNow = now;
      if (w && h) draw(t, dt);
      raf = requestAnimationFrame(frame);
    }

    resize();
    const onResize = () => { resize(); if (reduced && w && h) draw(0, 0); };
    window.addEventListener("resize", onResize);
    if (reduced) { if (w && h) draw(0, 0); } else raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div className={cn("relative overflow-hidden bg-[#050705]", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Vignette + brand overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
      <div className="absolute left-10 top-10 flex items-center gap-2.5">
        <AppIcon className="h-9 w-9 rounded-lg" />
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">Channel Cast</span>
      </div>
      <div className="absolute bottom-12 left-10 max-w-sm">
        <p className="text-2xl font-semibold leading-tight text-white">{heading}</p>
        <p className="mt-2 text-sm text-white/60">{subtext}</p>
      </div>
    </div>
  );
}
