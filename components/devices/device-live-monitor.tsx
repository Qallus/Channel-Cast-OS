"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Eye, FlaskConical, Loader2, Play, Radar, Upload, Volume2, Wifi, WifiOff } from "lucide-react";

import { DeviceDetail } from "@/components/devices/device-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Device = {
  id: string;
  name: string;
  deviceCode: string;
  type: string;
  status: string;
  volume: number;
  model: string;
  locationName: string | null;
  hardwareId: string | null;
  lastHeartbeatAt: string | null;
};
type Playback = { ts: string; trackName: string | null; event: string; trigger: string };
type Track = { id: string; name: string };
type Payload = { device: Device; playback: Playback[]; heartbeats: { ts: string; status: string }[]; tracks: Track[] };

const MOTION_TYPES = new Set(["ai_vision", "pir_motion"]);

const TRIGGER_META: Record<string, { label: string; icon: typeof Radar; tone: string }> = {
  motion_detected: { label: "Motion", icon: Radar, tone: "bg-brand/15 text-brand-strong" },
  scheduled_play: { label: "Scheduled", icon: CalendarClock, tone: "bg-muted text-muted-foreground" },
  admin_test: { label: "Test", icon: FlaskConical, tone: "bg-secondary text-secondary-foreground" },
};
const triggerMeta = (t: string) => TRIGGER_META[t] ?? { label: t.replace(/_/g, " "), icon: Play, tone: "bg-muted text-muted-foreground" };

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

