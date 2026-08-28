"use client";

// Record-aware communication tools.
//
// Same panels as the floating action bar, but each takes a RecordContext, so a
// call, text, email, voice note or AI conversation started from an Opportunity
// attaches to it automatically. Pipeline is a gateway to the Communications
// module here — it never becomes a second messaging system.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Call, Device as TwilioDevice } from "@twilio/voice-sdk";
import { Bot, Loader2, Phone, PhoneOff, Send, Sparkles } from "lucide-react";


import { FormField } from "@/components/crm/crm-ui";
import { VoiceRecorder } from "@/components/recordings/voice-recorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type EmailTemplate, TemplatePicker } from "@/components/comm/email-studio";
import { cn } from "@/lib/utils";

export type RecordContext = {
  opportunityId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  owner?: string | null;
  /** Display name, used to label recordings and the AI call. */
  personName?: string;
};

const fmtPhone = (v: string) => {
  const d = (v || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : v;
};

// ── Dialpad ──────────────────────────────────────────────────────────────────
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function DialpadPanel({ seed, context, onPlaced }: { seed?: string; context: RecordContext; onPlaced?: () => void }) {
  const [num, setNum] = useState(seed ?? "");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<"idle" | "connecting" | "on_call">("idle");
  const deviceRef = useRef<TwilioDevice | null>(null);
  const callRef = useRef<Call | null>(null);

  useEffect(() => { setNum(seed ?? ""); }, [seed]);

  useEffect(() => {
    let device: TwilioDevice | null = null;
    (async () => {
      try {
        const res = await fetch("/api/comm/token");
        if (!res.ok) return;
        const data = await res.json();
        setNumbers(data.phoneNumbers || []);
        setFrom(data.defaultPhoneNumber || null);
        if (!data.dialpadReady) return;
        const { Device } = await import("@twilio/voice-sdk");
        device = new Device(data.token, { logLevel: "error" });
        deviceRef.current = device;
        device.on("registered", () => setReady(true));
        device.register().catch(() => {});
      } catch { /* not configured — the pad stays disabled */ }
    })();
    return () => { device?.destroy(); deviceRef.current = null; };
  }, []);

  async function call() {
    if (state !== "idle") return callRef.current?.disconnect();
    if (!num.trim() || !deviceRef.current) return;
    setState("connecting");
    try {
      const c = await deviceRef.current.connect({ params: { To: num.trim(), From: from || "" } });
      callRef.current = c;
      c.on("accept", () => setState("on_call"));
      c.on("disconnect", () => {
        setState("idle");
        callRef.current = null;
        // The call itself is captured by the Twilio sync; this records the
        // association immediately so it shows on the timeline without waiting.
        void fetch("/api/comm/call-intent", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: num.trim(), from, ...context }),
        }).catch(() => {});
        onPlaced?.();
      });
    } catch { setState("idle"); }
  }

  return (
    <div className="mx-auto max-w-sm space-y-3">
      {numbers.length > 0 && (
        <FormField label="Call from">
          <Select value={from ?? undefined} onValueChange={setFrom}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select a caller ID" /></SelectTrigger>
            <SelectContent>{numbers.map((n) => <SelectItem key={n} value={n}>{fmtPhone(n)}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
      )}
      <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="Enter phone number" className="text-center text-lg" />
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => setNum((v) => v + k)}
            className="rounded-lg border border-border py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted">
            {k}
          </button>
        ))}
      </div>
      <Button onClick={call} disabled={!num.trim() || (!ready && state === "idle")} className="w-full"
        variant={state === "idle" ? "default" : "destructive"}>
        {state === "idle" ? <><Phone className="h-4 w-4" /> Call</> : state === "connecting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</> : <><PhoneOff className="h-4 w-4" /> Hang up</>}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {ready ? "Ready to call" : "Dialpad unavailable — check the Twilio voice setup."}
      </p>
    </div>
  );
}

