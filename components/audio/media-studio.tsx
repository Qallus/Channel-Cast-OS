"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, Music, Play, Sparkles, Square, Upload, Wand2, X } from "lucide-react";

import { AudioPlayer } from "@/components/audio/audio-player";
import { BackgroundMusic } from "@/components/audio/background-music";
import { SpotThumb } from "@/components/audio/spot-thumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { imageToDataUrl, saveMeta } from "@/lib/audio/spot-meta";
import { encodeWav } from "@/lib/audio/wav";
import { cn } from "@/lib/utils";

const SR = 44100;

type Voice = { id: string; name: string; gender?: string; description?: string };
type Provider = { id: string; label: string; configured: boolean; voices: Voice[] };
type LibAudio = { id: string; name: string };
type VoiceMode = "record" | "upload" | "ai";

export function MediaStudio({ onSaved }: { onSaved?: () => void }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = () => (ctxRef.current ??= new AudioContext({ sampleRate: SR }));

  const [library, setLibrary] = useState<LibAudio[]>([]);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("record");

  const [voiceBuffer, setVoiceBuffer] = useState<AudioBuffer | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [musicBuffer, setMusicBuffer] = useState<AudioBuffer | null>(null);
  const [musicName, setMusicName] = useState("");

  // Mix controls
  const [voiceGain, setVoiceGain] = useState(1.0);
  const [musicGain, setMusicGain] = useState(0.35);
  const [loopMusic, setLoopMusic] = useState(true);
  const [leadIn, setLeadIn] = useState(0);

  // Recording
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // AI
  const [script, setScript] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [speed, setSpeed] = useState(1.0);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [aiPreviewSrc, setAiPreviewSrc] = useState<string | null>(null);
  const [provider, setProvider] = useState("openai");
  const [ttsProviders, setTtsProviders] = useState<Provider[]>([]);

  const currentVoices = ttsProviders.find((p) => p.id === provider)?.voices ?? [];
  function chooseProvider(id: string) {
    setProvider(id);
    const voices = ttsProviders.find((p) => p.id === id)?.voices ?? [];
    setVoiceId(voices[0]?.id ?? "");
  }

  // Preview + render
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<{ ctx: AudioContext; sources: AudioBufferSourceNode[] } | null>(null);
  const [rendering, setRendering] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Spot details attached to the rendered mix when it's saved to the library.
  const [spotName, setSpotName] = useState("");
  const [spotDescription, setSpotDescription] = useState("");
  const [spotImage, setSpotImage] = useState<string | null>(null);
  const spotImageRef = useRef<HTMLInputElement>(null);
  async function pickSpotImage(file: File | null) {
    if (file) setSpotImage(await imageToDataUrl(file));
    if (spotImageRef.current) spotImageRef.current.value = "";
  }

  const loadLibrary = async () => setLibrary(await (await fetch("/api/admin/audio")).json());
  useEffect(() => {
    loadLibrary();
    fetch("/api/admin/ai-voice")
      .then((r) => r.json())
      .then((d: { providers?: Provider[] }) => {
        if (!d.providers) return;
        setTtsProviders(d.providers);
        const chosen = d.providers.find((p) => p.configured) ?? d.providers[0];
        if (chosen) {
          setProvider(chosen.id);
          setVoiceId(chosen.voices?.[0]?.id ?? "");
        }
      })
      .catch(() => {});
  }, []);

  async function decodeFile(file: File): Promise<AudioBuffer> {
    return getCtx().decodeAudioData(await file.arrayBuffer());
  }
  async function decodeLibrary(id: string): Promise<AudioBuffer> {
    const res = await fetch(`/api/audio/${id}/file`);
    return getCtx().decodeAudioData(await res.arrayBuffer());
  }

  /* ── voice sources ── */
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: rec.mimeType });
      const buf = await getCtx().decodeAudioData(await blob.arrayBuffer());
      setVoiceBuffer(buf);
      setVoiceName("Voice recording");
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
  }
  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function pickVoiceFile(file: File | null) {
    if (!file) return;
    setVoiceBuffer(await decodeFile(file));
    setVoiceName(file.name);
  }
  async function pickVoiceFromLibrary(id: string) {
    if (!id) return;
    const a = library.find((x) => x.id === id);
    setVoiceBuffer(await decodeLibrary(id));
    setVoiceName(a?.name ?? "Library track");
  }

  /* ── AI voice ── */
  const [generating, setGenerating] = useState(false);
  async function generateAiVoice() {
    setAiMsg("Generating with OpenAI…");
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/ai-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, voice: voiceId, speed, provider }),
      });
      const data = await res.json();
      if (data.audio?.id) {
        setAiPreviewSrc(`/api/audio/${data.audio.id}/file`);
        await loadLibrary();
        onSaved?.();
        try {
          setVoiceBuffer(await decodeLibrary(data.audio.id));
          setVoiceName(data.audio.name);
          setAiMsg("Generated — playing below, loaded as the voiceover, and saved to the library.");
        } catch {
          setVoiceName(data.audio.name);
          setAiMsg("Generated & saved. Play it below; it may not load into the mixer — try another engine if so.");
        }
      } else {
        setAiMsg(data.hint || data.detail || data.error || "Generation unavailable.");
      }
    } catch (e) {
      setAiMsg(`Generation failed: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  /* ── preview mix ── */
  function stopPreview() {
    playRef.current?.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    playRef.current = null;
    setPlaying(false);
  }
  function previewMix() {
    if (!voiceBuffer && !musicBuffer) return;
    stopPreview();
    const ctx = getCtx();
    const sources: AudioBufferSourceNode[] = [];
    const now = ctx.currentTime + 0.05;

    if (musicBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = musicBuffer;
      src.loop = loopMusic;
      const g = ctx.createGain();
      g.gain.value = musicGain;
      src.connect(g).connect(ctx.destination);
      src.start(now);
      if (voiceBuffer && !loopMusic) src.stop(now + voiceBuffer.duration + leadIn);
      sources.push(src);
    }
    if (voiceBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = voiceBuffer;
      const g = ctx.createGain();
      g.gain.value = voiceGain;
      src.connect(g).connect(ctx.destination);
      src.start(now + leadIn);
      src.onended = stopPreview;
      sources.push(src);
    }
    playRef.current = { ctx, sources };
    setPlaying(true);
  }

  /* ── render + save ── */
  async function renderAndSave() {
    if (!voiceBuffer && !musicBuffer) return;
    setRendering(true);
    setSaveMsg(null);
    try {
      const base = voiceBuffer ?? musicBuffer!;
      const durationSec = (voiceBuffer ? voiceBuffer.duration + leadIn : musicBuffer!.duration) + 0.4;
      const length = Math.ceil(durationSec * SR);
      const offline = new OfflineAudioContext(2, length, SR);

      if (musicBuffer) {
        const src = offline.createBufferSource();
        src.buffer = musicBuffer;
        src.loop = loopMusic;
        const g = offline.createGain();
        g.gain.value = musicGain;
        src.connect(g).connect(offline.destination);
        src.start(0);
      }
      if (voiceBuffer) {
        const src = offline.createBufferSource();
        src.buffer = voiceBuffer;
        const g = offline.createGain();
        g.gain.value = voiceGain;
        src.connect(g).connect(offline.destination);
        src.start(leadIn);
      }
      void base;

      const rendered = await offline.startRendering();
      const wav = encodeWav(rendered);
      const spot = spotName.trim() || voiceName || "Studio mix";
      const name = `${spot}${musicBuffer ? " + music" : ""}.wav`;
      const fd = new FormData();
      fd.append("file", new File([wav], name, { type: "audio/wav" }));
      const res = await fetch("/api/admin/audio", { method: "POST", body: fd });
      // Attach the spot's description/image to the new record (keyed by its id).
      const created = await res.json().catch(() => null);
      if (created?.id && (spotDescription.trim() || spotImage)) {
        saveMeta(created.id, { description: spotDescription.trim(), image: spotImage });
      }
      setSaveMsg(`Saved "${name}" to the audio library.`);
      setSpotName("");
      setSpotDescription("");
      setSpotImage(null);
      await loadLibrary();
      onSaved?.();
    } catch (e) {
      setSaveMsg(`Render failed: ${(e as Error).message}`);
    } finally {
      setRendering(false);
    }
  }

  /* ── waveform ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = (canvas.width = canvas.clientWidth * 2);
    const h = (canvas.height = 120);
    ctx.clearRect(0, 0, w, h);
    if (!voiceBuffer) return;
    const data = voiceBuffer.getChannelData(0);
    const step = Math.floor(data.length / w) || 1;
    ctx.fillStyle = "hsl(74 100% 50%)";
    for (let x = 0; x < w; x++) {
      let min = 1;
      let max = -1;
      for (let i = 0; i < step; i++) {
        const v = data[x * step + i] ?? 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = ((1 + min) / 2) * h;
      const y2 = ((1 + max) / 2) * h;
      ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  }, [voiceBuffer]);

  const hasSomething = Boolean(voiceBuffer || musicBuffer);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Voiceover source */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Mic className="h-5 w-5 text-brand-strong" />
            <div>
              <CardTitle>Voiceover</CardTitle>
              <CardDescription>Record, upload, or generate the voice track.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-1 rounded-md border border-border bg-card p-1">
              {(["record", "upload", "ai"] as VoiceMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setVoiceMode(m)}
                  className={cn(
                    "flex-1 rounded px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                    voiceMode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "ai" ? "AI voice" : m}
                </button>
              ))}
            </div>

            {voiceMode === "record" && (
              <div className="flex items-center gap-2">
                {recording ? (
                  <Button variant="destructive" onClick={stopRecording}><Square className="h-4 w-4" /> Stop</Button>
                ) : (
                  <Button onClick={startRecording}><Mic className="h-4 w-4" /> Record</Button>
                )}
                {recording && <span className="flex items-center gap-1.5 text-sm text-destructive"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" /> recording…</span>}
              </div>
            )}

            {voiceMode === "upload" && (
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">Upload a file</span>
                  <input type="file" accept="audio/*" onChange={(e) => pickVoiceFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">…or pick from library</span>
                  <select onChange={(e) => pickVoiceFromLibrary(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Select…</option>
                    {library.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
              </div>
            )}

            {voiceMode === "ai" && (
              <div className="space-y-3">
                {ttsProviders.length > 0 && (
                  <div>
                    <span className="mb-1.5 block text-xs text-muted-foreground">Voice engine</span>
                    <div className="flex gap-1 rounded-md border border-border bg-card p-1">
                      {ttsProviders.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => chooseProvider(p.id)}
                          disabled={!p.configured}
                          title={p.configured ? undefined : "Add the API key to enable"}
                          className={cn(
                            "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                            provider === p.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                            !p.configured && "cursor-not-allowed opacity-40",
                          )}
                        >
                          {p.label}
                          {!p.configured && " ·"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="Type the script the AI voice should read…" className="min-h-[80px]" />
                <div>
                  <span className="mb-1.5 block text-xs text-muted-foreground">Voice ({currentVoices.length})</span>
                  <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                    {currentVoices.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVoiceId(v.id)}
                        className={cn("rounded-md border p-2 text-left transition-colors", voiceId === v.id ? "border-brand bg-brand/10" : "border-border hover:bg-accent/40")}
                      >
                        <span className="block text-sm font-medium text-foreground">{v.name}</span>
                        {(v.gender || v.description) && (
                          <span className="block text-[11px] text-muted-foreground">{[v.gender, v.description].filter(Boolean).join(" · ")}</span>
                        )}
                      </button>
                    ))}
                    {currentVoices.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No voices available for this engine.</p>}
                  </div>
                </div>
                <label className="flex items-center gap-3 text-xs text-muted-foreground">
                  Speed {speed.toFixed(2)}×
                  <input type="range" min={0.6} max={1.6} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="flex-1 accent-[hsl(var(--brand))]" />
                </label>
                <Button onClick={generateAiVoice} disabled={!script.trim() || generating} className="w-full">
                  <Sparkles className="h-4 w-4" /> {generating ? "Generating…" : "Generate voice"}
                </Button>
                {aiPreviewSrc && <AudioPlayer src={aiPreviewSrc} downloadName="ai-voice.wav" />}
                {aiMsg && <p className="text-xs text-muted-foreground">{aiMsg}</p>}
              </div>
            )}

            <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
              {voiceBuffer ? (
                <span className="text-foreground">Voice ready: <span className="font-medium">{voiceName}</span> · {voiceBuffer.duration.toFixed(1)}s</span>
              ) : (
                <span className="text-muted-foreground">No voiceover loaded yet.</span>
              )}
            </div>
            <canvas ref={canvasRef} className="h-[60px] w-full rounded-md bg-muted/20" />
          </CardContent>
        </Card>

        {/* Background music */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Music className="h-5 w-5 text-brand-strong" />
            <div>
              <CardTitle>Background music</CardTitle>
              <CardDescription>Overlay a bed under the voiceover.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <BackgroundMusic
              library={library}
              onMusic={(buf, name) => {
                setMusicBuffer(buf);
                setMusicName(name);
              }}
            />
            <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
              {musicBuffer ? (
                <span className="text-foreground">Bed loaded: <span className="font-medium">{musicName}</span> · {musicBuffer.duration.toFixed(1)}s</span>
              ) : (
                <span className="text-muted-foreground">No music bed yet.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mixer + output */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Wand2 className="h-5 w-5 text-brand-strong" />
          <div>
            <CardTitle>Mix &amp; export</CardTitle>
            <CardDescription>Balance the levels, preview, then render to the library.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Slider label={`Voice level ${Math.round(voiceGain * 100)}%`} min={0} max={1.5} step={0.05} value={voiceGain} onChange={setVoiceGain} />
            <Slider label={`Music level ${Math.round(musicGain * 100)}%`} min={0} max={1} step={0.05} value={musicGain} onChange={setMusicGain} />
            <label className="block text-xs text-muted-foreground">
              Music lead-in (s)
              <Input type="number" min={0} step={0.5} value={leadIn} onChange={(e) => setLeadIn(Number(e.target.value))} className="mt-1" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={loopMusic} onChange={(e) => setLoopMusic(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--brand))]" />
            Loop music to fill the voiceover
          </label>
          {/* Spot details saved with the rendered mix */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Spot details</p>
            <div className="flex items-center gap-3">
              <SpotThumb image={spotImage} size="lg" />
              <div className="flex items-center gap-2">
                <input ref={spotImageRef} type="file" accept="image/*" hidden onChange={(e) => pickSpotImage(e.target.files?.[0] ?? null)} />
                <Button type="button" variant="outline" size="sm" onClick={() => spotImageRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" /> {spotImage ? "Replace image" : "Add image"}
                </Button>
                {spotImage && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSpotImage(null)}>
                    <X className="h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">Spot name</span>
              <Input value={spotName} onChange={(e) => setSpotName(e.target.value)} placeholder={voiceName || "Name this spot"} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">Description</span>
              <Textarea rows={2} value={spotDescription} onChange={(e) => setSpotDescription(e.target.value)} placeholder="What this spot is, who it's for, key message…" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {playing ? (
              <Button variant="destructive" onClick={stopPreview}><Square className="h-4 w-4" /> Stop</Button>
            ) : (
              <Button variant="outline" onClick={previewMix} disabled={!hasSomething}><Play className="h-4 w-4" /> Preview mix</Button>
            )}
            <Button onClick={renderAndSave} disabled={!hasSomething || rendering}>
              <Sparkles className="h-4 w-4" /> {rendering ? "Rendering…" : "Render & save to library"}
            </Button>
          </div>
          {saveMsg && <p className="text-sm text-brand-strong">{saveMsg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--brand))]" />
    </label>
  );
}
