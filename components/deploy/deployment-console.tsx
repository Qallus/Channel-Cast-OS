"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Play, Radio, Rocket, Upload, Volume2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Device = {
  id: string;
  deviceCode: string;
  claimCode: string | null;
  hardwareId: string | null;
  name: string;
  type: string;
  status: string;
  firmwareVersion: string | null;
  lastHeartbeatAt: string | null;
  volume: number;
};
type Audio = { id: string; name: string; sizeBytes: number };
type Playlist = { id: string; name: string; trackIds: string[] };
type Activity = {
  heartbeats: { ts: string; status: string; ip: string | null }[];
  playback: { ts: string; trackName: string | null; event: string; trigger: string }[];
  deployment: { version: number; playlistId: string; window: { start: string; end: string } } | null;
};

async function jget<T>(url: string): Promise<T> {
  const r = await fetch(url);
  return r.json();
}
async function jpost<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

export function DeploymentConsole() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [audio, setAudio] = useState<Audio[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const load = useCallback(async () => {
    const [d, a, p] = await Promise.all([
      jget<Device[]>("/api/admin/devices"),
      jget<Audio[]>("/api/admin/audio"),
      jget<Playlist[]>("/api/admin/playlists"),
    ]);
    setDevices(d);
    setAudio(a);
    setPlaylists(p);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Deployment</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Register a device, upload audio, build a playlist, and deploy a schedule — then watch the device
          come online and play. This drives the real device API.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RegisterCard devices={devices} onChange={load} />
        <AudioCard audio={audio} onChange={load} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <PlaylistCard audio={audio} playlists={playlists} onChange={load} />
        <DeployCard devices={devices} playlists={playlists} onChange={load} />
      </div>
      <MonitorCard devices={devices} playlists={playlists} />
    </div>
  );
}

/* ── 1. Register ──────────────────────────────────────────────────── */

function RegisterCard({ devices, onChange }: { devices: Device[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function register() {
    if (!name.trim()) return;
    setBusy(true);
    await jpost("/api/admin/devices", { name, type: "standard_audio", model: "Mini PC" });
    setName("");
    setBusy(false);
    onChange();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1 · Register device</CardTitle>
        <CardDescription>Creates a device record and a one-time claim code for the agent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Device name, e.g. Mini PC — Test" />
          <Button onClick={register} disabled={busy || !name.trim()}>Register</Button>
        </div>
        <div className="space-y-2">
          {devices.length === 0 && <p className="text-sm text-muted-foreground">No devices yet.</p>}
          {devices.map((d) => (
            <div key={d.id} className="space-y-2 rounded-md border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.deviceCode}{d.hardwareId ? ` · ${d.hardwareId}` : ""}</p>
                </div>
                {d.claimCode ? <ClaimCode code={d.claimCode} /> : <StatusBadge status={d.status} />}
              </div>
              {d.claimCode && <InstallCommand code={d.claimCode} />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InstallCommand({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [os, setOs] = useState<"linux" | "windows">("linux");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const cmd =
    os === "linux"
      ? `curl -fsSL ${origin}/install.sh | sudo bash -s -- --claim ${code}`
      : `$env:CC_CLAIM="${code}"; irm ${origin}/install.ps1 | iex`;
  function copy() {
    navigator.clipboard?.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex gap-1">
          {(["linux", "windows"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOs(o)}
              className={cn("rounded px-2 py-0.5 text-[11px] font-medium capitalize", os === o ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {o}
            </button>
          ))}
        </div>
        <button onClick={copy} className="flex items-center gap-1 text-[11px] text-brand-strong hover:underline">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy install command
        </button>
      </div>
      <code className="block overflow-x-auto whitespace-pre rounded bg-background px-2 py-1.5 text-[11px] text-foreground">{cmd}</code>
      {os === "linux" && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Add <span className="font-mono">--authkey tskey-…</span> to auto-join Tailscale on first boot.
        </p>
      )}
    </div>
  );
}

function ClaimCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-2 rounded-md border border-brand/40 bg-brand/10 px-2.5 py-1"
    >
      <span className="font-mono text-sm font-semibold tracking-wider text-brand-strong">{code}</span>
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-brand-strong" />}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "online" ? "bg-success/15 text-success" : status === "offline" ? "bg-muted text-muted-foreground" : "bg-brand/15 text-brand-strong";
  return <Badge className={cn("border-transparent capitalize", tone)}>{status}</Badge>;
}

/* ── 2. Audio ─────────────────────────────────────────────────────── */

function AudioCard({ audio, onChange }: { audio: Audio[]; onChange: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch("/api/admin/audio", { method: "POST", body: fd });
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    onChange();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2 · Audio library</CardTitle>
        <CardDescription>Upload the audio tracks to deploy (MP3, WAV, OGG, etc.).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input ref={inputRef} type="file" accept="audio/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload audio"}
        </Button>
        <div className="space-y-1.5">
          {audio.length === 0 && <p className="text-sm text-muted-foreground">No audio uploaded yet.</p>}
          {audio.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span className="truncate text-foreground">{a.name}</span>
              <span className="text-xs text-muted-foreground">{(a.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 3. Playlist ──────────────────────────────────────────────────── */

function PlaylistCard({ audio, playlists, onChange }: { audio: Audio[]; playlists: Playlist[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function create() {
    if (!name.trim() || selected.length === 0) return;
    await jpost("/api/admin/playlists", { name, trackIds: selected });
    setName("");
    setSelected([]);
    onChange();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3 · Build playlist</CardTitle>
        <CardDescription>Select tracks and save them as a playlist.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {audio.length === 0 && <p className="text-sm text-muted-foreground">Upload audio first.</p>}
          {audio.map((a) => (
            <label key={a.id} className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm text-foreground">
              <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} className="h-4 w-4 accent-[hsl(var(--brand))]" />
              <span className="truncate">{a.name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Playlist name" />
          <Button onClick={create} disabled={!name.trim() || selected.length === 0}>Save ({selected.length})</Button>
        </div>
        {playlists.length > 0 && (
          <div className="space-y-1 pt-1">
            {playlists.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-foreground">{p.name}</span>
                <span>{p.trackIds.length} tracks</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── 4. Deploy ────────────────────────────────────────────────────── */

function DeployCard({ devices, playlists, onChange }: { devices: Device[]; playlists: Playlist[]; onChange: () => void }) {
  const [deviceId, setDeviceId] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [start, setStart] = useState("00:00");
  const [end, setEnd] = useState("23:59");
  const [cooldown, setCooldown] = useState("15");
  const [msg, setMsg] = useState<string | null>(null);

  async function deploy() {
    if (!deviceId || !playlistId) return;
    const res = await jpost<{ version?: number; error?: string }>("/api/admin/deployments", {
      deviceId,
      playlistId,
      window: { start, end, days: [0, 1, 2, 3, 4, 5, 6] },
      cooldownSec: Number(cooldown) || 15,
    });
    setMsg(res.error ? res.error : `Deployed — schedule v${res.version}. The device will pick it up on its next poll.`);
    onChange();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>4 · Deploy schedule</CardTitle>
        <CardDescription>Assign a playlist + play window to a device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Select device…</option>
          {devices.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.deviceCode})</option>)}
        </select>
        <select value={playlistId} onChange={(e) => setPlaylistId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Select playlist…</option>
          {playlists.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.trackIds.length})</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-muted-foreground">Window start<Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" /></label>
          <label className="text-xs text-muted-foreground">Window end<Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" /></label>
          <label className="text-xs text-muted-foreground">Cooldown (s)<Input type="number" value={cooldown} onChange={(e) => setCooldown(e.target.value)} className="mt-1" /></label>
        </div>
        <Button onClick={deploy} disabled={!deviceId || !playlistId} className="w-full">
          <Rocket className="h-4 w-4" /> Deploy to device
        </Button>
        {msg && <p className="text-sm text-brand-strong">{msg}</p>}
      </CardContent>
    </Card>
  );
}

/* ── 5. Monitor ───────────────────────────────────────────────────── */

function DeviceControls({
  device,
  deployment,
  playlists,
}: {
  device: Device;
  deployment: Activity["deployment"];
  playlists: Playlist[];
}) {
  const [volume, setVolume] = useState(device.volume ?? 80);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => setVolume(device.volume ?? 80), [device.id, device.volume]);

  const playlist = deployment ? playlists.find((p) => p.id === deployment.playlistId) : null;
  const firstTrack = playlist?.trackIds?.[0] ?? null;

  async function sendVolume(v: number) {
    await jpost(`/api/admin/devices/${device.id}/command`, { type: "set_volume", payload: { volume: v } });
    setMsg(`Volume ${v}% queued — applies on next heartbeat.`);
  }
  async function testPlay() {
    if (!firstTrack) {
      setMsg("Deploy a playlist to this device first.");
      return;
    }
    await jpost(`/api/admin/devices/${device.id}/command`, {
      type: "test_play",
      payload: { audioId: firstTrack, name: playlist?.name ?? "Test play", url: `/api/audio/${firstTrack}/file` },
    });
    setMsg("Test play queued — the device plays it on its next heartbeat.");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Volume2 className="h-4 w-4 text-brand-strong" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            onMouseUp={(e) => sendVolume(Number(e.currentTarget.value))}
            onTouchEnd={(e) => sendVolume(Number(e.currentTarget.value))}
            className="w-44 accent-[hsl(var(--brand))]"
            aria-label="Device volume"
          />
          <span className="w-10 text-sm text-foreground">{volume}%</span>
        </div>
        <Button size="sm" onClick={testPlay}>
          <Play className="h-4 w-4" /> Test play
        </Button>
      </div>
      {msg && <p className="text-xs text-brand-strong">{msg}</p>}
    </div>
  );
}

function MonitorCard({ devices, playlists }: { devices: Device[]; playlists: Playlist[] }) {
  const [deviceId, setDeviceId] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (!deviceId) return;
    let active = true;
    const tick = async () => {
      const a = await jget<Activity>(`/api/admin/activity?deviceId=${deviceId}`);
      if (active) setActivity(a);
    };
    tick();
    const iv = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [deviceId]);

  const device = devices.find((d) => d.id === deviceId);

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Radio className="h-5 w-5 text-brand-strong" />
        <div>
          <CardTitle>5 · Live monitor</CardTitle>
          <CardDescription>Heartbeats & playback from the device (polls every 4s).</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Select device to monitor…</option>
          {devices.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.deviceCode})</option>)}
        </select>

        {device && (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>Status: <StatusBadge status={device.status} /></span>
              <span className="text-muted-foreground">Firmware: {device.firmwareVersion ?? "—"}</span>
              <span className="text-muted-foreground">Schedule: v{activity?.deployment?.version ?? 0}</span>
            </div>
            <DeviceControls device={device} deployment={activity?.deployment ?? null} playlists={playlists} />
          </>
        )}

        {activity && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent playback</p>
              <div className="space-y-1">
                {activity.playback.length === 0 && <p className="text-sm text-muted-foreground">No playback yet.</p>}
                {activity.playback.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded border border-border px-2.5 py-1.5 text-xs">
                    <span className="text-foreground">{p.trackName ?? "—"}</span>
                    <span className={cn(p.event === "complete" ? "text-success" : "text-muted-foreground")}>{p.event}</span>
                    <span className="text-muted-foreground">{new Date(p.ts).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent heartbeats</p>
              <div className="space-y-1">
                {activity.heartbeats.length === 0 && <p className="text-sm text-muted-foreground">No heartbeats yet.</p>}
                {activity.heartbeats.map((h, i) => (
                  <div key={i} className="flex items-center justify-between rounded border border-border px-2.5 py-1.5 text-xs">
                    <span className="capitalize text-foreground">{h.status}</span>
                    <span className="text-muted-foreground">{h.ip ?? "—"}</span>
                    <span className="text-muted-foreground">{new Date(h.ts).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
