"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Call, Device as TwilioDevice } from "@twilio/voice-sdk";
import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Contact as ContactIcon,
  Copy,
  Delete,
  Disc,
  Download,
  Inbox,
  LayoutGrid,
  Link2,
  List,
  Mail,
  MapPin,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
  Loader2,
  Search,
  Send,
  Share2,
  Sparkles,
  SquareKanban,
  Table as TableIcon,
  Trash2,
  TrendingUp,
  UserPlus,
  Voicemail,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { RecordCalendar } from "@/components/crm/crm-ui";
import { CONTACT_TYPE, CONTACT_TYPE_ORDER, Contact, ContactType, contactName, seedContacts } from "@/lib/crm/contacts";
import { Deal, seedDeals } from "@/lib/crm/deals";
import { genId, useCollection } from "@/lib/crm/store";
import { buildOpportunity, openOpportunityFor, roleForPipeline } from "@/lib/crm/to-pipeline";
import { EmailStudio } from "@/components/comm/email-studio";
import { cn } from "@/lib/utils";

const SubmissionsMap = dynamic(() => import("@/components/crm/records-map"), { ssr: false });

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
type CallLink = { id: string; contact_id: string | null; contact_name: string | null; role: string | null; created_at: string };
type CrmContact = { id: string; name: string; role?: string; company?: string; title?: string };

const CALL_ROLES = ["Decision maker", "Champion", "Influencer", "Technical", "Billing", "Owner", "Manager", "Support", "Advertiser", "Client"];
type Sms = { id: string; direction: string; from_number: string | null; to_number: string | null; body: string; status: string | null; created_at: string };

