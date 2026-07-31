"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Call, Device as TwilioDevice } from "@twilio/voice-sdk";
import {
  Bell,
  ChevronDown,
  Contact as ContactIcon,
  Delete,
  Download,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  Voicemail,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ── types ───────────────────────────────────────────────────────────── */

type CallRecord = {
  sid: string;
  to: string | null;
  from: string | null;
  status: string;
  direction: string;
  duration: string | null;
  price: string | null;
  priceUnit: string | null;
  dateCreated: string;
};
type Recording = { sid: string; duration: string | null; audioUrl: string };
type Note = { id: string; note: string; created_at: string };
type Sms = { id: string; direction: string; from_number: string | null; to_number: string | null; body: string; status: string | null; created_at: string };

type Tab = "calls" | "sms" | "contacts" | "ai_voice" | "email" | "notifications" | "social";
const TABS: { id: Tab; label: string; icon: typeof Phone }[] = [
  { id: "calls", label: "Calls", icon: Phone },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "contacts", label: "Contacts", icon: ContactIcon },
  { id: "ai_voice", label: "AI Voice", icon: Mic },
  { id: "email", label: "Email", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "social", label: "Social Media", icon: Share2 },
];

/* ── helpers ─────────────────────────────────────────────────────────── */

function fmtPhone(v: string | null): string {
  if (!v) return "Unknown";
  const d = v.replace(/[^\d]/g, "");
  const local = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
  if (local.length === 10) return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  return v;
}
const fmtDur = (s: string | null) => {
  const n = Number(s || 0);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const isInbound = (d: string) => d?.toLowerCase().includes("inbound");
const estCost = (c: CallRecord) => (c.price ? `${c.priceUnit || "$"} ${Math.abs(Number(c.price)).toFixed(4)}` : null);

/* ── root ────────────────────────────────────────────────────────────── */

export function Communications() {
  const [tab, setTab] = useState<Tab>("calls");

  // Shared Twilio config (numbers, device readiness) loaded once.
  const [numbers, setNumbers] = useState<string[]>([]);
  const [smsNumbers, setSmsNumbers] = useState<string[]>([]);
  const [defaultFrom, setDefaultFrom] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "dialpad_off" | "not_configured">("loading");
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/comm/token");
        const data = await res.json();
        if (!res.ok) {
          setStatus("not_configured");
          return;
        }
        tokenRef.current = data.token;
        setNumbers(data.phoneNumbers || []);
        setSmsNumbers(data.smsPhoneNumbers || []);
        setDefaultFrom(data.defaultPhoneNumber || null);
        setStatus(data.dialpadReady ? "ready" : "dialpad_off");
      } catch {
        setStatus("not_configured");
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-brand-strong"><PhoneCall className="h-5 w-5" /></span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Communications</h1>
          <StatusPill status={status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Voice calls, SMS messaging, contacts, and AI voice — powered by Twilio.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                active ? "border-brand-strong text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-brand-strong")} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "calls" && <CallsTab numbers={numbers} defaultFrom={defaultFrom} status={status} token={tokenRef.current} />}
      {tab === "sms" && <SmsTab smsNumbers={smsNumbers} defaultFrom={defaultFrom} />}
      {tab === "ai_voice" && <AiVoiceTab />}
      {tab === "contacts" && <Placeholder icon={ContactIcon} title="Contacts" note="A shared contact book across calls, SMS, and email. Wire it to your CRM Contacts next." />}
      {tab === "email" && <Placeholder icon={Mail} title="Email" note="Inbox + compose over Resend/SMTP (already configured in your env). Reference coming from you." />}
      {tab === "notifications" && <Placeholder icon={Bell} title="Notifications (DM)" note="Web-push notifications via VAPID (keys generated). Direct-message center lands here." />}
      {tab === "social" && <Placeholder icon={Share2} title="Social Media" note="Unified social inbox. Reference coming from you." />}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string; dot: string }> = {
    loading: { label: "Connecting…", tone: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
    ready: { label: "Ready", tone: "bg-success/15 text-success", dot: "bg-success" },
    dialpad_off: { label: "Config needed", tone: "bg-warning/15 text-warning", dot: "bg-warning" },
    not_configured: { label: "Not configured", tone: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
  };
  const m = map[status] || map.loading;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", m.tone)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} /> {m.label}
    </span>
  );
}

/* ── Calls tab ───────────────────────────────────────────────────────── */