export function DeviceLiveMonitor({ deviceCode }: { deviceCode: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [state, setState] = useState<"loading" | "real" | "mock">("loading");
  const [now, setNow] = useState(() => Date.now());
  const [testing, setTesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const seenRef = useRef(false);

  async function testAudio() {
    const t = data?.tracks?.[0];
    const dev = data?.device;
    if (!t || !dev) return;
    setToast(null); setTesting(true);
    try {
      const res = await fetch(`/api/admin/devices/${dev.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "test_play", payload: { url: `${window.location.origin}/api/audio/${t.id}/file`, name: t.name, audioId: t.id } }),
      });
      setToast(res.ok ? `Sent "${t.name}" — it should play on the device within ~15s.` : "Couldn't send the test.");
    } catch {
      setToast("Couldn't send the test.");
    } finally {
      setTesting(false);
    }
  }

  async function addSpot(file: File) {
    const dev = data?.device;
    if (!dev) return;
    setToast(null); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/devices/${dev.id}/audio`, { method: "POST", body: fd });
      const j = await res.json();
      setToast(res.ok ? `Added "${j.audio?.name}" — ${j.trackCount} spot(s) on this player.` : j.error || "Upload failed.");
    } catch {
      setToast("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  // Poll the real device activity; fall back to the demo view if the code isn't a real device.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/admin/devices/by-code/${encodeURIComponent(deviceCode)}`, { cache: "no-store" });
        if (res.status === 404) {
          if (!stop && !seenRef.current) setState("mock");
          return;
        }
        if (!res.ok) return;
        const json: Payload = await res.json();
        if (stop) return;
        seenRef.current = true;
        setData(json);
        setState("real");
      } catch {
        /* transient — keep the last snapshot */
      }
    };
    tick();
    const poll = setInterval(tick, 4000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { stop = true; clearInterval(poll); clearInterval(clock); };
  }, [deviceCode]);

  const plays = useMemo(() => (data?.playback ?? []).filter((p) => p.event === "start"), [data]);
  const last = plays[0];
  const counts = useMemo(() => {
    let motion = 0, scheduled = 0;
    for (const p of plays) {
      if (p.trigger === "motion_detected") motion++;
      else if (p.trigger === "scheduled_play") scheduled++;
    }
    return { total: plays.length, motion, scheduled };
  }, [plays]);

  if (state === "loading") {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading device…</div>;
  }
  if (state === "mock") {
    return <DeviceDetail deviceCode={deviceCode} />;
  }

  const d = data!.device;
  const tracks = data!.tracks ?? [];
  const online = d.status === "online";
  const motionMode = MOTION_TYPES.has(d.type);
  const lastMs = last ? now - new Date(last.ts).getTime() : Infinity;
  const lastLabel = last ? triggerMeta(last.trigger).label : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link href="/app/admin/devices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Device Fleet
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{d.name}</h1>
          <span className="text-sm text-muted-foreground">{d.deviceCode}</span>
          <Badge className={cn("gap-1 border-transparent", online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{online ? "Online" : "Offline"}
          </Badge>
          <Badge className={cn("gap-1 border-transparent", motionMode ? "bg-brand/15 text-brand-strong" : "bg-secondary text-secondary-foreground")}>
            {motionMode ? <Radar className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}{motionMode ? "Motion-activated" : "Scheduled"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {d.model}{d.locationName ? ` · ${d.locationName}` : ""} · <Volume2 className="mb-0.5 inline h-3.5 w-3.5" /> {d.volume}%
          {d.lastHeartbeatAt ? ` · last seen ${relTime(d.lastHeartbeatAt, now)}` : " · never connected"}
        </p>
      </div>

      {/* Live trigger indicator */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={cn("relative flex h-11 w-11 items-center justify-center rounded-xl", motionMode ? "bg-brand/15 text-brand-strong" : "bg-secondary text-secondary-foreground")}>
              {motionMode ? <Radar className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
              {lastMs < 15000 && <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-brand" /></span>}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{motionMode ? "Motion-activated player" : "Scheduled player"}</p>
              <p className="text-sm text-muted-foreground">
                {last ? <>Last trigger: <span className="font-medium text-foreground">{lastLabel}</span> · {relTime(last.ts, now)}{last.trackName ? <> · <span className="text-foreground">{last.trackName}</span></> : null}</> : "No plays yet — waiting for the first trigger…"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            <Stat label="Recent plays" value={counts.total} />
            <Stat label="Motion" value={counts.motion} tone="brand" />
            <Stat label="Scheduled" value={counts.scheduled} />
          </div>
        </CardContent>
      </Card>

      {/* Quick test */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold text-foreground">Quick test</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Play className="h-4 w-4 text-brand-strong" /> Play audio</div>
              <p className="mt-1 text-xs text-muted-foreground">Send a spot to the speaker right now.</p>
              <Button size="sm" className="mt-2 w-full" onClick={testAudio} disabled={testing || tracks.length === 0}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {tracks.length ? "Test play" : "Add a spot first"}
              </Button>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Radar className="h-4 w-4 text-brand-strong" /> Motion</div>
              <p className="mt-1 text-xs text-muted-foreground">Walk in front of the webcam — plays land in the feed below.</p>
              <Badge className="mt-2 border-transparent bg-success/15 text-success">Live</Badge>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Eye className="h-4 w-4 text-muted-foreground" /> Vision</div>
              <p className="mt-1 text-xs text-muted-foreground">AI audience detection picks the spot.</p>
              <Badge className="mt-2 border-transparent bg-secondary text-secondary-foreground">Coming soon</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Audio on this player</p>
              <p className="text-xs text-muted-foreground">{tracks.length} spot{tracks.length === 1 ? "" : "s"} deployed</p>
            </div>
            <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent", uploading && "pointer-events-none opacity-60")}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Add a spot
              <input type="file" accept="audio/*" hidden disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) addSpot(f); e.target.value = ""; }} />
            </label>
          </div>
          {toast && <p className="text-sm text-brand-strong">{toast}</p>}
        </CardContent>
      </Card>

      {/* Live activity feed */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Live playback</p>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> auto-refreshing</span>
          </div>
          {plays.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No plays recorded yet. Trigger the device (walk in front of the webcam) and events will stream in here.</p>
          ) : (
            <ul className="divide-y divide-border">
              {plays.map((p, i) => {
                const m = triggerMeta(p.trigger);
                const Icon = m.icon;
                return (
                  <li key={`${p.ts}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", m.tone)}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.trackName || "Untitled spot"}</p>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{relTime(p.ts, now)}</span>
                  </li>
                );
              })}
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
      <p className={cn("text-xl font-semibold tracking-tight", tone === "brand" ? "text-brand-strong" : "text-foreground")}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
