"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Mic, Play, Save, Sparkles, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { genId, useCollection } from "@/lib/crm/store";
import { LINK_TYPES, Recording, RecordingLinkType, fmtDuration } from "@/lib/recordings/types";
import { cn } from "@/lib/utils";

type LinkOpt = { id: string; label: string };

export function VoiceRecorder({ onSaved, defaultLink }: {
  onSaved?: () => void;
  defaultLink?: { type: RecordingLinkType; id: string; name: string };
}) {
  const { create } = useCollection<Recording>("recordings", []);
  const contacts = useCollection<{ id: string; name?: string }>("contacts", []);
  const plans = useCollection<{ id: string; name?: string; title?: string }>("plans", []);
  const docs = useCollection<{ id: string; title?: string; name?: string }>("ws_documents", []);

  const [phase, setPhase] = useState<"idle" | "recording" | "recorded">("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [linkType, setLinkType] = useState<RecordingLinkType>(defaultLink?.type ?? "none");
  const [linkId, setLinkId] = useState<string>(defaultLink?.id ?? "");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); if (timerRef.current) clearInterval(timerRef.current); if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  async function start() {
    setError("");
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setError("Microphone access is needed to record."); return; }
    streamRef.current = stream;
    chunksRef.current = [];
    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const b = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      setBlob(b);
      setAudioUrl(URL.createObjectURL(b));
      setPhase("recorded");
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    rec.start();
    setPhase("recording");
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stop() {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setPhase("idle"); setSeconds(0); setBlob(null); setAudioUrl(""); setTitle(""); setTranscript(""); setError("");
    setLinkType(defaultLink?.type ?? "none"); setLinkId(defaultLink?.id ?? "");
  }

  async function transcribe() {
    if (!blob) return;
    setTranscribing(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", blob, "recording.webm");
      const res = await fetch("/api/recordings/transcribe", { method: "POST", body: fd });
      const d = await res.json();
      if (res.status === 501) setError("Transcription isn't configured (OPENAI_API_KEY).");
      else if (!res.ok) setError(d.error || "Transcription failed.");
      else setTranscript(d.transcript || "");
    } catch { setError("Transcription failed."); }
    finally { setTranscribing(false); }
  }

  function linkOptions(): LinkOpt[] {
    if (linkType === "contact") return contacts.items.map((c) => ({ id: c.id, label: c.name || "Untitled" }));
    if (linkType === "plan") return plans.items.map((p) => ({ id: p.id, label: p.name || p.title || "Untitled plan" }));
    if (linkType === "workspace") return docs.items.map((d) => ({ id: d.id, label: d.title || d.name || "Untitled doc" }));
    return [];
  }

  async function save() {
    if (!blob) return;
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], `recording-${Date.now()}.webm`, { type: blob.type || "audio/webm" }));
      fd.append("folder", "recordings");
      const up = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) { setError(upData.error || "Couldn't save the audio."); setSaving(false); return; }
      const linkName = linkId ? (linkOptions().find((o) => o.id === linkId)?.label ?? defaultLink?.name ?? null) : null;
      create({
        id: genId("rec"), title: title.trim() || `Recording ${new Date().toLocaleString()}`, url: upData.url,
        mimeType: blob.type || "audio/webm", durationSec: seconds, transcript: transcript.trim(),
        status: transcript.trim() ? "transcribed" : "draft",
        linkType, linkId: linkType !== "none" ? (linkId || null) : null, linkName,
        tags: [], actor: "You", createdAt: new Date().toISOString(),
      });
      reset();
      onSaved?.();
    } catch { setError("Couldn't save the recording."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      {/* Recorder */}
      <div className="flex flex-col items-center rounded-xl border border-border bg-card p-5">
        <div className={cn("flex h-16 w-16 items-center justify-center rounded-full", phase === "recording" ? "bg-destructive/15 text-destructive" : "bg-brand/15 text-brand-strong")}>
          <Mic className={cn("h-7 w-7", phase === "recording" && "animate-pulse")} />
        </div>
        <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{fmtDuration(seconds)}</p>
        <p className="text-xs text-muted-foreground">{phase === "recording" ? "Recording…" : phase === "recorded" ? "Recorded" : "Tap record to start"}</p>
        <div className="mt-4 flex items-center gap-2">
          {phase === "idle" && <Button onClick={start}><Mic className="h-4 w-4" /> Record</Button>}
          {phase === "recording" && <Button variant="outline" className="text-destructive" onClick={stop}><Square className="h-4 w-4" /> Stop</Button>}
          {phase === "recorded" && <Button variant="outline" onClick={reset}><Trash2 className="h-4 w-4" /> Discard</Button>}
        </div>
      </div>

      {phase === "recorded" && audioUrl && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            <Play className="h-4 w-4 shrink-0 text-brand-strong" />
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={audioUrl} className="w-full" />
          </div>

          <Input placeholder="Recording title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={transcribe} disabled={transcribing}>{transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {transcribing ? "Transcribing…" : "Transcribe"}</Button>
            {transcript && <span className="text-xs text-brand-strong">Transcribed</span>}
          </div>
          {transcript && <Textarea rows={5} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Transcript" />}

          {/* Attach */}
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={linkType} onChange={(e) => { setLinkType(e.target.value as RecordingLinkType); setLinkId(""); }} className={selCls}>
              {LINK_TYPES.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
            {linkType !== "none" && (
              <select value={linkId} onChange={(e) => setLinkId(e.target.value)} className={selCls}>
                <option value="">Choose…</option>
                {linkOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save recording"}</Button>
        </>
      )}
      {phase !== "recorded" && error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

const selCls = "h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-brand-strong";
