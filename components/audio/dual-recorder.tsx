"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Mic, Monitor, Pause, Play, RefreshCw, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { encodeWav, fmtBytes, mergeChannels } from "@/lib/audio/wav-encoder";
import { cn } from "@/lib/utils";

const SR = 48000;
const MAX_SEC = 20 * 60;
const WORKLET = `class PcmCapture extends AudioWorkletProcessor{process(inputs){const i=inputs[0];if(i&&i.length&&i[0]&&i[0].length){const c=[];for(let k=0;k<i.length;k++)c.push(new Float32Array(i[k]));this.port.postMessage(c,c.map(a=>a.buffer));}return true;}}registerProcessor('pcm-capture',PcmCapture);`;

type Phase = "idle" | "recording" | "paused" | "stopped";
type Track = { blocks: Float32Array[][]; analyser: AnalyserNode | null; level: number; clip: boolean };
type Result = { url: string; size: number };

const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function DualRecorder() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [supportNote, setSupportNote] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [micId, setMicId] = useState<string>("");
  const [armSystem, setArmSystem] = useState(true);
  const [armMic, setArmMic] = useState(true);
  const [sessionName, setSessionName] = useState("channel-cast-session");

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [sysMeter, setSysMeter] = useState({ level: 0, clip: false });
  const [micMeter, setMicMeter] = useState({ level: 0, clip: false });
  const [results, setResults] = useState<{ system?: Result; mic?: Result }>({});

  const ctxRef = useRef<AudioContext | null>(null);
  const displayRef = useRef<MediaStream | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const sysRef = useRef<Track>({ blocks: [], analyser: null, level: 0, clip: false });
  const micTrackRef = useRef<Track>({ blocks: [], analyser: null, level: 0, clip: false });
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef(0);
  const pausedRef = useRef(false);

  // Feature detection
  useEffect(() => {
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (!md?.getDisplayMedia || !window.isSecureContext) { setSupported(false); setSupportNote("This browser can't capture system audio, or the page isn't served over HTTPS."); return; }
    if (/Firefox/.test(ua)) { setSupported(false); setSupportNote("Firefox can't capture system audio. Use Chrome or Edge on Windows."); return; }
    if (/^((?!chrome|android|crios|edg).)*safari/i.test(ua)) { setSupported(false); setSupportNote("Safari isn't supported. Use Chrome or Edge on Windows for full system audio."); return; }
    setSupported(true);
    if (/Macintosh/.test(ua)) setSupportNote("On macOS, Chrome can capture tab audio only (not full system audio). Choose a tab and tick “Share tab audio”.");
    md.enumerateDevices?.().then((d) => setDevices(d.filter((x) => x.kind === "audioinput"))).catch(() => {});
  }, []);

  const loop = useCallback(() => {
    const read = (tr: Track) => {
      if (!tr.analyser) return { level: 0, clip: false };
      const buf = new Float32Array(tr.analyser.fftSize);
      tr.analyser.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > peak) peak = a; }
      return { level: peak, clip: peak > 0.99 };
    };
    setSysMeter(read(sysRef.current));
    setMicMeter(read(micTrackRef.current));
    const ctx = ctxRef.current;
    if (ctx && !pausedRef.current) setElapsed(ctx.currentTime - startRef.current - pausedTotalRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // Auto-stop at max duration + 80% warning
  useEffect(() => {
    if (phase !== "recording") return;
    if (elapsed >= MAX_SEC) { stop(); }
    else if (elapsed >= MAX_SEC * 0.8 && !warn) setWarn(`Approaching the ${MAX_SEC / 60}-minute limit — the recording will stop automatically.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, phase]);

  // Warn before closing while recording
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (phase === "recording" || phase === "paused") { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [phase]);

  async function start() {
    setError(""); setWarn(""); setResults({});
    sysRef.current = { blocks: [], analyser: null, level: 0, clip: false };
    micTrackRef.current = { blocks: [], analyser: null, level: 0, clip: false };
    let display: MediaStream | null = null;
    let mic: MediaStream | null = null;

    try {
      if (armSystem) {
        display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } as MediaTrackConstraints });
        if (!display.getAudioTracks().length) {
          display.getTracks().forEach((t) => t.stop());
          setError("System audio wasn't shared. Retry and tick “Share system audio” (or “Share tab audio”) in the picker.");
          return;
        }
      }
    } catch {
      // user cancelled the picker → back to idle, no error
      return;
    }

    try {
      if (armMic) {
        mic = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: micId ? { exact: micId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        navigator.mediaDevices.enumerateDevices().then((d) => setDevices(d.filter((x) => x.kind === "audioinput"))).catch(() => {});
      }
    } catch {
      if (!display) { setError("Microphone permission was denied and system audio isn't armed. Nothing to record."); return; }
      setWarn("Microphone was blocked — recording system audio only.");
      mic = null;
    }

    displayRef.current = display; micRef.current = mic;
    const ctx = new AudioContext({ sampleRate: SR });
    ctxRef.current = ctx;
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const wire = (stream: MediaStream, tr: Track) => {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
      const node = new AudioWorkletNode(ctx, "pcm-capture");
      node.port.onmessage = (e) => { if (!pausedRef.current) tr.blocks.push(e.data as Float32Array[]); };
      source.connect(analyser);
      source.connect(node); // not connected to destination → no echo
      tr.analyser = analyser;
    };
    if (display) wire(new MediaStream(display.getAudioTracks()), sysRef.current);
    if (mic) wire(mic, micTrackRef.current);

    // Finalize gracefully if the user ends sharing via the browser's own banner.
    display?.getVideoTracks()[0]?.addEventListener("ended", () => stop());

    startRef.current = ctx.currentTime;
    pausedTotalRef.current = 0; pausedRef.current = false;
    setElapsed(0); setPhase("recording");
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }

  function pause() { if (phase !== "recording") return; pausedRef.current = true; pauseStartRef.current = ctxRef.current!.currentTime; setPhase("paused"); }
  function resume() { if (phase !== "paused") return; pausedTotalRef.current += ctxRef.current!.currentTime - pauseStartRef.current; pausedRef.current = false; setPhase("recording"); }

  function stop() {
    if (phase === "idle" || phase === "stopped") return;
    cancelAnimationFrame(rafRef.current);
    const finalize = (tr: Track, name: string): Result | undefined => {
      if (!tr.blocks.length) return undefined;
      const blob = encodeWav(mergeChannels(tr.blocks), SR);
      void name;
      return { url: URL.createObjectURL(blob), size: blob.size };
    };
    const system = finalize(sysRef.current, "system");
    const mic = finalize(micTrackRef.current, "mic");
    setResults({ system, mic });
    // Now safe to stop tracks + close context.
    displayRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null; displayRef.current = null; micRef.current = null;
    setPhase("stopped");
  }

  function reset() {
    if (results.system) URL.revokeObjectURL(results.system.url);
    if (results.mic) URL.revokeObjectURL(results.mic.url);
    setResults({}); setPhase("idle"); setElapsed(0); setError(""); setWarn("");
    setSysMeter({ level: 0, clip: false }); setMicMeter({ level: 0, clip: false });
  }

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); ctxRef.current?.close().catch(() => {}); }, []);

  const download = (r: Result, suffix: string) => {
    const a = document.createElement("a");
    a.href = r.url; a.download = `${sessionName || "session"}-${suffix}.wav`;
    a.click();
  };

  if (supported === false) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-warning" />
        <p className="mt-3 text-sm font-semibold text-foreground">This browser can&apos;t capture system audio</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{supportNote}</p>
      </div>
    );
  }

  const recording = phase === "recording" || phase === "paused";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Dual-track capture</p>
        <p className="text-xs text-muted-foreground">Record system audio and your mic as separate, sample-aligned WAV tracks — ready for DaVinci Resolve. Everything stays in your browser.</p>
        {supportNote && <p className="mt-2 text-xs text-brand-strong">{supportNote}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Session name</p>
            <Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} disabled={recording} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Microphone</p>
            <select value={micId} onChange={(e) => setMicId(e.target.value)} disabled={recording} className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground">
              <option value="">Default microphone</option>
              {devices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm"><Switch checked={armSystem} onCheckedChange={setArmSystem} disabled={recording} /> <Monitor className="h-4 w-4 text-muted-foreground" /> System audio</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={armMic} onCheckedChange={setArmMic} disabled={recording} /> <Mic className="h-4 w-4 text-muted-foreground" /> Microphone</label>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">When you start, tick <span className="font-medium text-foreground">“Share system audio”</span> (or “Share tab audio”) in the browser picker — otherwise no audio is captured.</p>
      </div>

      {/* Meters + transport */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg tabular-nums text-foreground">{mm(elapsed)}</span>
          <span className={cn("text-xs font-medium", phase === "recording" ? "text-destructive" : phase === "paused" ? "text-warning" : "text-muted-foreground")}>{phase === "recording" ? "● Recording" : phase === "paused" ? "Paused" : phase === "stopped" ? "Stopped" : "Ready"}</span>
        </div>
        <div className="mt-3 space-y-2">
          <Meter label="System" icon={Monitor} m={sysMeter} armed={armSystem} />
          <Meter label="Mic" icon={Mic} m={micMeter} armed={armMic} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {phase === "idle" && <Button onClick={start} disabled={!armSystem && !armMic}><span className="mr-1 h-2.5 w-2.5 rounded-full bg-destructive" /> Record</Button>}
          {phase === "recording" && <Button variant="outline" onClick={pause}><Pause className="h-4 w-4" /> Pause</Button>}
          {phase === "paused" && <Button variant="outline" onClick={resume}><Play className="h-4 w-4" /> Resume</Button>}
          {recording && <Button variant="outline" className="text-destructive" onClick={stop}><Square className="h-4 w-4" /> Stop</Button>}
          {phase === "stopped" && <Button variant="outline" onClick={reset}><RefreshCw className="h-4 w-4" /> New recording</Button>}
        </div>
        {error && <p className="mt-3 flex items-start gap-1.5 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error} {error.includes("System audio") && <button onClick={start} className="font-medium underline">Retry</button>}</p>}
        {warn && <p className="mt-2 text-sm text-warning">{warn}</p>}
      </div>

      {/* Results */}
      {phase === "stopped" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["system", "mic"] as const).map((k) => {
            const r = results[k];
            if (!r) return null;
            return (
              <div key={k} className="rounded-xl border border-border bg-card p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold capitalize text-foreground">{k === "system" ? <Monitor className="h-4 w-4 text-brand-strong" /> : <Mic className="h-4 w-4 text-brand-strong" />} {k} track</p>
                <p className="text-xs text-muted-foreground">{sessionName}-{k}.wav · {fmtBytes(r.size)} · WAV 16-bit / 48 kHz</p>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={r.url} className="mt-2 w-full" />
                <Button className="mt-2 w-full" onClick={() => download(r, k)}><Download className="h-4 w-4" /> Download {k} WAV</Button>
              </div>
            );
          })}
          {!results.system && !results.mic && <p className="text-sm text-muted-foreground">No audio was captured.</p>}
        </div>
      )}
    </div>
  );
}

function Meter({ label, icon: Icon, m, armed }: { label: string; icon: typeof Mic; m: { level: number; clip: boolean }; armed: boolean }) {
  const pct = Math.min(100, m.level * 100);
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-14 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        {armed && <div className={cn("h-full rounded-full transition-[width] duration-75", m.clip ? "bg-destructive" : "bg-brand")} style={{ width: `${pct}%` }} />}
      </div>
      <span className={cn("w-8 shrink-0 text-right text-[10px]", m.clip ? "text-destructive" : "text-muted-foreground")}>{m.clip ? "CLIP" : `${Math.round(pct)}`}</span>
    </div>
  );
}
