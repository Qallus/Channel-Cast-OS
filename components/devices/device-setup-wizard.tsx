"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, Copy, Download, Loader2, Monitor, PartyPopper, Radar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "motion" | "schedule" | "display";
type Step = "details" | "install" | "waiting" | "done";
type CreatedDevice = { id: string; name: string; deviceCode: string; claimCode: string | null };
type FleetDevice = { id: string; hardwareId: string | null; status: string; deviceCode: string };

// The step-by-step flow. Renders inline (used on the Add Device page) or inside
// the DeviceSetupWizard dialog. onDone fires when the user finishes.
export function DeviceSetupFlow({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("Mini PC");
  const [mode, setMode] = useState<Mode>("motion");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<CreatedDevice | null>(null);
  const [connected, setConnected] = useState<FleetDevice | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://channelcast.io";
  const isDisplay = mode === "display";

  // A screen installs a kiosk browser, a player installs the audio agent —
  // different scripts, identical "download and double-click" experience.
  const command =
    device &&
    (isDisplay
      ? `$env:CC_SERVER="${origin}"; $env:CC_CLAIM="${device.claimCode}"; irm $env:CC_SERVER/install-display.ps1 | iex`
      : `$env:CC_SERVER="${origin}"; $env:CC_CLAIM="${device.claimCode}";${mode === "motion" ? ' $env:CC_MOTION="webcam";' : ""} irm $env:CC_SERVER/install.ps1 | iex`);
  const batUrl =
    device &&
    (isDisplay
      ? `${origin}/install-display.bat?claim=${encodeURIComponent(device.claimCode || "")}&code=${encodeURIComponent(device.deviceCode)}`
      : `${origin}/install.bat?claim=${encodeURIComponent(device.claimCode || "")}&code=${encodeURIComponent(device.deviceCode)}${mode === "motion" ? "&motion=webcam" : ""}`);
  // Pi / Debian screens: one line, no download.
  const shCommand =
    device && `curl -fsSL ${origin}/install-display.sh | sudo bash -s -- --claim ${device.claimCode}`;

  async function createDevice() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || (isDisplay ? "Screen" : "Mini PC"),
          type: mode === "motion" ? "ai_vision" : mode === "display" ? "digital_display" : "standard_audio",
          locationName: location.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the device.");
      setDevice({ id: data.id, name: data.name, deviceCode: data.deviceCode, claimCode: data.claimCode });
      setStep("install");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCommand() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the command is still visible to copy manually */
    }
  }

  const deviceId = device?.id;
  useEffect(() => {
    if (step !== "waiting" || !deviceId) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/admin/devices", { cache: "no-store" });
        const list: FleetDevice[] = await res.json();
        const found = list.find((d) => d.id === deviceId);
        if (found && (found.hardwareId || found.status === "online" || found.status === "registered")) {
          if (!stop) { setConnected(found); setStep("done"); }
        }
      } catch {
        /* transient — keep polling */
      }
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(iv); };
  }, [step, deviceId]);

  return (
    <div className="space-y-4">
      <StepDots step={step} />

      {step === "details" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Name this device and pick what it is. You&apos;ll install it with one download next.</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Device name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mini PC — Front Entrance" />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Playback mode</span>
            <div className="grid gap-2 sm:grid-cols-3">
              <ModeCard active={mode === "motion"} onClick={() => setMode("motion")} icon={Radar} title="Motion-activated" note="Audio, when a USB webcam sees movement." />
              <ModeCard active={mode === "schedule"} onClick={() => setMode("schedule")} icon={CalendarClock} title="Scheduled" note="Audio, on a set schedule/loop." />
              <ModeCard active={mode === "display"} onClick={() => setMode("display")} icon={Monitor} title="Digital display" note="A screen running a scheduled loop." />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Location <span className="text-muted-foreground">(optional)</span></label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Front entrance" />
          </div>
          {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={createDevice} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create device
          </Button>
        </div>
      )}

      {step === "install" && device && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-center">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Claim code · {device.deviceCode}</p>
            <p className="font-mono text-lg font-semibold tracking-wider text-foreground">{device.claimCode}</p>
          </div>
          {/* Easiest: download & double-click */}
          <div className="rounded-lg border border-brand-strong/40 bg-brand/5 p-3">
            <p className="text-sm font-semibold text-foreground">Easiest — download &amp; double-click</p>
            <ol className="mt-2 space-y-1.5 text-sm text-foreground">
              <li className="flex gap-2"><Num n={1} /> On the mini PC, download the installer below.</li>
              <li className="flex gap-2"><Num n={2} /> Double-click it, then click <b className="font-semibold">Yes</b> when Windows asks for permission.</li>
            </ol>
            <a href={batUrl || "#"} download>
              <Button className="mt-3 w-full"><Download className="h-4 w-4" /> Download Windows installer</Button>
            </a>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {isDisplay
                ? "Connects this screen, opens your player full-screen, stops the display sleeping, and reopens it at every sign-in."
                : `Installs Python, FFmpeg${mode === "motion" ? ", OpenCV" : ""}, connects this device, and auto-starts it at sign-in. First run can take a minute or two.`}
            </p>
          </div>

          {/* Screens are just as often a Pi as a Windows box. */}
          {isDisplay && (
            <details className="rounded-lg border border-border">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">Raspberry Pi or Linux screen instead</summary>
              <div className="space-y-2 border-t border-border p-3">
                <p className="text-xs text-muted-foreground">Run this on the Pi. Add <code className="rounded bg-muted px-1">--rotate left</code> for a portrait screen.</p>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs text-foreground">{shCommand}</pre>
              </div>
            </details>
          )}

          {/* Advanced: PowerShell fallback */}
          <details className="rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">Advanced — run a command in PowerShell instead</summary>
            <div className="space-y-2 border-t border-border p-3">
              <p className="text-xs text-muted-foreground">Open <b className="font-semibold text-foreground">PowerShell as Administrator</b> on the mini PC and paste this:</p>
              <div className="relative">
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background px-3 py-2.5 pr-10 font-mono text-xs text-foreground">{command}</pre>
                <button onClick={copyCommand} aria-label="Copy command" className="absolute right-2 top-2 rounded-md border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground">
                  {copied ? <Check className="h-4 w-4 text-brand-strong" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </details>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("details")}>Back</Button>
            <Button className="flex-1" onClick={() => setStep("waiting")}>I&apos;ve run it →</Button>
          </div>
        </div>
      )}

      {step === "waiting" && device && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-strong" />
          <p className="text-sm font-medium text-foreground">Waiting for {device.name} to check in…</p>
          <p className="max-w-xs text-xs text-muted-foreground">{isDisplay ? "Keep the installer window open on the screen’s PC. It checks in as soon as the player opens." : "Keep the installer window open on the mini PC. This can take a minute or two on first install while dependencies download."}</p>
          <Button variant="ghost" size="sm" onClick={() => setStep("install")}>Back to the installer</Button>
        </div>
      )}

      {step === "done" && device && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand-strong"><PartyPopper className="h-6 w-6" /></span>
          <p className="text-base font-semibold text-foreground">{device.name} is connected!</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            It&apos;s registered and reporting in{connected?.status === "online" ? " and online" : ""}.
            {mode === "motion" ? " It will play when the webcam sees motion." : mode === "display" ? " Give it a loop under Digital Displays → Screens and it starts playing." : " It will play on its schedule."}
          </p>
          <div className="mt-1 flex w-full gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link href={`/app/admin/devices/${device.deviceCode}`}>Open device</Link>
            </Button>
            <Button className="flex-1" onClick={() => onDone?.()}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Dialog wrapper for quick setup from anywhere. Remounts the flow on open so it resets.
export function DeviceSetupWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set up a device</DialogTitle>
        </DialogHeader>
        {open && <DeviceSetupFlow onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ["details", "install", "waiting", "done"];
  const idx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1.5">
      {order.map((s, i) => (
        <span key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= idx ? "bg-brand-strong" : "bg-muted")} />
      ))}
    </div>
  );
}

function Num({ n }: { n: number }) {
  return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-brand-strong">{n}</span>;
}

function ModeCard({ active, onClick, icon: Icon, title, note }: { active: boolean; onClick: () => void; icon: typeof Radar; title: string; note: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
        active ? "border-brand-strong bg-accent/40" : "border-border hover:bg-accent/30",
      )}
    >
      <Icon className={cn("h-5 w-5", active ? "text-brand-strong" : "text-muted-foreground")} />
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </button>
  );
}
