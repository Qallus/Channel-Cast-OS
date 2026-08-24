"use client";

import { LayoutDashboard, MapPin, Monitor, RadioTower, Users } from "lucide-react";

import { AppIcon } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

// Login animation: the passing of information down the network — from the
// computer you manage everything on, into the Channel Cast app, out to a
// location, onto the device there, and finally to the audience. A lime packet
// travels the track and each node flashes as it arrives.
const NODES = [
  { icon: Monitor, label: "Computer", sub: "Where you run the network" },
  { icon: LayoutDashboard, label: "Channel Cast app", sub: "Campaigns, audio & scheduling" },
  { icon: MapPin, label: "Location", sub: "Your ad space goes live" },
  { icon: RadioTower, label: "Device", sub: "Motion-triggered playback" },
  { icon: Users, label: "Audience", sub: "The right message, in the moment" },
];

// Delays align each node's flash to when a packet passes it (4.5s loop).
const DELAYS = ["0s", "1.125s", "2.25s", "3.375s", "4.5s"];

export function AuthDataFlow({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-[#050705]", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_38%_50%,rgba(204,255,0,0.06),transparent)]" />

      {/* Flow column */}
      <div className="absolute inset-0 flex items-center justify-center px-10">
        <div className="relative flex h-[68%] max-h-[600px] w-full max-w-sm flex-col justify-between">
          {/* Track line */}
          <div className="absolute bottom-4 left-6 top-4 w-px -translate-x-1/2 bg-gradient-to-b from-brand/10 via-brand/45 to-brand/10" />
          {/* Traveling packets */}
          <span className="cc-flow-dot" style={{ animationDelay: "0s" }} />
          <span className="cc-flow-dot" style={{ animationDelay: "1.5s" }} />
          <span className="cc-flow-dot" style={{ animationDelay: "3s" }} />

          {NODES.map((n, i) => {
            const Icon = n.icon;
            return (
              <div key={n.label} className="relative flex items-center gap-4">
                <span className="cc-flow-node flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-[#0a0e0a] text-brand-strong" style={{ animationDelay: DELAYS[i] }}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{n.label}</p>
                  <p className="text-xs text-white/50">{n.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vignette + brand mark (kept small & clean; tagline removed to de-clutter) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />
      <div className="absolute left-8 top-8 flex items-center gap-2">
        <AppIcon className="h-8 w-8 rounded-lg" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">Channel Cast</span>
      </div>
    </div>
  );
}
