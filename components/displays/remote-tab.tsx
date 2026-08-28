"use client";

// The remote.
//
// Built to be usable one-handed on a phone standing in the shop: every control
// is a full-width tap target, state is optimistic so a slow connection still
// feels immediate, and the screen reconciles within about five seconds.
//
// Nothing here pushes a command. The dashboard records the state it wants and
// the player pulls it — which means a change made while a screen is unplugged
// still lands when it comes back, instead of being lost.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check, Clock, Copy, ExternalLink, Loader2, Monitor, Pause, Pin, PinOff, Play,
  Subtitles, Volume2, VolumeX, Wifi, WifiOff,
} from "lucide-react";

import { EmptyState } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DisplayLoop } from "@/lib/displays/types";

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Controls = {
  power: "playing" | "stopped";
  muted: boolean;
  volume: number;
  subtitles: boolean;
  pinnedItem: string | null;
  openDays: number[];
  openStart: string;
  openEnd: string;
  revision: number;
};

type Schedule = {
  id: string; loopId: string | null; loopName: string | null; days: number[];
  startTime: string; endTime: string; priority: number; enabled: boolean;
};

type Screen = {
  id: string; name: string; deviceCode: string | null; location: string | null;
  status: string; lastHeartbeatAt: string | null; playerUrl: string;
  controls: Controls; schedules: Schedule[];
};

function describeDays(days: number[] | undefined): string {
  const d = Array.isArray(days) ? days : [];
  if (d.length === 7) return "Every day";
  if (d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x))) return "Mon–Fri";
  if (d.length === 2 && d.includes(0) && d.includes(6)) return "Weekends";
  return [1, 2, 3, 4, 5, 6, 0].filter((x) => d.includes(x)).map((x) => DAY_LABEL[x]).join(", ") || "No days";
}

