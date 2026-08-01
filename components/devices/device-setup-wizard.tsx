"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, Radar, CalendarClock, PartyPopper, TerminalSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "motion" | "schedule";
type Step = "details" | "install" | "waiting" | "done";
type CreatedDevice = { id: string; name: string; deviceCode: string; claimCode: string | null };

// A device is "connected" once the agent has registered (hardwareId set) or is heartbeating.
type FleetDevice = { id: string; hardwareId: string | null; status: string; deviceCode: string };

export function DeviceSetupWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("Mini PC");
  const [mode, setMode] = useState<Mode>("motion");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<CreatedDevice | null>(null);
  const [connected, setConnected] = useState<FleetDevice | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset everything when the dialog closes.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setStep("details"); setName("Mini PC"); setMode("motion"); setLocation("");
      setBusy(false); setError(null); setDevice(null); setConnected(null); setCopied(false);
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://os.channelcast.io";
  const command =
    device &&
    `$env:CC_SERVER="${origin}"; $env:CC_CLAIM="${device.claimCode}";${mode === "motion" ? ' $env:CC_MOTION="webcam";' : ""} irm $env:CC_SERVER/install.ps1 | iex`;

  async function createDevice() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Mini PC", type: mode === "motion" ? "ai_vision" : "standard_audio", locationName: location.trim() || null }),
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

  // Poll the fleet while waiting; advance to "done" once the device checks in.
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set up a device</DialogTitle>
        </DialogHeader>

        <StepDots step={step} />

        {step === "details" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Name this player and pick how it plays. You&apos;ll run one command on the device next.</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Device name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mini PC — Front Entrance" />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Playback mode</span>
              <div className="grid grid-cols-2 gap-2">
                <ModeCard active={mode === "motion"} onClick={() => setMode("motion")} icon={Radar} title="Motion-activated" note="Plays when a USB webcam sees movement." />
                <ModeCard active={mode === "schedule"} onClick={() => setMode("schedule")} icon={CalendarClock} title="Scheduled" note="Plays on a set schedule/loop." />
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
            <ol className="space-y-2.5 text-sm text-foreground">
              <li className="flex gap-2"><Num n={1} /> On the mini PC, open <b className="font-semibold">PowerShell as Administrator</b> (right-click → Run as administrator).</li>
              <li className="flex gap-2"><Num n={2} /> Paste this command and press <b className="font-semibold">Enter</b>:</li>
            </ol>
            <div className="relative">
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background px-3 py-2.5 pr-10 font-mono text-xs text-foreground">{command}</pre>
              <button onClick={copyCommand} aria-label="Copy command" className="absolute right-2 top-2 rounded-md border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground">
                {copied ? <Check className="h-4 w-4 text-brand-strong" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <TerminalSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              It installs Python, ffmpeg{mode === "motion" ? ", and OpenCV" : ""}, registers this device, and starts it at logon. First run can take a minute or two.
            </p>
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
            <p className="max-w-xs text-xs text-muted-foreground">Keep the PowerShell window open on the mini PC. This can take a minute or two on first install while dependencies download.</p>
            <Button variant="ghost" size="sm" onClick={() => setStep("install")}>Back to the command</Button>
          </div>
        )}

        {step === "done" && device && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand-strong"><PartyPopper className="h-6 w-6" /></span>
            <p className="text-base font-semibold text-foreground">{device.name} is connected!</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              It&apos;s registered and reporting in{connected?.status === "online" ? " and online" : ""}.
              {mode === "motion" ? " It will play when the webcam sees motion." : " It will play on its schedule."}
            </p>
            <div className="mt-1 flex w-full gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <Link href={`/app/admin/devices/${device.deviceCode}`}>Open device</Link>
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
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
