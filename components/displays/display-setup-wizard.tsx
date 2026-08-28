"use client";

// Getting a screen playing, start to finish, in one modal.
//
// The pieces underneath — device, creative, loop, schedule, controls — are all
// separate for good reasons, but a first-time user shouldn't have to know any of
// that vocabulary or the order the pieces go together in. This wizard collects
// plain answers and does the assembly at the end, in one commit, so a half-
// finished run leaves nothing behind to clean up.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, Clock, Copy, Download, ExternalLink, Film, Loader2,
  MapPin, Monitor, Play, Plus, Subtitles, Trash2, Upload, Volume2, VolumeX, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

type Spot = { mediaId: string; name: string; seconds: number };
type Created = { id: string; name: string; deviceCode: string; claimCode: string | null; playerUrl?: string };

const STEPS = [
  "Name", "Location", "Hours", "Spots", "Play-times", "Audio", "Subtitles", "Finish",
] as const;

export function DisplaySetupWizard({
  open, onOpenChange, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-brand-strong" /> Set up a screen
          </DialogTitle>
        </DialogHeader>
        {open && <WizardBody onClose={() => onOpenChange(false)} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  );
}

function WizardBody({ onClose, onDone }: { onClose: () => void; onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1–3
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [openDays, setOpenDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [openStart, setOpenStart] = useState("08:00");
  const [openEnd, setOpenEnd] = useState("20:00");

  // 4
  const [spots, setSpots] = useState<Spot[]>([]);

  // 5 — seeded from the opening hours, then editable on its own.
  const [playDays, setPlayDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [playStart, setPlayStart] = useState("08:00");
  const [playEnd, setPlayEnd] = useState("20:00");
  const [matchHours, setMatchHours] = useState(true);

  // 6–7
  const [sound, setSound] = useState(false);
  const [volume, setVolume] = useState(60);
  const [subtitles, setSubtitles] = useState(false);

  // 8
  const [created, setCreated] = useState<Created | null>(null);
  const [live, setLive] = useState(false);
  const [copied, setCopied] = useState(false);

  // While "match hours" is on, the schedule shadows the opening hours rather
  // than making someone type the same thing twice.
  useEffect(() => {
    if (!matchHours) return;
    setPlayDays(openDays); setPlayStart(openStart); setPlayEnd(openEnd);
  }, [matchHours, openDays, openStart, openEnd]);

  const canAdvance = (() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 3) return spots.length > 0;
    if (step === 4) return playDays.length > 0;
    return true;
  })();

  /**
   * Build everything at once, on the last step forward.
   *
   * Ordering matters: the loop needs media ids, the schedule needs both the
   * device and the loop, and the controls need the device. Media was already
   * created as it was added, since uploads can't be deferred.
   */
  async function commit() {
    setBusy(true); setError(null);
    try {
      const dev = await jpost("/api/admin/devices", {
        name: name.trim(),
        type: "digital_display",
        model: "Screen",
        locationName: location.trim() || null,
      });
      if (dev.error) throw new Error(dev.error);

      const loop = await jpost("/api/admin/displays/loops", {
        name: `${name.trim()} loop`,
        description: "Created by the screen setup wizard.",
        orientation: "landscape",
        items: spots.map((s) => ({ media_id: s.mediaId, duration_sec: s.seconds, transition: "fade" })),
      });
      if (loop.error) throw new Error(loop.error);

      const dep = await jpost("/api/admin/displays/deployments", {
        device_id: dev.id,
        loop_id: loop.loop.id,
        days: playDays,
        start_time: playStart,
        end_time: playEnd,
        priority: 0,
        enabled: true,
      });
      if (dep?.error) throw new Error(dep.error);

      const ctl = await jpatch("/api/admin/displays/controls", {
        deviceId: dev.id,
        muted: !sound,
        volume: sound ? volume : 0,
        subtitles,
        openDays, openStart, openEnd,
        power: "playing",
      });
      if (ctl?.error) throw new Error(ctl.error);

      setCreated({
        id: dev.id, name: dev.name, deviceCode: dev.deviceCode, claimCode: dev.claimCode,
        playerUrl: `${window.location.origin}/display/${dev.deviceToken ?? ""}`,
      });
      setStep(7);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function back() { setError(null); setStep((s) => Math.max(0, s - 1)); }
  function next() {
    setError(null);
    if (step === 6) return void commit();
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  return (
    <>
      <StepBar step={step} />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {step === 0 && (
          <Field
            title="What should we call this screen?"
            hint="Something you'll recognise in a list — the room or the window it faces."
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Front window" autoFocus />
          </Field>
        )}

        {step === 1 && (
          <Field
            title="Where is it?"
            hint="Optional. Used to group screens and to plot them on the fleet map."
            icon={MapPin}
          >
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Main Street store" />
          </Field>
        )}

        {step === 2 && (
          <Field
            title="When is this screen on?"
            hint="Your opening hours. Spots default to these times, and you can narrow them next."
            icon={Clock}
          >
            <DayPicker days={openDays} onToggle={(d) => setOpenDays(toggle(openDays, d))} />
            <TimeRange start={openStart} end={openEnd} onStart={setOpenStart} onEnd={setOpenEnd} />
          </Field>
        )}

        {step === 3 && (
          <SpotsStep spots={spots} setSpots={setSpots} onError={setError} />
        )}

        {step === 4 && (
          <Field
            title="When should the spots play?"
            hint="Several screens can share a loop and still run different hours."
            icon={Clock}
          >
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={matchHours}
                onChange={(e) => setMatchHours(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--brand-strong))]"
              />
              Play whenever the screen is on ({openStart}–{openEnd})
            </label>
            {!matchHours && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <DayPicker days={playDays} onToggle={(d) => setPlayDays(toggle(playDays, d))} />
                <TimeRange start={playStart} end={playEnd} onStart={setPlayStart} onEnd={setPlayEnd} />
                <p className="text-xs text-muted-foreground">
                  An end time before the start runs past midnight — 20:00 to 02:00 covers the evening
                  and the early hours.
                </p>
              </div>
            )}
          </Field>
        )}

        {step === 5 && (
          <Field
            title="Should the spots play sound?"
            hint="Most shop screens stay silent. Sound needs speakers on the screen's PC."
            icon={sound ? Volume2 : VolumeX}
          >
            <Choice
              value={sound}
              onChange={setSound}
              yes="Yes, play sound"
              no="No, keep it silent"
            />
            {sound && (
              <div className="rounded-lg border border-border p-3">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Volume</span>
                  <span className="text-muted-foreground">{volume}%</span>
                </div>
                <input
                  type="range" min={10} max={100} step={5}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted"
                  style={{ accentColor: "hsl(var(--brand-strong))" }}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  You can mute this screen from the dashboard at any time, including from a phone.
                </p>
              </div>
            )}
          </Field>
        )}

        {step === 6 && (
          <Field
            title="Show subtitles?"
            hint="Useful on a silent screen, if your videos carry captions."
            icon={Subtitles}
          >
            <Choice value={subtitles} onChange={setSubtitles} yes="Yes, show subtitles" no="No subtitles" />
            <p className="text-xs text-muted-foreground">
              Applies to YouTube spots that have captions. Uploaded videos show captions only if the
              file carries them.
            </p>
          </Field>
        )}

        {step === 7 && created && (
          <FinishStep
            created={created}
            live={live}
            setLive={setLive}
            copied={copied}
            setCopied={setCopied}
            onError={setError}
          />
        )}

        {error && (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-3">
        {step > 0 && step < 7 && (
          <Button variant="outline" onClick={back} disabled={busy}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <span className="flex-1" />
        {step < 7 ? (
          <Button onClick={next} disabled={!canAdvance || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {step === 6 ? "Create screen" : "Next"}
            {step < 6 && <ArrowRight className="h-4 w-4" />}
          </Button>
        ) : (
          <Button onClick={() => { onDone?.(); onClose(); }}>Done</Button>
        )}
      </div>
    </>
  );
}

// ── Steps ────────────────────────────────────────────────────────────────────

function SpotsStep({
  spots, setSpots, onError,
}: {
  spots: Spot[];
  setSpots: (s: Spot[]) => void;
  onError: (e: string | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = useCallback((media: { id: string; name: string; duration_sec?: number | null }) => {
    setSpots([...spots, { mediaId: media.id, name: media.name, seconds: Math.round(media.duration_sec || 15) }]);
  }, [spots, setSpots]);

  async function addLink() {
    if (!url.trim()) return;
    setBusy(true); onError(null);
    try {
      const res = await jpost("/api/admin/displays/media", { url: url.trim() });
      if (res.error) throw new Error(res.error);
      add(res.media);
      setUrl("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't add that link.");
    } finally { setBusy(false); }
  }

  async function upload(file: File) {
    setBusy(true); onError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name);
      const res = await fetch("/api/admin/displays/media", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Upload failed.");
      add(j.media);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload failed.");
    } finally { setBusy(false); }
  }

  return (
    <Field title="Add your spots" hint="Upload a video, or paste a YouTube, Vimeo or Google Drive link." icon={Film}>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload video
        </Button>
        <input
          ref={fileRef} type="file" hidden accept="video/mp4,video/webm,image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }}
        />
      </div>

      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addLink(); } }}
          placeholder="Paste a YouTube, Vimeo or Google Drive link"
        />
        <Button variant="outline" onClick={addLink} disabled={busy || !url.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Google Drive: open the <b className="font-medium text-foreground">video itself</b> (not the folder
        it&apos;s in), click <b className="font-medium text-foreground">Share → Copy link</b>, and set access to
        <b className="font-medium text-foreground"> Anyone with the link</b>. We copy the file into Channel
        Cast so it autoplays properly.
      </p>

      {spots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No spots yet. Add at least one to continue.
        </p>
      ) : (
        <ul className="space-y-2">
          {spots.map((s, i) => (
            <li key={`${s.mediaId}-${i}`} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{s.name}</span>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <Input
                  value={String(s.seconds)}
                  onChange={(e) => {
                    const copy = [...spots];
                    copy[i] = { ...s, seconds: Math.max(1, Number(e.target.value) || 1) };
                    setSpots(copy);
                  }}
                  inputMode="numeric"
                  className="h-8 w-16 text-center"
                />
                sec
              </label>
              <button
                type="button"
                onClick={() => setSpots(spots.filter((_, x) => x !== i))}
                aria-label={`Remove ${s.name}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

function FinishStep({
  created, live, setLive, copied, setCopied, onError,
}: {
  created: Created;
  live: boolean;
  setLive: (v: boolean) => void;
  copied: boolean;
  setCopied: (v: boolean) => void;
  onError: (e: string | null) => void;
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const batUrl = `${origin}/install-display.bat?claim=${encodeURIComponent(created.claimCode || "")}&code=${encodeURIComponent(created.deviceCode)}`;

  async function goLive() {
    onError(null);
    const res = await jpatch("/api/admin/displays/controls", { deviceId: created.id, power: "playing" });
    if (res?.error) return onError(res.error);
    setLive(true);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-strong/40 bg-brand/5 p-4 text-center">
        <p className="text-sm font-semibold text-foreground">{created.name} is ready</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Claim code · {created.deviceCode}</p>
        <p className="font-mono text-lg font-semibold tracking-wider text-foreground">{created.claimCode}</p>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">1. Install it on the screen&apos;s PC</p>
        <p className="text-xs text-muted-foreground">
          Download this on the mini PC, double-click it, and click <b className="font-medium text-foreground">Yes</b>.
          Press <b className="font-medium text-foreground">Ctrl+Alt+X</b> any time to exit the player.
        </p>
        <a href={batUrl} download>
          <Button className="w-full"><Download className="h-4 w-4" /> Download Windows installer</Button>
        </a>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">2. Preview or go live</p>
        <p className="text-xs text-muted-foreground">
          Preview opens the real player in a tab, so what it shows is counted as a play.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(created.playerUrl || "");
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy player URL</>}
          </Button>
          <Button variant="outline" asChild>
            <a href={created.playerUrl || "#"} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Preview
            </a>
          </Button>
          <Button onClick={goLive} disabled={live}>
            {live ? <><Check className="h-4 w-4" /> Live</> : <><Play className="h-4 w-4" /> Go live</>}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Change spots, hours, volume or subtitles any time from{" "}
        <Link href="/app/admin/displays?tab=remote" className="text-brand-strong underline">Remote</Link> — including from your phone.
      </p>
    </div>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  return (
    <div className="border-b border-border px-5 py-3">
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-brand-strong" : "bg-muted")}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Step {Math.min(step + 1, STEPS.length)} of {STEPS.length} · {STEPS[step]}
      </p>
    </div>
  );
}

function Field({
  title, hint, icon: Icon, children,
}: {
  title: string;
  hint?: string;
  icon?: typeof Monitor;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" />}
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function DayPicker({ days, onToggle }: { days: number[]; onToggle: (d: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAYS.map((d) => {
        const on = days.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => onToggle(d.value)}
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
              on ? "border-brand-strong bg-brand/10 text-brand-strong" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

function TimeRange({
  start, end, onStart, onEnd,
}: {
  start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-muted-foreground">From</label>
      <Input type="time" value={start} onChange={(e) => onStart(e.target.value)} className="w-32" />
      <label className="text-xs text-muted-foreground">to</label>
      <Input type="time" value={end} onChange={(e) => onEnd(e.target.value)} className="w-32" />
    </div>
  );
}

function Choice({
  value, onChange, yes, no,
}: {
  value: boolean; onChange: (v: boolean) => void; yes: string; no: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {[{ v: true, label: yes }, { v: false, label: no }].map((o) => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-colors",
            value === o.v ? "border-brand-strong bg-accent/40 text-foreground" : "border-border text-muted-foreground hover:bg-accent/30",
          )}
        >
          {value === o.v ? <Check className="h-4 w-4 text-brand-strong" /> : <X className="h-4 w-4 opacity-40" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

const toggle = (list: number[], v: number) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

async function jpost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ error: "Unexpected response." }));
}

async function jpatch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ error: "Unexpected response." }));
}
