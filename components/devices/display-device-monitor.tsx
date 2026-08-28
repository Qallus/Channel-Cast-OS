"use client";

// The device page for a screen.
//
// Deliberately the same page as the audio player: same header, same live card
// with the same stat row, same controls card, same location card, same activity
// feed at the bottom. Only the middle changes, because a screen has no volume
// and no spots — it has a player URL and a schedule.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Check, Copy, Download, ExternalLink, Image as ImageIcon, Monitor, Wifi, WifiOff } from "lucide-react";

import { DeviceLocationCard } from "@/components/devices/device-location-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Device = {
  id: string; name: string; deviceCode: string; type: string; status: string; model: string;
  locationName: string | null; latitude: number | null; longitude: number | null;
  hardwareId: string | null; lastHeartbeatAt: string | null;
};
type Schedule = {
  id: string; loopId: string | null; loopName: string | null; days: number[];
  startTime: string; endTime: string; priority: number; enabled: boolean;
};
type Play = { id: string; name: string | null; durationSec: number | null; playedAt: string };
type DisplayData = {
  playerUrl: string;
  active: { id: string; loopName: string | null; startTime: string; endTime: string } | null;
  schedules: Schedule[];
  plays: Play[];
  stats: { recent: number; today: number; itemsInLoop: number };
};

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function describeDays(days: number[] | undefined): string {
  const d = Array.isArray(days) ? days : [];
  if (d.length === 7) return "Every day";
  if (d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x))) return "Mon–Fri";
  if (d.length === 2 && d.includes(0) && d.includes(6)) return "Weekends";
  return [1, 2, 3, 4, 5, 6, 0].filter((x) => d.includes(x)).map((x) => DAY_LABEL[x]).join(", ") || "No days";
}

function relTime(ts: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(ts).getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function DisplayDeviceMonitor({ device, now }: { device: Device; now: number }) {
  const [data, setData] = useState<DisplayData | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const code = device.deviceCode;
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/devices/by-code/${encodeURIComponent(code)}/display`, { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch { /* transient — the next tick retries */ }
  }, [code]);

  useEffect(() => {
    void load();
    const iv = setInterval(() => { void load(); }, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const online = device.status === "online";
  const last = data?.plays[0] ?? null;

  function copyUrl() {
    if (!data) return;
    navigator.clipboard?.writeText(data.playerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-5">
      {/* Header — identical to the audio player page */}
      <div>
        <Link href="/app/admin/devices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Device Fleet
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{device.name}</h1>
          <span className="text-sm text-muted-foreground">{device.deviceCode}</span>
          <Badge className={cn("gap-1 border-transparent", online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{online ? "Online" : "Offline"}
          </Badge>
          <Badge className="gap-1 border-transparent bg-brand/15 text-brand-strong">
            <Monitor className="h-3 w-3" /> Digital Display
          </Badge>
          <a href={`/install-display.bat?code=${encodeURIComponent(device.deviceCode)}`} download title="Download the double-click installer to bring this screen back online" className="ml-auto">
            <Button size="sm" variant={online ? "outline" : "default"}><Download className="h-4 w-4" /> Reconnect</Button>
          </a>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {device.model}{device.locationName ? ` · ${device.locationName}` : ""}
          {device.lastHeartbeatAt ? ` · last seen ${relTime(device.lastHeartbeatAt, now)}` : " · never connected"}
        </p>
      </div>

      {/* What's on the glass right now */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={cn("relative flex h-11 w-11 items-center justify-center rounded-xl", data?.active ? "bg-brand/15 text-brand-strong" : "bg-secondary text-secondary-foreground")}>
              <Monitor className="h-5 w-5" />
              {last && now - new Date(last.playedAt).getTime() < 60000 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-brand" />
                </span>
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {data?.active ? `Playing ${data.active.loopName ?? "a loop"}` : "Nothing scheduled right now"}
              </p>
              <p className="text-sm text-muted-foreground">
                {data?.active ? (
                  <>
                    Window <span className="font-medium text-foreground">{data.active.startTime}–{data.active.endTime}</span>
                    {last ? <> · last item: <span className="text-foreground">{last.name ?? "Untitled"}</span> · {relTime(last.playedAt, now)}</> : null}
                  </>
                ) : (
                  "This screen is dark until a schedule covers the moment."
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            <Stat label="Recent plays" value={data?.stats.recent ?? 0} />
            <Stat label="Today" value={data?.stats.today ?? 0} tone="brand" />
            <Stat label="In loop" value={data?.stats.itemsInLoop ?? 0} />
          </div>
        </CardContent>
      </Card>

      {/* Controls & tests */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-semibold text-foreground">Controls &amp; tests</p>

          {/* The player URL is this screen's whole identity — the kiosk browser
              opens exactly this and nothing else. */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground"><Monitor className="h-4 w-4" /> Player URL</span>
              <span className="text-xs text-muted-foreground">what the screen opens</span>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-foreground">{data?.playerUrl ?? "Loading…"}</pre>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={copyUrl} disabled={!data}>
              {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy URL</>}
            </Button>
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <a href={data?.playerUrl ?? "#"} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Preview</a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Preview opens the real player, so anything it shows counts as a play.
          </p>

          {/* Schedules — the screen's equivalent of "Spots on this player" */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">Scheduled loops ({data?.schedules.length ?? 0})</span>
              <Button size="sm" variant="outline" asChild>
                <Link href="/app/admin/displays?tab=screens"><CalendarClock className="h-3.5 w-3.5" /> Manage schedule</Link>
              </Button>
            </div>
            {!data || data.schedules.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                {data ? "No loop scheduled — this screen is dark. Add a schedule to give it something to play." : "Loading…"}
              </p>
            ) : (
              <ul className="space-y-2">
                {data.schedules.map((s) => (
                  <li key={s.id} className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-border p-2.5", !s.enabled && "opacity-50")}>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {s.loopName ?? <span className="text-warning">Loop deleted</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{describeDays(s.days)}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{s.startTime}–{s.endTime}</span>
                    {data.active?.id === s.id && <Badge className="border-transparent bg-brand/15 text-[10px] text-brand-strong">Live now</Badge>}
                    {!s.enabled && <Badge className="border-transparent bg-muted text-[10px]">paused</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {toast && <p className="text-sm text-brand-strong">{toast}</p>}
        </CardContent>
      </Card>

      <DeviceLocationCard
        deviceId={device.id}
        locationName={device.locationName}
        latitude={device.latitude}
        longitude={device.longitude}
        onSaved={setToast}
      />

      {/* Live activity feed */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Live playback</p>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> auto-refreshing</span>
          </div>
          {!data || data.plays.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {data ? "Nothing played yet. Once the screen is running its loop, every item it shows lands here." : "Loading…"}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.plays.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-strong"><ImageIcon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.name || "Untitled item"}</p>
                    <p className="text-xs text-muted-foreground">{p.durationSec ? `${Math.round(p.durationSec)}s on screen` : "Shown"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relTime(p.playedAt, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "brand" }) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-semibold tabular-nums", tone === "brand" ? "text-brand-strong" : "text-foreground")}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