export function RemoteTab({ loops, flash }: { loops: DisplayLoop[]; flash: (m: string) => void }) {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/displays/controls", { cache: "no-store" });
      const d = await res.json();
      setScreens(d.screens ?? []);
    } catch { /* the empty state covers it */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    // Keeps online/offline and any change made from another device honest.
    const id = setInterval(() => void load(), 20000);
    return () => clearInterval(id);
  }, [load]);

  /** Optimistic: the control moves now, the server catches up. */
  async function send(screen: Screen, patch: Partial<Controls>, note?: string) {
    setScreens((prev) => prev.map((s) => (s.id === screen.id ? { ...s, controls: { ...s.controls, ...patch } } : s)));
    const res = await fetch("/api/admin/displays/controls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: screen.id, ...patch }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      flash(d?.error || "Couldn't reach that screen.");
      void load();
      return;
    }
    if (note) flash(note);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading screens…
      </div>
    );
  }

  if (!screens.length) {
    return <EmptyState message="No screens yet. Use Set up a screen to add your first one." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Control any screen from anywhere you&apos;re signed in, including your phone. Changes reach the
        screen within about five seconds.
      </p>

      {screens.map((screen) => {
        const c = screen.controls;
        const online = screen.status === "online";
        const stopped = c.power === "stopped";
        const activeLoop = screen.schedules.find((s) => s.enabled && s.loopId);

        return (
          <div key={screen.id} className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Identity */}
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
              <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{screen.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {screen.deviceCode ?? "—"}{screen.location ? ` · ${screen.location}` : ""}
                </p>
              </div>
              <Badge className={cn("gap-1 border-transparent text-[10px] uppercase",
                online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{screen.status}
              </Badge>
            </div>

            <div className="space-y-4 p-4">
              {/* Transport — the two controls people actually reach for */}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={() => send(screen, { power: stopped ? "playing" : "stopped" },
                    stopped ? "Playing." : "Stopped — the screen shows the Channel Cast idle screen.")}
                  className={cn("h-12 font-semibold",
                    stopped
                      ? "border-brand-strong/50 bg-brand/10 text-brand-strong hover:bg-brand/15"
                      : "border-destructive/40 text-destructive hover:bg-destructive/10")}
                >
                  {stopped ? <><Play className="h-4 w-4" /> Play</> : <><Pause className="h-4 w-4" /> Stop ads</>}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => send(screen, { muted: !c.muted, volume: c.muted ? Math.max(c.volume, 50) : 0 })}
                  className={cn("h-12 font-semibold", !c.muted && "border-brand-strong/50 text-brand-strong")}
                >
                  {c.muted ? <><VolumeX className="h-4 w-4" /> Sound off</> : <><Volume2 className="h-4 w-4" /> Sound on</>}
                </Button>
              </div>

              {stopped && (
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Ads are stopped. The screen is showing the Channel Cast idle screen and is still
                  reachable — press Play to resume.
                </p>
              )}

              {/* Volume */}
              {!c.muted && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Volume2 className="h-4 w-4" /> Volume
                    </span>
                    <span className="text-muted-foreground">{c.volume}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={c.volume}
                    onChange={(e) => send(screen, { volume: Number(e.target.value), muted: Number(e.target.value) === 0 })}
                    className="h-3 w-full cursor-pointer appearance-none rounded-full bg-muted"
                    style={{ accentColor: "hsl(var(--brand-strong))" }}
                  />
                </div>
              )}

              {/* Subtitles */}
              <button
                type="button"
                onClick={() => send(screen, { subtitles: !c.subtitles })}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-colors",
                  c.subtitles ? "border-brand-strong/50 bg-brand/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent/30",
                )}
              >
                <Subtitles className={cn("h-4 w-4", c.subtitles && "text-brand-strong")} />
                <span className="flex-1">Subtitles</span>
                <Badge className={cn("border-transparent text-[10px]",
                  c.subtitles ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground")}>
                  {c.subtitles ? "On" : "Off"}
                </Badge>
              </button>

              {/* Which loop is scheduled */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Scheduled loops</span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/app/admin/displays?tab=screens"><Clock className="h-3.5 w-3.5" /> Edit schedule</Link>
                  </Button>
                </div>
                {screen.schedules.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    Nothing scheduled — this screen is dark.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {screen.schedules.map((s) => (
                      <li key={s.id} className={cn("flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs",
                        !s.enabled && "opacity-50")}>
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                          {s.loopName ?? loops.find((l) => l.id === s.loopId)?.name ?? "Loop deleted"}
                        </span>
                        <span className="text-muted-foreground">{describeDays(s.days)}</span>
                        <span className="tabular-nums text-muted-foreground">{s.startTime}–{s.endTime}</span>
                        {activeLoop?.id === s.id && (
                          <Badge className="border-transparent bg-brand text-[10px] text-brand-foreground">Current</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Pin one spot */}
              <SpotPicker
                screen={screen}
                loops={loops}
                onPin={(itemId) => send(screen, { pinnedItem: itemId },
                  itemId ? "Holding on that spot." : "Back to the full loop.")}
              />

              {/* Player URL */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(screen.playerUrl);
                    setCopied(screen.id);
                    setTimeout(() => setCopied(null), 1600);
                  }}
                >
                  {copied === screen.id ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Player URL</>}
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={screen.playerUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Preview
                  </a>
                </Button>
                {screen.deviceCode && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/app/admin/devices/${encodeURIComponent(screen.deviceCode)}`}>Open device</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Hold one spot on screen, ignoring the rotation.
 *
 * Loop items are only known once the loop is expanded, so this fetches the
 * scheduled loop's items on demand rather than bloating the list payload for
 * every screen on the page.
 */
function SpotPicker({
  screen, loops, onPin,
}: {
  screen: Screen;
  loops: DisplayLoop[];
  onPin: (itemId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ id: string; name: string }[] | null>(null);

  const scheduled = screen.schedules.find((s) => s.enabled && s.loopId);
  const loop = scheduled?.loopId ? loops.find((l) => l.id === scheduled.loopId) : null;

  useEffect(() => {
    if (!open || items || !loop) return;
    const rows = (loop.items ?? []).map((it) => ({
      id: it.id,
      name: it.media?.name ?? "Untitled spot",
    }));
    setItems(rows);
  }, [open, items, loop]);

  if (!scheduled) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/30"
      >
        {screen.controls.pinnedItem ? <Pin className="h-4 w-4 text-brand-strong" /> : <PinOff className="h-4 w-4" />}
        <span className="flex-1 text-foreground">
          {screen.controls.pinnedItem ? "Holding one spot" : "Play a single spot"}
        </span>
        <span className="text-xs">{open ? "Hide" : "Choose"}</span>
      </button>

      {open && (
        <div className="space-y-1.5 rounded-lg border border-border p-2">
          <button
            type="button"
            onClick={() => onPin(null)}
            className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40",
              !screen.controls.pinnedItem && "bg-accent/40 font-medium text-foreground")}
          >
            <Play className="h-3.5 w-3.5" /> Play the whole loop
          </button>
          {(items ?? []).map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onPin(it.id)}
              className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40",
                screen.controls.pinnedItem === it.id && "bg-accent/40 font-medium text-foreground")}
            >
              <Pin className="h-3.5 w-3.5" /> <span className="min-w-0 flex-1 truncate">{it.name}</span>
            </button>
          ))}
          {items?.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">That loop has no spots yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
