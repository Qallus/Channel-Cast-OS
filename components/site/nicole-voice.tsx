"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff, Sparkles } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "connecting" | "live" | "error" | "unconfigured" | "ended";

const RELAY_URL = process.env.NEXT_PUBLIC_NICOLE_WS_URL;
const SAMPLE_RATE = 24000;

function floatToPCM16(f32: Float32Array): ArrayBuffer {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}
function b64FromBuf(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}
function bufFromB64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function NicoleCallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inCtxRef = useRef<AudioContext | null>(null);
  const outCtxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const playheadRef = useRef(0);
  const mutedRef = useRef(false);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("connecting"); setError(""); setTranscript(""); setMuted(false); setSpeaking(false);

    async function start() {
      if (!RELAY_URL) { setStatus("unconfigured"); return; }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        setStatus("error"); setError("We need microphone access to talk. Allow it and try again.");
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      micStreamRef.current = stream;

      const ws = new WebSocket(RELAY_URL!);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setStatus("live");
        // Mic → PCM16 → relay
        const inCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
        inCtxRef.current = inCtx;
        const src = inCtx.createMediaStreamSource(stream);
        const proc = inCtx.createScriptProcessor(4096, 1, 1);
        procRef.current = proc;
        proc.onaudioprocess = (e) => {
          if (mutedRef.current || ws.readyState !== WebSocket.OPEN) return;
          const pcm = floatToPCM16(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64FromBuf(pcm) }));
        };
        const sink = inCtx.createGain();
        sink.gain.value = 0; // avoid echo
        src.connect(proc); proc.connect(sink); sink.connect(inCtx.destination);
        // Output context + greeting
        outCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
        playheadRef.current = outCtxRef.current.currentTime;
        try { ws.send(JSON.stringify({ type: "response.create" })); } catch {}
      };

      ws.onmessage = (ev) => {
        let msg: { type?: string; delta?: string; error?: { message?: string } };
        try { msg = JSON.parse(typeof ev.data === "string" ? ev.data : ""); } catch { return; }
        if (msg.type === "response.output_audio_transcript.delta" && msg.delta) {
          setSpeaking(true);
          setTranscript((t) => (t + msg.delta).slice(-1200));
        } else if (msg.type === "response.output_audio.delta" && msg.delta) {
          playPCM(msg.delta);
        } else if (msg.type === "response.done" || msg.type === "response.output_audio.done") {
          setSpeaking(false);
        } else if (msg.type === "error") {
          setStatus("error"); setError(msg.error?.message || "The voice agent hit an error.");
        }
      };

      ws.onerror = () => { if (!cancelled) { setStatus("error"); setError("Couldn't reach the voice agent."); } };
      ws.onclose = () => { if (!cancelled && status === "live") setStatus("ended"); };
    }

    function playPCM(b64: string) {
      const ctx = outCtxRef.current;
      if (!ctx) return;
      const int16 = new Int16Array(bufFromB64(b64));
      const f32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 0x8000;
      const buf = ctx.createBuffer(1, f32.length, SAMPLE_RATE);
      buf.getChannelData(0).set(f32);
      const node = ctx.createBufferSource();
      node.buffer = buf; node.connect(ctx.destination);
      const t = Math.max(ctx.currentTime, playheadRef.current);
      node.start(t);
      playheadRef.current = t + buf.duration;
    }

    start();
    return () => {
      cancelled = true;
      try { wsRef.current?.close(); } catch {}
      try { procRef.current?.disconnect(); } catch {}
      try { inCtxRef.current?.close(); } catch {}
      try { outCtxRef.current?.close(); } catch {}
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      wsRef.current = null; micStreamRef.current = null; inCtxRef.current = null; outCtxRef.current = null; procRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand-strong" /> Nicole — Channel Cast</DialogTitle></DialogHeader>

        <div className="flex flex-col items-center py-2 text-center">
          {/* Avatar / status orb */}
          <div className={cn("relative flex h-24 w-24 items-center justify-center rounded-full bg-brand/15 text-brand-strong", speaking && "cc-float")}>
            <Sparkles className="h-9 w-9" />
            {status === "live" && (
              <span className="absolute inset-0 rounded-full">
                <span className={cn("absolute inset-0 rounded-full border-2 border-brand-strong/50", speaking ? "animate-ping" : "opacity-0")} />
              </span>
            )}
          </div>

          <p className="mt-4 text-sm font-medium text-foreground">
            {status === "connecting" && "Connecting…"}
            {status === "live" && (speaking ? "Nicole is speaking…" : muted ? "Muted — tap to unmute" : "Listening…")}
            {status === "ended" && "Call ended"}
            {status === "error" && "Something went wrong"}
            {status === "unconfigured" && "Voice agent not set up yet"}
          </p>

          {status === "unconfigured" && <p className="mt-1 max-w-xs text-xs text-muted-foreground">The voice relay isn&apos;t configured. Meanwhile you can call us at (480) 999-9906.</p>}
          {status === "error" && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{error}</p>}

          {/* Transcript */}
          {transcript && (
            <div className="mt-4 max-h-28 w-full overflow-y-auto rounded-xl border border-border bg-background p-3 text-left text-sm text-foreground">{transcript}</div>
          )}

          {/* Controls */}
          <div className="mt-6 flex items-center gap-3">
            {status === "live" ? (
              <button onClick={() => setMuted((m) => !m)} className={cn("flex h-12 w-12 items-center justify-center rounded-full border transition-colors", muted ? "border-warning/50 bg-warning/10 text-warning" : "border-border text-foreground hover:bg-accent")} aria-label={muted ? "Unmute" : "Mute"}>
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            ) : status === "connecting" ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : null}

            <button onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:opacity-90" aria-label="End call">
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>

          {(status === "error" || status === "ended" || status === "unconfigured") && (
            <Button asChild variant="outline" className="mt-4"><a href="tel:+14809999906">Call (480) 999-9906 instead</a></Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