// ── SMS ──────────────────────────────────────────────────────────────────────
export function SmsPanel({ to: seedTo, context, onSent }: { to?: string; context: RecordContext; onSent?: () => void }) {
  const [to, setTo] = useState(seedTo ?? "");
  const [body, setBody] = useState("");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setTo(seedTo ?? ""); }, [seedTo]);
  useEffect(() => {
    fetch("/api/comm/sms").then((r) => r.json())
      .then((d) => { setNumbers(d.smsPhoneNumbers || []); setFrom((d.smsPhoneNumbers || [])[0] || null); })
      .catch(() => {});
  }, []);

  async function send() {
    setBusy(true); setError(null); setMsg(null);
    try {
      const res = await fetch("/api/comm/sms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, from, body, ...context, actor: context.owner }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d?.error || "The text didn't send."); return; }
      setMsg("Sent — it's on the timeline.");
      setBody("");
      onSent?.();
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md space-y-3">
      {numbers.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {numbers.map((n) => (
            <button key={n} type="button" onClick={() => setFrom(n)}
              className={cn("rounded-lg border px-2 py-1 text-xs", from === n ? "border-brand-strong text-brand-strong" : "border-border text-muted-foreground")}>
              {fmtPhone(n)}
            </button>
          ))}
        </div>
      )}
      <FormField label="To"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="(480) 555-0100" /></FormField>
      <FormField label="Message"><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message…" /></FormField>
      <div className="flex items-center gap-2">
        <Button onClick={send} disabled={busy || !to.trim() || !body.trim()}><Send className="h-4 w-4" /> {busy ? "Sending…" : "Send SMS"}</Button>
        {msg && <span className="text-sm text-brand-strong">{msg}</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}

// ── Email ────────────────────────────────────────────────────────────────────
export function EmailPanel({ to: seedTo, context, onSent }: { to?: string; context: RecordContext; onSent?: () => void }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [to, setTo] = useState(seedTo ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState<string>("none");
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setTo(seedTo ?? ""); }, [seedTo]);
  // One template library across Communications and Pipeline.
  useEffect(() => {
    fetch("/api/email/templates?status=active")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  const emailTemplates = templates;

  function applyTemplate(id: string) {
    setTemplateId(id);
    if (id === "none") { setHtml(null); return; }
    const t = emailTemplates.find((x) => x.id === id);
    if (!t) return;
    // Tokens are left as-is; there's no merge engine yet, so silently blanking
    // them would ship {{client}} to a client either way — better to see them.
    setSubject(t.subject);
    setBody(t.text_body ?? "");
    setHtml(t.html_body || null);
  }

  async function send() {
    setBusy(true); setError(null); setMsg(null);
    try {
      const res = await fetch("/api/comm/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, html, ...context, actor: context.owner }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d?.error || "The email didn't send."); return; }
      setMsg("Sent — it's on the timeline.");
      setBody(""); setSubject(""); setTemplateId("none"); setHtml(null);
      onSent?.();
    } finally { setBusy(false); }
  }

  const chosen = emailTemplates.find((t) => t.id === templateId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <FormField label="To"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com" /></FormField>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Template</p>
          {loadingTemplates
            ? <span className="inline-flex h-9 items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</span>
            : <TemplatePicker templates={emailTemplates} value={templateId === "none" ? "" : templateId} onPick={(t) => applyTemplate(t?.id ?? "none")} />}
        </div>
      </div>
      <FormField label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" /></FormField>
      {chosen && html ? (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <p className="text-xs text-muted-foreground">Using <span className="font-medium text-foreground">{chosen.name}</span></p>
            <button type="button" onClick={() => applyTemplate("none")} className="text-xs text-muted-foreground hover:text-foreground">Clear template</button>
          </div>
          <iframe title="Email preview" srcDoc={html} className="h-[280px] w-full rounded-b-lg bg-white" />
        </div>
      ) : (
        <FormField label="Message">
          <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" className="min-h-[220px]" />
        </FormField>
      )}
      <div className="flex items-center gap-2">
        <Button onClick={send} disabled={busy || !to.trim() || !subject.trim() || !body.trim()}>
          <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send email"}
        </Button>
        {msg && <span className="text-sm text-brand-strong">{msg}</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}

// ── Nicole, the AI voice agent ───────────────────────────────────────────────
export function AgentPanel({ context, phone, onDialed }: { context: RecordContext; phone?: string; onDialed?: () => void }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialTo, setDialTo] = useState(phone ?? "");
  const [dialing, setDialing] = useState(false);
  const [dialMsg, setDialMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDialTo(phone ?? ""); }, [phone]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const ask = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }),
      });
      const d = await res.json();
      setMessages([...next, { role: "assistant", content: res.ok ? d.reply : d.error || "Something went wrong." }]);
    } finally { setBusy(false); }
  }, [input, busy, messages]);

  async function dial() {
    setDialing(true); setDialMsg(null);
    try {
      const res = await fetch("/api/comm/ai-voice/call", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: dialTo, ...context }),
      });
      const d = await res.json().catch(() => ({}));
      setDialMsg(res.ok ? "Nicole is dialling — the call will appear on the timeline." : d?.error || "The call couldn't be placed.");
      if (res.ok) onDialed?.();
    } finally { setDialing(false); }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Bot className="h-3.5 w-3.5" /> Have Nicole call {context.personName || "this contact"}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <Input value={dialTo} onChange={(e) => setDialTo(e.target.value)} placeholder="(480) 555-0100" />
          </div>
          <Button onClick={dial} disabled={dialing || !dialTo.trim()}>
            <Phone className="h-4 w-4" /> {dialing ? "Dialling…" : "Start AI call"}
          </Button>
        </div>
        {dialMsg && <p className="mt-2 text-sm text-brand-strong">{dialMsg}</p>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Sparkles className="mb-2 h-6 w-6 text-brand-strong" />
            Ask Nicole about this opportunity — history, next steps, what to say.
          </div>
        ) : messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm", m.role === "user" ? "bg-brand text-brand-foreground" : "border border-border bg-muted/40 text-foreground")}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="text-sm text-muted-foreground">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border pt-3">
        <Textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void ask())}
          placeholder="Message Nicole…" className="min-h-[42px] flex-1 resize-none" />
        <Button onClick={() => void ask()} disabled={busy || !input.trim()}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

// ── Voice note ───────────────────────────────────────────────────────────────
export function VoiceNotePanel({ context, onSaved }: { context: RecordContext; onSaved?: () => void }) {
  return (
    <div className="mx-auto max-w-md">
      <VoiceRecorder
        onSaved={onSaved}
        defaultLink={context.contactId ? { type: "contact", id: context.contactId, name: context.personName || "Contact" } : undefined}
      />
    </div>
  );
}