function CallsTab({ numbers, defaultFrom, status, token }: { numbers: string[]; defaultFrom: string | null; status: string; token: string | null }) {
  const [dialInput, setDialInput] = useState("");
  const [from, setFrom] = useState<string | null>(defaultFrom);
  const [mode, setMode] = useState<"history" | "voicemail">("history");
  const [filter, setFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const deviceRef = useRef<TwilioDevice | null>(null);
  const callRef = useRef<Call | null>(null);
  const [callState, setCallState] = useState<"idle" | "connecting" | "on_call">("idle");

  useEffect(() => setFrom(defaultFrom), [defaultFrom]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comm/calls?limit=50${mode === "voicemail" ? "&voicemail=true" : ""}`);
      const data = await res.json();
      if (res.ok) setCalls(data.calls || []);
    } finally {
      setLoading(false);
    }
  }, [mode]);
  useEffect(() => {
    load();
  }, [load]);

  // Lazily register the Voice SDK device when a token + TwiML app are ready.
  useEffect(() => {
    if (status !== "ready" || !token || deviceRef.current) return;
    let device: TwilioDevice | null = null;
    (async () => {
      const { Device } = await import("@twilio/voice-sdk");
      device = new Device(token, { logLevel: "error" });
      deviceRef.current = device;
      device.register().catch(() => {});
    })();
    return () => {
      device?.destroy();
      deviceRef.current = null;
    };
  }, [status, token]);

  async function placeCall() {
    if (callState === "on_call" || callState === "connecting") {
      callRef.current?.disconnect();
      return;
    }
    const to = dialInput.trim();
    if (!to || !deviceRef.current) return;
    setCallState("connecting");
    try {
      const call = await deviceRef.current.connect({ params: { To: to, From: from || "" } });
      callRef.current = call;
      call.on("accept", () => setCallState("on_call"));
      call.on("disconnect", () => {
        setCallState("idle");
        callRef.current = null;
        setTimeout(load, 1500);
      });
      call.on("error", () => setCallState("idle"));
    } catch {
      setCallState("idle");
    }
  }

  function press(key: string) {
    if (callState === "on_call") callRef.current?.sendDigits(key);
    else setDialInput((v) => v + key);
  }

  const shown = calls.filter((c) => filter === "all" || (filter === "inbound" ? isInbound(c.direction) : !isInbound(c.direction)));
  const canDial = status === "ready";

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* Dialpad */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Phone className="h-4 w-4 text-brand-strong" /> Dialpad</div>
        <div className="relative">
          <Input value={dialInput} onChange={(e) => setDialInput(e.target.value)} placeholder="Enter phone number" className="pr-9 text-center" />
          {dialInput && (
            <button onClick={() => setDialInput((v) => v.slice(0, -1))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Delete className="h-4 w-4" /></button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]].map(([d, sub]) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="flex h-14 flex-col items-center justify-center rounded-lg border border-border bg-background transition-colors hover:border-brand/50 hover:bg-accent/40"
            >
              <span className="text-lg font-semibold text-foreground">{d}</span>
              {sub ? <span className="text-[9px] tracking-widest text-muted-foreground">{sub}</span> : null}
            </button>
          ))}
        </div>
        <Button
          onClick={placeCall}
          disabled={!canDial || (!dialInput.trim() && callState === "idle")}
          className={cn("mt-3 w-full", callState !== "idle" ? "bg-destructive hover:bg-destructive/90" : "bg-success text-success-foreground hover:bg-success/90")}
        >
          <Phone className="h-4 w-4" /> {callState === "connecting" ? "Connecting…" : callState === "on_call" ? "End call" : "Call"}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {status === "ready" ? (
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Ready to call</span>
          ) : status === "dialpad_off" ? (
            "Add TWILIO_TWIML_APP_SID to enable in-browser calls"
          ) : status === "not_configured" ? (
            "Twilio not configured"
          ) : (
            "Connecting…"
          )}
        </p>
      </div>

      {/* History */}
      <div className="space-y-3">
        {numbers.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dial out from</p>
            <div className="flex flex-wrap gap-2">
              {numbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setFrom(n)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    from === n ? "border-brand-strong text-brand-strong" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Phone className="h-3.5 w-3.5" /> {fmtPhone(n)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            <SegBtn active={mode === "history"} onClick={() => setMode("history")} icon={PhoneCall}>Call History</SegBtn>
            <SegBtn active={mode === "voicemail"} onClick={() => setMode("voicemail")} icon={Voicemail}>Voicemail</SegBtn>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{shown.length} calls</span>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh</Button>
          </div>
        </div>

        <div className="flex gap-1">
          {(["all", "inbound", "outbound"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-brand/15 text-brand-strong" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "inbound" ? <PhoneIncoming className="h-3 w-3" /> : f === "outbound" ? <PhoneOutgoing className="h-3 w-3" /> : null}
              {f}
            </button>
          ))}
        </div>

        {status === "not_configured" ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Twilio isn&apos;t configured. Add your Twilio env vars (reuse the CTRL+P account) and refresh.
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">{loading ? "Loading calls…" : "No calls to show."}</div>
        ) : (
          <div className="space-y-2">
            {shown.map((c) => (
              <CallRow key={c.sid} call={c} expanded={expanded === c.sid} onToggle={() => setExpanded(expanded === c.sid ? null : c.sid)} onCallBack={(n) => setDialInput(n)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SegBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Phone; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}>
      <Icon className={cn("h-3.5 w-3.5", active && "text-brand-strong")} /> {children}
    </button>
  );
}

function CallRow({ call, expanded, onToggle, onCallBack }: { call: CallRecord; expanded: boolean; onToggle: () => void; onCallBack: (n: string) => void }) {
  const inbound = isInbound(call.direction);
  const number = inbound ? call.from : call.to;
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!expanded || loaded) return;
    (async () => {
      const [r, n] = await Promise.all([
        fetch(`/api/comm/recordings?callSid=${call.sid}`).then((x) => x.json()).catch(() => ({})),
        fetch(`/api/comm/calls/notes?callSid=${call.sid}`).then((x) => x.json()).catch(() => ({})),
      ]);
      setRecordings(r.recordings || []);
      setNotes(n.notes || []);
      setLoaded(true);
    })();
  }, [expanded, loaded, call.sid]);

  async function saveNote() {
    const note = noteDraft.trim();
    if (!note) return;
    const res = await fetch("/api/comm/calls/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callSid: call.sid, note }) });
    const data = await res.json();
    if (res.ok && data.note) {
      setNotes((p) => [...p, data.note]);
      setNoteDraft("");
    }
  }
  async function transcribe(recordingSid: string) {
    setTranscribing(true);
    try {
      const res = await fetch("/api/comm/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordingSid }) });
      const data = await res.json();
      setTranscript(res.ok ? data.transcript : data.error || "Transcription failed.");
    } finally {
      setTranscribing(false);
    }
  }

  const recorded = recordings.length > 0;
  const cost = estCost(call);

  return (
    <div className="rounded-xl border border-border bg-card">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-3.5 text-left">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", inbound ? "bg-brand/10 text-brand-strong" : "bg-muted text-muted-foreground")}>
          {inbound ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{fmtPhone(number)}</span>
            <StatusBadge status={call.status} />
            {(recorded || loaded === false) && call.status === "completed" ? <RecordedBadge /> : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">⏱ {fmtDur(call.duration)}</p>
        </div>
        <span className="text-xs text-muted-foreground">{fmtDay(call.dateCreated)}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Direction">{inbound ? "Inbound" : "Outbound"}</Field>
            <Field label="Duration">{fmtDur(call.duration)}</Field>
            <Field label="Date & Time">{fmtDateTime(call.dateCreated)}</Field>
            <Field label="Est. Cost">{cost || "—"}</Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onCallBack(number || "")}><Phone className="h-4 w-4" /> Call back</Button>
            <Button variant="outline" size="sm" asChild><a href={`#sms:${number}`}><MessageSquare className="h-4 w-4" /> SMS</a></Button>
          </div>

          {recordings.map((rec) => (
            <div key={rec.sid} className="space-y-2">
              <div className="flex items-center gap-2">
                {/* Native player gives volume, playback speed, and download via its menu */}
                <audio controls preload="none" className="h-9 w-full max-w-xl" src={rec.audioUrl} />
                <a href={rec.audioUrl} download={`call-${call.sid}.mp3`} className="shrink-0 rounded-md border border-border p-2 text-muted-foreground hover:text-foreground" title="Download"><Download className="h-4 w-4" /></a>
              </div>
              <Button variant="outline" size="sm" onClick={() => transcribe(rec.sid)} disabled={transcribing}>
                <Sparkles className="h-4 w-4 text-brand-strong" /> {transcribing ? "Transcribing…" : "Transcribe with AI"}
              </Button>
            </div>
          ))}
          {loaded && recordings.length === 0 && <p className="text-xs text-muted-foreground">No recording for this call.</p>}
          {transcript && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Transcript</p>
              <p className="text-sm text-foreground">{transcript}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" /> Call notes</p>
            {notes.map((n) => (
              <div key={n.id} className="rounded-md border border-border bg-background p-2 text-sm text-foreground">{n.note}<span className="ml-2 text-[11px] text-muted-foreground">{fmtDateTime(n.created_at)}</span></div>
            ))}
            <div className="flex items-end gap-2">
              <Textarea rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add a note… (⌘↵ to save)" onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && saveNote()} className="flex-1" />
              <Button size="sm" onClick={saveNote} disabled={!noteDraft.trim()}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{children}</p>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const tone = status === "completed" ? "bg-success/15 text-success" : status === "no-answer" || status === "busy" || status === "failed" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";
  return <Badge className={cn("border-transparent capitalize", tone)}>{status.replace("-", " ")}</Badge>;
}
function RecordedBadge() {
  return <Badge className="border-transparent bg-[hsl(275_60%_50%/0.15)] text-[hsl(275_60%_60%)]">▷ Recorded</Badge>;
}

/* ── SMS tab ─────────────────────────────────────────────────────────── */

function SmsTab({ smsNumbers, defaultFrom }: { smsNumbers: string[]; defaultFrom: string | null }) {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState<string | null>(smsNumbers[0] || defaultFrom);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [log, setLog] = useState<Sms[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/comm/sms");
    if (res.ok) {
      const d = await res.json();
      setLog(d.messages || []);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!to.trim() || !body.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/comm/sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, from, body }) });
      const d = await res.json();
      if (res.ok) {
        setMsg("Sent.");
        setBody("");
        load();
      } else setMsg(d.error || "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">New message</p>
        {smsNumbers.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {smsNumbers.map((n) => (
              <button key={n} onClick={() => setFrom(n)} className={cn("rounded-lg border px-2.5 py-1 text-xs", from === n ? "border-brand-strong text-brand-strong" : "border-border text-muted-foreground")}>{fmtPhone(n)}</button>
            ))}
          </div>
        )}
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To (+1 555 000 0000)" />
        <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message…" />
        <div className="flex items-center gap-2">
          <Button onClick={send} disabled={sending || !to.trim() || !body.trim()}><Send className="h-4 w-4" /> {sending ? "Sending…" : "Send SMS"}</Button>
          {msg && <span className="text-sm text-brand-strong">{msg}</span>}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent messages</p>
        {log.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No messages yet.</div>
        ) : (
          log.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{m.direction === "inbound" ? `From ${fmtPhone(m.from_number)}` : `To ${fmtPhone(m.to_number)}`}</span>
                <span>{fmtDateTime(m.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-foreground">{m.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── AI Voice tab (OpenAI TTS) ───────────────────────────────────────── */

function AiVoiceTab() {
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    if (!script.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/ai-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, voice, provider: "openai" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.audio?.id) setSrc(`/api/audio/${data.audio.id}/file`);
      else setErr(data.hint || data.error || "Generation unavailable. Add OPENAI_API_KEY.");
    } catch {
      setErr("Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-3 rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Mic className="h-4 w-4 text-brand-strong" /> AI Voice</p>
      <p className="text-xs text-muted-foreground">Generate a voiceover with OpenAI TTS — for greetings, IVR prompts, or SMS-to-voice.</p>
      <div className="flex flex-wrap gap-2">
        {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map((v) => (
          <button key={v} onClick={() => setVoice(v)} className={cn("rounded-lg border px-2.5 py-1 text-xs capitalize", voice === v ? "border-brand-strong text-brand-strong" : "border-border text-muted-foreground")}>{v}</button>
        ))}
      </div>
      <Textarea rows={4} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Type the script the AI voice should read…" />
      <div className="flex items-center gap-2">
        <Button onClick={generate} disabled={busy || !script.trim()}><Sparkles className="h-4 w-4" /> {busy ? "Generating…" : "Generate voice"}</Button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>
      {src && <audio controls className="w-full" src={src} />}
    </div>
  );
}

/* ── Placeholder tabs ────────────────────────────────────────────────── */

function Placeholder({ icon: Icon, title, note }: { icon: typeof Phone; title: string; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-5 w-5" /></span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
