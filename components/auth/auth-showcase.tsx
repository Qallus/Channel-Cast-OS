"use client";

import { useEffect, useRef } from "react";

import { AppIcon } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Channel Cast orbital rings — a 3D armillary of tilted, spinning tick-rings
 * around a blurred, glowing device core. Ported from the login-animation.html
 * reference. Renders to a canvas that fills its container.
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

    // --- tuning -------------------------------------------------
    const FOCAL = 1000; // perspective strength (lower = more dramatic)
    const TICK = 26; // tick length in world units
    const LIME: [number, number, number] = [204, 255, 0];
    const PALE: [number, number, number] = [200, 214, 200];

    // each ring: radius, tilt on X, tilt on Y, spin speed (rad/sec), tick count
    const RINGS = [
      { r: 120, tx: 1.15, ty: 0.2, spin: 0.26, n: 24 },
      { r: 190, tx: 0.55, ty: -0.75, spin: -0.19, n: 34 },
      { r: 260, tx: 1.35, ty: 0.6, spin: 0.14, n: 44 },
      { r: 330, tx: 0.25, ty: 1.1, spin: -0.11, n: 56 },
      { r: 400, tx: 1.0, ty: -0.35, spin: 0.08, n: 68 },
    ];
    // ------------------------------------------------------------

    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    let scale = 1;

    // the product is drawn once into an offscreen buffer, then blitted blurred
    const puck = document.createElement("canvas");
    const pctx = puck.getContext("2d")!;

    function renderPuck() {
      puck.width = w;
      puck.height = h;
      pctx.clearRect(0, 0, w, h);

      const R = 205 * scale; // top radius
      const RY = R * 0.3; // ellipse squash (viewing angle)
      const H = 78 * scale; // body height
      const ty = cy - H / 2; // top face center
      const by = cy + H / 2; // bottom face center
      const line = "rgba(226,236,226,0.42)";

      // side wall
      const wall = pctx.createLinearGradient(cx - R, 0, cx + R, 0);
      wall.addColorStop(0.0, "#0a0d0a");
      wall.addColorStop(0.18, "#151a15");
      wall.addColorStop(0.5, "#080b08");
      wall.addColorStop(0.85, "#161c16");
      wall.addColorStop(1.0, "#0a0d0a");
      pctx.fillStyle = wall;
      pctx.beginPath();
      pctx.ellipse(cx, ty, R, RY, 0, Math.PI, 0);
      pctx.lineTo(cx + R, by);
      pctx.ellipse(cx, by, R, RY, 0, 0, Math.PI);
      pctx.closePath();
      pctx.fill();

      pctx.lineWidth = Math.max(1, 1.1 * scale);
      pctx.strokeStyle = line;

      // top face
      pctx.fillStyle = "#070a07";
      pctx.beginPath();
      pctx.ellipse(cx, ty, R, RY, 0, 0, Math.PI * 2);
      pctx.fill();
      pctx.stroke();

      // inset ring on the top face
      pctx.beginPath();
      pctx.ellipse(cx, ty + 4 * scale, R * 0.88, RY * 0.88, 0, 0, Math.PI * 2);
      pctx.stroke();

      // banding on the side wall
      for (const f of [0.34, 0.68]) {
        pctx.beginPath();
        pctx.ellipse(cx, ty + H * f, R, RY, 0, 0, Math.PI);
        pctx.stroke();
      }

      // flared base
      pctx.beginPath();
      pctx.ellipse(cx, by, R * 1.03, RY * 1.05, 0, 0, Math.PI);
      pctx.stroke();

      // lens dome, sitting on the top face
      const lx = cx;
      const ly = ty - 6 * scale;
      const lr = 40 * scale;
      pctx.fillStyle = "#0b0f0b";
      pctx.beginPath();
      pctx.ellipse(lx, ly, lr, lr * 0.34, 0, 0, Math.PI * 2);
      pctx.fill();
      pctx.stroke();
      pctx.beginPath();
      pctx.moveTo(lx - lr * 0.55, ly - lr * 0.06);
      pctx.quadraticCurveTo(lx, ly - lr * 0.85, lx + lr * 0.55, ly - lr * 0.06);
      pctx.stroke();
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w === 0 || h === 0) return;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;
      scale = Math.min(w, h) / 900;
      renderPuck();
    }

    // spin about the ring's own axis, then tilt X, then tilt Y
    function transform(x: number, y: number, z: number, tx: number, tyy: number) {
      const y1 = y * Math.cos(tx) - z * Math.sin(tx);
      const z1 = y * Math.sin(tx) + z * Math.cos(tx);
      const x2 = x * Math.cos(tyy) + z1 * Math.sin(tyy);
      const z2 = -x * Math.sin(tyy) + z1 * Math.cos(tyy);
      return [x2, y1, z2] as const;
    }

    function project(x: number, y: number, z: number) {
      const s = FOCAL / (FOCAL - z);
      return [cx + x * s * scale, cy + y * s * scale, s] as const;
    }

    function drawCore(t: number) {
      const pulse = 1 + Math.sin(t * 0.55) * 0.08;
      const ly = cy - 45 * scale;

      const amb = ctx!.createRadialGradient(cx, ly, 0, cx, ly, 260 * scale * pulse);
      amb.addColorStop(0.0, "rgba(204,255,0,0.18)");
      amb.addColorStop(0.4, "rgba(150,200,0,0.07)");
      amb.addColorStop(1.0, "rgba(204,255,0,0)");
      ctx!.fillStyle = amb;
      ctx!.fillRect(0, 0, w, h);

      ctx!.save();
      ctx!.filter = `blur(${Math.max(6, 16 * scale)}px)`;
      ctx!.globalAlpha = 0.9;
      ctx!.drawImage(puck, 0, 0);
      ctx!.restore();

      const lens = ctx!.createRadialGradient(cx, ly, 0, cx, ly, 90 * scale * pulse);
      lens.addColorStop(0.0, "rgba(226,255,120,0.55)");
      lens.addColorStop(0.3, "rgba(204,255,0,0.28)");
      lens.addColorStop(1.0, "rgba(204,255,0,0)");
      ctx!.fillStyle = lens;
      ctx!.beginPath();
      ctx!.arc(cx, ly, 90 * scale * pulse, 0, Math.PI * 2);
      ctx!.fill();
    }

    function frame(now: number) {
      const t = now / 1000;
      ctx!.clearRect(0, 0, w, h);
      drawCore(t);

      const segs: { pi: readonly number[]; po: readonly number[]; z: number; s: number }[] = [];

      for (const ring of RINGS) {
        const tx = ring.tx + Math.sin(t * 0.07 + ring.r) * 0.1;
        const tyy = ring.ty + Math.cos(t * 0.05 + ring.r) * 0.1;

        for (let i = 0; i < ring.n; i++) {
          const a = (i / ring.n) * Math.PI * 2 + t * ring.spin;
          const ca = Math.cos(a);
          const sa = Math.sin(a);

          const inner = transform(ring.r * ca, ring.r * sa, 0, tx, tyy);
          const outer = transform((ring.r + TICK) * ca, (ring.r + TICK) * sa, 0, tx, tyy);

          const pi = project(inner[0], inner[1], inner[2]);
          const po = project(outer[0], outer[1], outer[2]);

          const z = (inner[2] + outer[2]) / 2;
          segs.push({ pi, po, z, s: (pi[2] + po[2]) / 2 });
        }
      }

      segs.sort((a, b) => a.z - b.z);

      ctx!.lineCap = "round";
      for (const s of segs) {
        const d = Math.max(0, Math.min(1, (s.z + 420) / 840));
        const alpha = 0.06 + Math.pow(d, 2.2) * 0.85;
        const mix = Math.pow(d, 3.5);
        const c = PALE.map((p, i) => Math.round(p + (LIME[i] - p) * mix));

        ctx!.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
        ctx!.lineWidth = (0.6 + d * 1.7) * s.s;
        ctx!.beginPath();
        ctx!.moveTo(s.pi[0], s.pi[1]);
        ctx!.lineTo(s.po[0], s.po[1]);
        ctx!.stroke();
      }

      raf = requestAnimationFrame(frame);
    }

    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onResize = () => {
      resize();
      if (reduced) frame(0);
    };

    resize();
    window.addEventListener("resize", onResize);
    if (reduced) frame(0);
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
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