type Tab = "calls" | "sms" | "contacts" | "ai_voice" | "email" | "notifications" | "social" | "forms";
const TABS: { id: Tab; label: string; icon: typeof Phone }[] = [
  { id: "calls", label: "Calls", icon: Phone },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "contacts", label: "Contacts", icon: ContactIcon },
  { id: "ai_voice", label: "AI Voice", icon: Mic },
  { id: "email", label: "Email", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "social", label: "Social Media", icon: Share2 },
  { id: "forms", label: "Form Submissions", icon: Inbox },
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
      {tab === "email" && <EmailStudio />}
      {tab === "notifications" && <Placeholder icon={Bell} title="Notifications (DM)" note="Web-push notifications via VAPID (keys generated). Direct-message center lands here." />}
      {tab === "social" && <Placeholder icon={Share2} title="Social Media" note="Unified social inbox. Reference coming from you." />}
      {tab === "forms" && <FormSubmissionsTab />}
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
  const [record, setRecord] = useState(true);

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
      const call = await deviceRef.current.connect({ params: { To: to, From: from || "", Record: record ? "true" : "false" } });
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
    <div className="grid gap-4 lg:grid-cols-[500px_1fr] lg:items-start">
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
        {numbers.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dial out from</p>
            <Select value={from ?? undefined} onValueChange={setFrom}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a number" /></SelectTrigger>
              <SelectContent>{numbers.map((n) => <SelectItem key={n} value={n}>{fmtPhone(n)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <button
          onClick={() => setRecord((v) => !v)}
          disabled={callState !== "idle"}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:border-brand/50 disabled:opacity-60"
        >
          <span className="flex items-center gap-2"><Disc className={cn("h-4 w-4", record ? "text-destructive" : "text-muted-foreground")} /> Record call</span>
          <span className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", record ? "bg-brand" : "bg-muted")}>
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform", record ? "translate-x-4" : "translate-x-0.5")} />
          </span>
        </button>
        <Button
          onClick={placeCall}
          disabled={!canDial || (!dialInput.trim() && callState === "idle")}
          className={cn("mt-2 w-full", callState !== "idle" ? "bg-destructive hover:bg-destructive/90" : "bg-success text-success-foreground hover:bg-success/90")}
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
  const [links, setLinks] = useState<CallLink[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    if (!expanded || loaded) return;
    (async () => {
      const [r, n, t, l] = await Promise.all([
        fetch(`/api/comm/recordings?callSid=${call.sid}`).then((x) => x.json()).catch(() => ({})),
        fetch(`/api/comm/calls/notes?callSid=${call.sid}`).then((x) => x.json()).catch(() => ({})),
        fetch(`/api/comm/transcribe?callSid=${call.sid}`).then((x) => x.json()).catch(() => ({})),
        fetch(`/api/comm/calls/link?callSid=${call.sid}`).then((x) => x.json()).catch(() => ({})),
      ]);
      setRecordings(r.recordings || []);
      setNotes(n.notes || []);
      if (t.transcript) setTranscript(t.transcript);
      setLinks(l.links || []);
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
      const res = await fetch("/api/comm/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordingSid, callSid: call.sid }) });
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
            <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}><Link2 className="h-4 w-4" /> Link to contact / role</Button>
          </div>

          {links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs text-brand-strong">
                  <Link2 className="h-3 w-3" />
                  {l.contact_name || "Contact"}{l.role ? ` · ${l.role}` : ""}
                  <button onClick={() => fetch(`/api/comm/calls/link?id=${l.id}`, { method: "DELETE" }).then(() => setLinks((p) => p.filter((x) => x.id !== l.id)))} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}

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
      <LinkCallDialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        call={call}
        number={number}
        hasRecording={recordings.length > 0}
        hasTranscript={Boolean(transcript)}
        onLinked={(link) => setLinks((p) => [...p, link])}
      />
    </div>
  );
}

function LinkCallDialog({
  open,
  onClose,
  call,
  number,
  hasRecording,
  hasTranscript,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  call: CallRecord;
  number: string | null;
  hasRecording: boolean;
  hasTranscript: boolean;
  onLinked: (link: CallLink) => void;
}) {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [query, setQuery] = useState("");
  const [contact, setContact] = useState<CrmContact | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || contacts.length) return;
    fetch("/api/crm/contacts").then((r) => r.json()).then((d) => setContacts(Array.isArray(d) ? d : [])).catch(() => {});
  }, [open, contacts.length]);

  const filtered = contacts
    .filter((c) => `${c.name} ${c.company ?? ""} ${c.title ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);

  async function save() {
    if (!contact && !role) return;
    setSaving(true);
    try {
      const res = await fetch("/api/comm/calls/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callSid: call.sid,
          contactId: contact?.id ?? null,
          contactName: contact?.name ?? null,
          role,
          details: {
            number,
            direction: isInbound(call.direction) ? "inbound" : "outbound",
            duration: call.duration,
            dateTime: call.dateCreated,
            status: call.status,
            estCost: estCost(call),
            hasRecording,
            hasTranscript,
          },
        }),
      });
      const d = await res.json();
      if (res.ok && d.link) {
        onLinked(d.link);
        setContact(null);
        setRole(null);
        setQuery("");
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link call to contact / role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Connect this call — details, date &amp; time, recording, and transcript — to a contact, a role, or both.
          </p>

          {/* Contact picker */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Contact</p>
            {contact ? (
              <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-brand/10 px-3 py-2">
                <span className="text-sm text-foreground">{contact.name}{contact.company ? ` · ${contact.company}` : ""}</span>
                <button onClick={() => setContact(null)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts…" className="pl-8" />
                </div>
                {query.trim() && (
                  <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-border">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No contacts found.</p>
                    ) : (
                      filtered.map((c) => (
                        <button key={c.id} onClick={() => setContact(c)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent">
                          <span className="text-foreground">{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.company || c.title || ""}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Role picker */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Role <span className="font-normal text-muted-foreground">(optional)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {CALL_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(role === r ? null : r)}
                  className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors", role === r ? "border-brand-strong bg-brand/10 text-brand-strong" : "border-border text-muted-foreground hover:text-foreground")}
                >
                  {role === r ? <Check className="h-3 w-3" /> : null} {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || (!contact && !role)}>{saving ? "Linking…" : "Link call"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

type AiVoiceCfg = { id: string; outboundEnabled?: boolean; inboundEnabled?: boolean; fromNumber?: string; goal?: string };
type QueueItem = { id: string; name: string; phone: string; status: string };
const TARGET_TYPES: [string, string][] = [["contact", "Contacts"], ["lead", "Leads"], ["prospect", "Prospects"], ["client", "Clients"]];

function AiVoiceTab() {
  const contactsCol = useCollection<Contact>("contacts", seedContacts);
  const settingsCol = useCollection<AiVoiceCfg>("settings", []);
  const cfg = settingsCol.items.find((s) => s.id === "ai_voice_config");
  const outbound = cfg?.outboundEnabled ?? false;
  const inbound = cfg?.inboundEnabled ?? false;

  function save(patch: Partial<AiVoiceCfg>) {
    const next: AiVoiceCfg = { id: "ai_voice_config", outboundEnabled: outbound, inboundEnabled: inbound, fromNumber: cfg?.fromNumber ?? "", goal: cfg?.goal ?? "", ...patch };
    if (cfg) settingsCol.update("ai_voice_config", next); else settingsCol.create(next);
  }

  const [types, setTypes] = useState<string[]>(["lead", "prospect"]);
  const [tag, setTag] = useState("");
  const targets = contactsCol.items.filter((c) => types.includes(c.type) && c.phone && c.status !== "archived" && (!tag || (c.tags ?? []).some((t) => t.toLowerCase().includes(tag.toLowerCase()))));

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);

  async function startCalls() {
    if (!outbound || !targets.length) return;
    const q: QueueItem[] = targets.map((c) => ({ id: c.id, name: contactName(c), phone: c.phone as string, status: "queued" }));
    setQueue(q); setRunning(true);
    for (const item of q) {
      setQueue((p) => p.map((x) => (x.id === item.id ? { ...x, status: "calling" } : x)));
      try {
        const r = await fetch("/api/comm/ai-voice/call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: item.phone, name: item.name }) });
        const d = await r.json().catch(() => ({}));
        setQueue((p) => p.map((x) => (x.id === item.id ? { ...x, status: r.ok ? "dialed" : (d.error || "failed") } : x)));
      } catch { setQueue((p) => p.map((x) => (x.id === item.id ? { ...x, status: "failed" } : x))); }
      await new Promise((res) => setTimeout(res, 1500)); // pace outbound calls
    }
    setRunning(false);
  }

  return (
    <div className="space-y-4">
      {/* Agent header + toggles */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand-strong"><Sparkles className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold text-foreground">Nicole — AI Voice Agent</p>
              <p className="text-xs text-muted-foreground">Your xAI agent runs calls to your contacts, leads, and prospects.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={outbound} onCheckedChange={(v) => save({ outboundEnabled: v })} /> Outbound calling</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={inbound} onCheckedChange={(v) => save({ inboundEnabled: v })} /> Inbound answering</label>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Caller ID (Nicole&apos;s number)</p><Input value={cfg?.fromNumber ?? ""} onChange={(e) => save({ fromNumber: e.target.value })} placeholder="+1 480 999 9926" /></div>
          <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Call goal / script</p><Input value={cfg?.goal ?? ""} onChange={(e) => save({ goal: e.target.value })} placeholder="Qualify interest & book a call" /></div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Inbound answering routes calls to Nicole&apos;s number to the xAI agent (via your Twilio SIP). Outbound places a call from that number and bridges the person to Nicole.</p>
      </div>

      {/* Target list */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Target list</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {TARGET_TYPES.map(([key, label]) => (
            <button key={key} onClick={() => setTypes((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]))}
              className={cn("rounded-lg border px-3 py-1.5 text-sm transition-colors", types.includes(key) ? "border-brand-strong bg-brand/10 text-brand-strong" : "border-border text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
          <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Filter by tag…" className="h-9 w-44" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{targets.length}</span> contacts with a phone number selected</p>
          <Button onClick={startCalls} disabled={!outbound || running || !targets.length}><Phone className="h-4 w-4" /> {running ? "Calling…" : `Start calling (${targets.length})`}</Button>
        </div>
        {!outbound && <p className="mt-2 text-xs text-warning">Turn on outbound calling above to launch a campaign.</p>}
      </div>

      {/* Call queue */}
      {queue.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Call queue</p>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {queue.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="min-w-0"><span className="font-medium text-foreground">{q.name}</span> <span className="text-muted-foreground">{fmtPhone(q.phone)}</span></span>
                <span className={cn("shrink-0 text-xs font-medium", q.status === "dialed" ? "text-success" : q.status === "calling" ? "text-brand-strong" : q.status === "queued" ? "text-muted-foreground" : "text-destructive")}>{q.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TtsUtility />
    </div>
  );
}

function TtsUtility() {
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    if (!script.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/admin/ai-voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script, voice, provider: "openai" }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.audio?.id) setSrc(`/api/audio/${data.audio.id}/file`);
      else setErr(data.hint || data.error || "Generation unavailable. Add OPENAI_API_KEY.");
    } catch { setErr("Generation failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl space-y-3 rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Mic className="h-4 w-4 text-brand-strong" /> Generate a voice clip</p>
      <p className="text-xs text-muted-foreground">OpenAI TTS — for greetings, voicemail drops, or IVR prompts.</p>
      <div className="flex flex-wrap gap-2">
        {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map((v) => (
          <button key={v} onClick={() => setVoice(v)} className={cn("rounded-lg border px-2.5 py-1 text-xs capitalize", voice === v ? "border-brand-strong text-brand-strong" : "border-border text-muted-foreground")}>{v}</button>
        ))}
      </div>
      <Textarea rows={3} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Type the script the AI voice should read…" />
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

/* ── Form Submissions tab ────────────────────────────────────────────── */

type Submission = {
  id: string;
  kind?: string;
  name?: string;
  email?: string;
  company?: string;
  website?: string;
  phone?: string;
  interest?: string;
  subject?: string;
  message?: string;
  status?: string;
  createdAt?: string;
};

type SubView = "list" | "table" | "cards" | "kanban" | "calendar" | "map";
/** Where a submission can be filed from the detail modal and the row menu. */
type SaveTarget = ContactType | "pipeline";
const SAVE_TARGETS: { id: SaveTarget; label: string; icon: typeof UserPlus }[] = [
  { id: "contact", label: "Contact", icon: UserPlus },
  { id: "lead", label: "Lead", icon: UserPlus },
  { id: "prospect", label: "Prospect", icon: UserPlus },
  { id: "pipeline", label: "Add to Pipeline", icon: TrendingUp },
];
const SUB_VIEWS: { id: SubView; label: string; icon: typeof List }[] = [
  { id: "list", label: "List", icon: List },
  { id: "table", label: "Table", icon: TableIcon },
  { id: "cards", label: "Cards", icon: LayoutGrid },
  { id: "kanban", label: "Kanban", icon: SquareKanban },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "map", label: "Map", icon: MapPin },
];
const SUB_STATUS = (s: Submission) => (s.status === "archived" ? "archived" : s.status === "read" ? "read" : "new");
const subDate = (s: Submission) => (s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "");

/**
 * The submission written out as notes. What the person actually typed is kept
 * verbatim under its own "Customer request" heading — it's the part a rep reads
 * first — with the form metadata above it rather than mashed onto one line.
 */
function submissionNotes(s: Submission): string {
  const meta = [
    s.subject && `Subject: ${s.subject}`,
    s.interest && `Interested in: ${s.interest}`,
    s.createdAt && `Received: ${new Date(s.createdAt).toLocaleString()}`,
  ].filter(Boolean).join("\n");
  const request = s.message?.trim() ? `Customer request\n${s.message.trim()}` : "";
  return [meta, request].filter(Boolean).join("\n\n");
}

/** Everything the form captured, kept as fields so nothing is lost to prose. */
function submissionDetails(s: Submission): Record<string, string> {
  const d: Record<string, string> = {};
  if (s.kind) d["Form"] = s.kind;
  if (s.subject) d["Subject"] = s.subject;
  if (s.interest) d["Interested in"] = s.interest;
  if (s.website) d["Website"] = s.website;
  if (s.createdAt) d["Received"] = new Date(s.createdAt).toLocaleString();
  d["Submission ID"] = s.id;
  return d;
}

/**
 * A dollar amount the submission quoted, for the opportunity's value. Booking
 * forms spell out a total; anything else falls back to the first figure in the
 * subject line. Zero when there's no number to find — never a guess.
 */
function submissionValue(s: Submission): number {
  const text = `${s.message || ""}\n${s.subject || ""}`;
  const total = text.match(/total[^$\d]*\$\s*([\d,]+(?:\.\d{2})?)/i);
  const any = (s.subject || "").match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  const raw = total?.[1] ?? any?.[1];
  return raw ? Number(raw.replace(/,/g, "")) || 0 : 0;
}

function submissionToContact(s: Submission, type: ContactType): Contact {
  const parts = (s.name || "").trim().split(/\s+/);
  return {
    id: genId("ct"), name: s.name || s.email || "New lead", firstName: parts[0] || "", lastName: parts.slice(1).join(" "),
    title: "", company: s.company || "", type, status: "active", email: s.email || "", phone: s.phone || "",
    website: s.website || "", city: "", state: "", source: "Website form", owner: "Jeremy Waters", tags: [],
    notes: submissionNotes(s),
    lastContact: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString(),
    details: submissionDetails(s),
  };
}

/** The same person, already on file. Email is the identity; phone is the fallback. */
function matchExisting(s: Submission, contacts: Contact[]): Contact | null {
  const email = s.email?.trim().toLowerCase();
  const phone = s.phone?.replace(/\D/g, "");
  return (
    contacts.find((c) => email && c.email?.trim().toLowerCase() === email) ??
    (phone && phone.length >= 10 ? contacts.find((c) => c.phone?.replace(/\D/g, "") === phone) ?? null : null)
  );
}

/**
 * Merge a new submission into the record already on file. A role only ever moves
 * forward — saving a booking as a Lead must not demote someone who is already a
 * Client — and the request is appended rather than overwriting earlier history.
 */
function mergeSubmission(existing: Contact, s: Submission, type: ContactType): Partial<Contact> {
  const rank = (t: ContactType) => CONTACT_TYPE_ORDER.indexOf(t);
  const notes = submissionNotes(s);
  return {
    type: rank(type) > rank(existing.type) ? type : existing.type,
    company: existing.company || s.company || "",
    email: existing.email || s.email || "",
    phone: existing.phone || s.phone || "",
    website: existing.website || s.website || "",
    notes: existing.notes?.includes(notes) ? existing.notes : [existing.notes, notes].filter(Boolean).join("\n\n———\n\n"),
    details: { ...(existing.details || {}), ...submissionDetails(s) },
    lastContact: new Date().toISOString().slice(0, 10),
  };
}

function FormSubmissionsTab() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"new" | "all" | "archived">("new");
  const [view, setView] = useState<SubView>("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [busy, setBusy] = useState<SaveTarget | null>(null);
  const contactsCol = useCollection<Contact>("contacts", seedContacts);
  const dealsCol = useCollection<Deal>("deals", seedDeals);

  function flash(text: string, tone: "ok" | "error" = "ok") {
    setToast({ text, tone });
    setTimeout(() => setToast(null), tone === "error" ? 6000 : 3500);
  }

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/comm/form-submissions")
      .then((r) => r.json())
      .then((d) => setItems(d.submissions || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  async function setStatus(id: string, status: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    await fetch("/api/comm/form-submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }).catch(() => {});
  }
  async function remove(id: string) {
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (openId === id) setOpenId(null);
    await fetch(`/api/comm/form-submissions?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    flash("Deleted.");
  }
  /**
   * File a submission as a Contact / Lead / Prospect.
   *
   * Saving the same person twice used to mint a second record every click, which
   * is exactly what happens when the button gives no feedback and you press it
   * again. A match on email (or phone) is merged instead, and the role only ever
   * moves forward.
   */
  async function saveContact(s: Submission, type: ContactType): Promise<Contact | null> {
    const existing = matchExisting(s, contactsCol.items);
    if (existing) {
      const patch = mergeSubmission(existing, s, type);
      const ok = await contactsCol.update(existing.id, patch);
      if (!ok) return null;
      return { ...existing, ...patch } as Contact;
    }
    const contact = submissionToContact(s, type);
    return (await contactsCol.create(contact)) ? contact : null;
  }

  /** Run one save, keeping the button busy until the server has actually taken it. */
  async function runSave(s: Submission, target: SaveTarget) {
    if (busy) return;
    setBusy(target);
    try {
      if (target === "pipeline") {
        // The person record comes first: an opportunity links to a contact
        // rather than copying one, and someone being worked is a prospect.
        const existing = matchExisting(s, contactsCol.items);
        const contact = await saveContact(s, existing ? roleForPipeline(existing) as ContactType : "prospect");
        if (!contact) { flash("Couldn't save — the record wasn't stored. Try again.", "error"); return; }

        // A contact already being worked doesn't sprout a second opportunity.
        const already = openOpportunityFor(contact.id, dealsCol.items);
        if (already) {
          setOpenId(null);
          flash(`${contactName(contact)} is already in the pipeline.`);
          return;
        }

        const deal = {
          ...buildOpportunity(contact, { id: genId("dl"), owner: contact.owner || "Jeremy Waters" }),
          // buildOpportunity has no lead to read a figure or origin from, so the
          // submission supplies both. Its notes already carry the request.
          value: submissionValue(s),
          source: "Website form",
        };
        if (!(await dealsCol.create(deal))) { flash("Couldn't add to the pipeline. Try again.", "error"); return; }

        if (SUB_STATUS(s) === "new") setStatus(s.id, "read");
        setOpenId(null);
        flash(`${contactName(contact)} added to the pipeline.`);
        return;
      }

      const before = matchExisting(s, contactsCol.items);
      const contact = await saveContact(s, target);
      if (!contact) { flash("Couldn't save — the record wasn't stored. Try again.", "error"); return; }
      if (SUB_STATUS(s) === "new") setStatus(s.id, "read");
      setOpenId(null);
      flash(`${before ? "Updated" : "Saved"} ${contactName(contact)} in ${CONTACT_TYPE[contact.type].plural}.`);
    } finally {
      setBusy(null);
    }
  }

  async function share(s: Submission) {
    const text = `${s.name || "Submission"} · ${s.email || ""}${s.phone ? ` · ${s.phone}` : ""}${s.company ? ` · ${s.company}` : ""}${s.message ? `\n${s.message}` : ""}`;
    try { if (navigator.share) await navigator.share({ title: "Form submission", text }); else { await navigator.clipboard.writeText(text); flash("Copied to clipboard."); } }
    catch { /* cancelled */ }
  }

  const shown = useMemo(() => items.filter((s) => (filter === "all" ? true : filter === "archived" ? SUB_STATUS(s) === "archived" : SUB_STATUS(s) === "new")), [items, filter]);
  const newCount = items.filter((s) => SUB_STATUS(s) === "new").length;
  const open = items.find((s) => s.id === openId) || null;

  const actions = (s: Submission) => ({ onOpen: () => setOpenId(s.id), onArchive: () => setStatus(s.id, SUB_STATUS(s) === "archived" ? "read" : "archived"), onDelete: () => remove(s.id), onShare: () => share(s), onSave: (t: SaveTarget) => { void runSave(s, t); }, archived: SUB_STATUS(s) === "archived" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {([["new", `New${newCount ? ` (${newCount})` : ""}`], ["all", "All"], ["archived", "Archived"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", filter === id ? "bg-accent text-brand-strong" : "text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
            {SUB_VIEWS.map((v) => (
              <button key={v.id} onClick={() => setView(v.id)} title={v.label} className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors", view === v.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}>
                <v.icon className={cn("h-4 w-4", view === v.id && "text-brand-strong")} /><span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh</Button>
        </div>
      </div>

      {loading && !items.length ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading submissions…</div>
      ) : !shown.length ? (
        <Placeholder icon={Inbox} title="No submissions here" note={filter === "new" ? "New contact and demo requests from the website land here." : "Nothing in this view yet."} />
      ) : view === "table" ? (
        <SubTable subs={shown} act={actions} />
      ) : view === "cards" ? (
        <SubCards subs={shown} act={actions} />
      ) : view === "kanban" ? (
        <SubKanban subs={shown} act={actions} />
      ) : view === "calendar" ? (
        <RecordCalendar items={shown} getId={(s) => s.id} getDate={(s) => s.createdAt || ""} getTitle={(s) => s.name || s.email || "Submission"} onOpen={(id) => setOpenId(id)} footer="Submissions by date received. Click one to open." />
      ) : view === "map" ? (
        <SubMap subs={shown} onOpen={(id) => setOpenId(id)} />
      ) : (
        <SubList subs={shown} act={actions} />
      )}

      {/* Detail modal */}
      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && !busy && setOpenId(null)}>
        <DialogContent className="max-h-[88vh] gap-5 overflow-y-auto sm:max-w-[40rem]">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">{open.name || "Submission"}<Badge variant="outline" className="capitalize">{open.kind || "contact"}</Badge></DialogTitle>
              </DialogHeader>
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                <SubField label="Email" value={open.email} />
                <SubField label="Phone" value={open.phone} />
                <SubField label="Business" value={open.company} />
                <SubField label="Website" value={open.website} />
                <SubField label="Subject" value={open.subject} />
                <SubField label="Interested in" value={open.interest} />
                <SubField label="Received" value={open.createdAt ? new Date(open.createdAt).toLocaleString() : undefined} />
              </div>
              {open.message && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer request</p>
                  <p className="mt-1.5 min-h-[7rem] whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-sm leading-relaxed text-foreground">{open.message}</p>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Save to</p>
                <div className="flex flex-wrap gap-2">
                  {SAVE_TARGETS.map(({ id, label, icon: Icon }) => (
                    <Button key={id} size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => runSave(open, id)}>
                      {busy === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                      {busy === id ? "Saving…" : label}
                    </Button>
                  ))}
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2 sm:justify-start">
                {open.email && <Button asChild size="sm"><a href={`mailto:${open.email}`}><Mail className="h-4 w-4" /> Reply</a></Button>}
                <Button size="sm" variant="outline" onClick={() => share(open)}><Share2 className="h-4 w-4" /> Share</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(open.id, SUB_STATUS(open) === "archived" ? "read" : "archived")}><Archive className="h-4 w-4" /> {SUB_STATUS(open) === "archived" ? "Restore" : "Archive"}</Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(open.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation lives above the dialog layer, so it is still readable if
          the modal is open and unmissable once it closes. */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg",
            toast.tone === "error" ? "border-destructive/40 bg-destructive text-destructive-foreground" : "border-border bg-card text-foreground",
          )}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

type SubAct = { onOpen: () => void; onArchive: () => void; onDelete: () => void; onShare: () => void; onSave: (t: SaveTarget) => void; archived: boolean };
type SubViewProps = { subs: Submission[]; act: (s: Submission) => SubAct };

function SaveMenu({ onSave }: { onSave: (t: SaveTarget) => void }) {
  return (
    <Select value="" onValueChange={(v) => onSave(v as SaveTarget)}>
      <SelectTrigger className="h-8 w-[110px] text-xs"><span className="flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> Save to</span></SelectTrigger>
      <SelectContent>
        {SAVE_TARGETS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function RowBtns({ a }: { a: SubAct }) {
  return (
    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <SaveMenu onSave={a.onSave} />
      <button onClick={a.onShare} title="Share" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><Share2 className="h-4 w-4" /></button>
      <button onClick={a.onArchive} title={a.archived ? "Restore" : "Archive"} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><Archive className="h-4 w-4" /></button>
      <button onClick={a.onDelete} title="Delete" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

function SubList({ subs, act }: SubViewProps) {
  return (
    <div className="space-y-2">
      {subs.map((s) => {
        const a = act(s); const unread = SUB_STATUS(s) === "new";
        return (
          <div key={s.id} className={cn("flex items-center gap-3 rounded-xl border bg-card px-4 py-3", unread ? "border-brand-strong/40" : "border-border")}>
            <button onClick={a.onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", unread ? "bg-brand/15 text-brand-strong" : "bg-accent text-muted-foreground")}>{(s.name || "?").trim().charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-foreground">{s.name || "Unknown"}</p>{unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-strong" />}</div>
                <p className="truncate text-xs text-muted-foreground">{s.email}{s.subject ? ` · ${s.subject}` : s.interest ? ` · ${s.interest}` : ""}{s.message ? ` — ${s.message}` : ""}</p>
              </div>
              <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">{subDate(s)}</span>
            </button>
            <RowBtns a={a} />
          </div>
        );
      })}
    </div>
  );
}

function SubTable({ subs, act }: SubViewProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Kind</TableHead><TableHead>Received</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {subs.map((s) => { const a = act(s); return (
            <TableRow key={s.id} className="cursor-pointer" onClick={a.onOpen}>
              <TableCell className="font-medium">{s.name || "Unknown"}</TableCell>
              <TableCell className="text-muted-foreground">{s.email}</TableCell>
              <TableCell className="capitalize">{s.kind || "contact"}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{subDate(s)}</TableCell>
              <TableCell className="capitalize">{SUB_STATUS(s)}</TableCell>
              <TableCell><div className="flex justify-end"><RowBtns a={a} /></div></TableCell>
            </TableRow>
          ); })}
        </TableBody>
      </Table>
    </div>
  );
}

function SubCards({ subs, act }: SubViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {subs.map((s) => { const a = act(s); return (
        <div key={s.id} className="rounded-xl border border-border bg-card p-4">
          <button onClick={a.onOpen} className="w-full text-left">
            <div className="flex items-center gap-2"><p className="truncate font-medium">{s.name || "Unknown"}</p><Badge variant="outline" className="ml-auto capitalize">{s.kind || "contact"}</Badge></div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.email}</p>
            {s.message && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{s.message}</p>}
            <p className="mt-2 text-[11px] text-muted-foreground">{subDate(s)}</p>
          </button>
          <div className="mt-3 border-t border-border pt-2"><RowBtns a={a} /></div>
        </div>
      ); })}
    </div>
  );
}

function SubKanban({ subs, act }: SubViewProps) {
  const cols: { key: string; label: string }[] = [{ key: "new", label: "New" }, { key: "read", label: "Read" }, { key: "archived", label: "Archived" }];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cols.map((c) => {
        const col = subs.filter((s) => SUB_STATUS(s) === c.key);
        return (
          <div key={c.key} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1"><span className="text-sm font-semibold">{c.label}</span><span className="text-xs text-muted-foreground">{col.length}</span></div>
            <div className="space-y-2">
              {col.map((s) => { const a = act(s); return (
                <div key={s.id} className="rounded-md border border-border bg-background p-2.5">
                  <button onClick={a.onOpen} className="w-full text-left"><p className="truncate text-sm font-medium">{s.name || "Unknown"}</p><p className="truncate text-[11px] text-muted-foreground">{s.email}</p></button>
                  <div className="mt-2"><RowBtns a={a} /></div>
                </div>
              ); })}
              {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground/60">Empty</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubMap({ subs, onOpen }: { subs: Submission[]; onOpen: (id: string) => void }) {
  const points = subs
    .map((s) => { const r = s as Submission & { lat?: number; lng?: number }; return typeof r.lat === "number" && typeof r.lng === "number" ? { id: s.id, lat: r.lat, lng: r.lng, title: s.name || s.email || "Submission" } : null; })
    .filter(Boolean) as { id: string; lat: number; lng: number; title: string }[];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="h-[420px] overflow-hidden rounded-xl border border-border"><SubmissionsMap points={points} onOpen={onOpen} /></div>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{points.length ? `${points.length} located on the map.` : "Website submissions don't include a location, so they aren't placed on the map yet. Add a location field to the form to plot them here."}</p>
        {subs.map((s) => (
          <button key={s.id} onClick={() => onOpen(s.id)} className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-xs transition-colors hover:border-brand/40">
            <span className="truncate font-medium">{s.name || "Unknown"}</span><span className="ml-auto shrink-0 text-muted-foreground">{subDate(s)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SubField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
