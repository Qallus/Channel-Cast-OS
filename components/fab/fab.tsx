"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Call, Device as TwilioDevice } from "@twilio/voice-sdk";
import {
  Delete,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Minimize2,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Plus,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToolBoundary } from "@/components/fab/tool-boundary";
import { cn } from "@/lib/utils";

/** Lightweight, dependency-free hover/focus tooltip (light + dark via popover tokens). */
function IconTip({ label, side = "bottom", children }: { label: string; side?: "bottom" | "right"; children: React.ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[80] whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "bottom" ? "left-1/2 top-full mt-1.5 -translate-x-1/2" : "left-full top-1/2 ml-2 -translate-y-1/2",
        )}
      >
        {label}
      </span>
    </span>
  );
}

type ToolId = "agent" | "dm" | "sms" | "dialpad" | "calls" | "notes";
const TOOLS: { id: ToolId; label: string; icon: typeof Phone }[] = [
  { id: "agent", label: "AI Agent", icon: Sparkles },
  { id: "dm", label: "Direct Message", icon: MessageCircle },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "dialpad", label: "Dialpad", icon: Phone },
  { id: "calls", label: "Call Logs", icon: PhoneCall },
  { id: "notes", label: "Notes", icon: StickyNote },
];

const fmtPhone = (v: string | null) => {
  if (!v) return "Unknown";
  const d = v.replace(/[^\d]/g, "");
  const l = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
  return l.length === 10 ? `(${l.slice(0, 3)}) ${l.slice(3, 6)}-${l.slice(6)}` : v;
};

export function Fab() {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<ToolId>("agent");
  const [expanded, setExpanded] = useState(false);
  const [dialSeed, setDialSeed] = useState("");

  // Close on Escape (collapse from full → compact first, then close).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (expanded) setExpanded(false);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, expanded]);

  const body = (
    <>
      {tool === "agent" && <AgentTool />}
      {tool === "dm" && <Scaffold icon={MessageCircle} title="Direct Message" note="Team & customer DMs land here — a unified inbox across the org." />}
      {tool === "sms" && <SmsTool />}
      {tool === "dialpad" && <DialpadTool seed={dialSeed} />}
      {tool === "calls" && <CallLogsTool onCallBack={(n) => { setDialSeed(n); setTool("dialpad"); }} />}
      {tool === "notes" && <NotesTool />}
    </>
  );

  const tabRow = (
    <div className="flex items-center gap-0.5">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const active = tool === t.id;
        return (
          <IconTip key={t.id} label={t.label}>
            <button
              onClick={() => setTool(t.id)}
              aria-label={t.label}
              aria-pressed={active}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                active ? "bg-accent text-brand-strong" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          </IconTip>
        );
      })}
    </div>
  );

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Quick actions"
        aria-expanded={open}
        className={cn(
          "fixed bottom-6 right-6 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-xl transition-transform hover:scale-105",
          open && "rotate-45",
        )}
      >
        <Plus className="h-6 w-6" />
      </button>

      {open && !expanded && (
        /* Compact panel anchored directly above the FAB (~450×450) */
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed bottom-24 right-6 z-50 flex h-[min(450px,calc(100vh-8rem))] w-[min(450px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            role="dialog"
            aria-label="Quick actions"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
              {tabRow}
              <div className="flex items-center gap-0.5">
                <button onClick={() => setExpanded(true)} aria-label="Expand" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"><Maximize2 className="h-4 w-4" /></button>
                <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <ToolBoundary key={tool}>{body}</ToolBoundary>
            </div>
          </div>
        </>
      )}

      {open && expanded && (
        /* Full modal (icon rail + content) */
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setExpanded(false)} />
          <div className="relative z-10 flex h-[88vh] w-[92vw] max-w-[1400px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Tool rail */}
            <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border py-3 sm:w-52 sm:items-stretch sm:px-2">
              <p className="hidden px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:block">Quick actions</p>
              {TOOLS.map((t) => {
                const Icon = t.icon;
                const active = tool === t.id;
                const btn = (
                  <button
                    onClick={() => setTool(t.id)}
                    aria-label={t.label}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center gap-2.5 rounded-lg text-sm font-medium transition-colors sm:h-auto sm:w-auto sm:justify-start sm:px-2.5 sm:py-2",
                      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-brand-strong")} /> <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
                // On the wide rail the label is inline; only tip when collapsed to icons.
                return (
                  <div key={t.id} className="w-full">
                    <span className="sm:hidden"><IconTip label={t.label} side="right">{btn}</IconTip></span>
                    <span className="hidden sm:block">{btn}</span>
                  </div>
                );
              })}
            </div>
            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{TOOLS.find((t) => t.id === tool)?.label}</p>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setExpanded(false)} aria-label="Collapse" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><Minimize2 className="h-4 w-4" /></button>
                  <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <ToolBoundary key={tool}>{body}</ToolBoundary>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── AI Agent ────────────────────────────────────────────────────────── */

function AgentTool() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/agent/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: res.ok ? data.reply : data.error || "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Sparkles className="mb-2 h-6 w-6 text-brand-strong" />
            Ask the Channel Cast assistant anything — clients, campaigns, devices, next steps.
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm", m.role === "user" ? "bg-brand text-brand-foreground" : "border border-border bg-muted/40 text-foreground")}>{m.content}</div>
            </div>
          ))
        )}
        {busy && <div className="text-sm text-muted-foreground">Thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-border pt-3">
        <Textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} placeholder="Message the assistant…" className="min-h-[42px] flex-1 resize-none" />
        <Button onClick={send} disabled={busy || !input.trim()}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

/* ── Dialpad ─────────────────────────────────────────────────────────── */

function DialpadTool({ seed }: { seed: string }) {
  const [num, setNum] = useState(seed);
  const [numbers, setNumbers] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<"idle" | "connecting" | "on_call">("idle");
  const deviceRef = useRef<TwilioDevice | null>(null);
  const callRef = useRef<Call | null>(null);

  useEffect(() => setNum(seed), [seed]);

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
      } catch {
        /* comm not configured / offline — dialpad stays in "connecting" state */
      }
    })();
    return () => {
      device?.destroy();
      deviceRef.current = null;
    };
  }, []);

  async function call() {
    if (state !== "idle") return callRef.current?.disconnect();
    if (!num.trim() || !deviceRef.current) return;
    setState("connecting");
    try {
      const c = await deviceRef.current.connect({ params: { To: num.trim(), From: from || "" } });
      callRef.current = c;
      c.on("accept", () => setState("on_call"));
      c.on("disconnect", () => { setState("idle"); callRef.current = null; });
    } catch {
      setState("idle");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      {numbers.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {numbers.map((n) => (
            <button key={n} onClick={() => setFrom(n)} className={cn("rounded-lg border px-2 py-1 text-xs", from === n ? "border-brand-strong text-brand-strong" : "border-border text-muted-foreground")}>{fmtPhone(n)}</button>
          ))}
        </div>
      )}
      <div className="relative">
        <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="Enter phone number" className="pr-9 text-center" />
        {num && <button onClick={() => setNum((v) => v.slice(0, -1))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Delete className="h-4 w-4" /></button>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
          <button key={d} onClick={() => (state === "on_call" ? callRef.current?.sendDigits(d) : setNum((v) => v + d))} className="flex h-14 items-center justify-center rounded-lg border border-border bg-background text-lg font-semibold text-foreground hover:border-brand/50 hover:bg-accent/40">{d}</button>
        ))}
      </div>
      <Button onClick={call} disabled={(!num.trim() && state === "idle") || (!ready && state === "idle")} className={cn("mt-3 w-full", state !== "idle" ? "bg-destructive hover:bg-destructive/90" : "bg-success text-success-foreground hover:bg-success/90")}>
        <Phone className="h-4 w-4" /> {state === "connecting" ? "Connecting…" : state === "on_call" ? "End call" : "Call"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">{ready ? "Ready to call" : "Connecting to Twilio…"}</p>
    </div>
  );
}

/* ── Call Logs ───────────────────────────────────────────────────────── */

function CallLogsTool({ onCallBack }: { onCallBack: (n: string) => void }) {
  const [calls, setCalls] = useState<{ sid: string; to: string | null; from: string | null; status: string; direction: string; duration: string | null; dateCreated: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/comm/calls?limit=40").then((r) => r.json()).then((d) => setCalls(d.calls || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <div className="mx-auto max-w-2xl space-y-2">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : calls.length === 0 ? (
        <p className="text-sm text-muted-foreground">No calls.</p>
      ) : (
        calls.map((c) => {
          const inbound = c.direction?.toLowerCase().includes("inbound");
          const number = inbound ? c.from : c.to;
          return (
            <div key={c.sid} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", inbound ? "bg-brand/10 text-brand-strong" : "bg-muted text-muted-foreground")}>
                {inbound ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{fmtPhone(number)}</p>
                <p className="text-xs text-muted-foreground capitalize">{c.status.replace("-", " ")} · {Math.floor(Number(c.duration || 0) / 60)}:{String(Number(c.duration || 0) % 60).padStart(2, "0")}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(c.dateCreated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <Button size="sm" variant="outline" onClick={() => onCallBack(number || "")}><Phone className="h-3.5 w-3.5" /> Call</Button>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ── SMS ─────────────────────────────────────────────────────────────── */

function SmsTool() {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [numbers, setNumbers] = useState<string[]>([]);
  const [from, setFrom] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/comm/sms").then((r) => r.json()).then((d) => { setNumbers(d.smsPhoneNumbers || []); setFrom((d.smsPhoneNumbers || [])[0] || null); }).catch(() => {});
  }, []);

  async function send() {
    if (!to.trim() || !body.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/comm/sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, from, body }) });
      const d = await res.json();
      setMsg(res.ok ? "Sent." : d.error || "Failed.");
      if (res.ok) setBody("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-3">
      {numbers.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {numbers.map((n) => <button key={n} onClick={() => setFrom(n)} className={cn("rounded-lg border px-2 py-1 text-xs", from === n ? "border-brand-strong text-brand-strong" : "border-border text-muted-foreground")}>{fmtPhone(n)}</button>)}
        </div>
      )}
      <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To (+1 555 000 0000)" />
      <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message…" />
      <div className="flex items-center gap-2">
        <Button onClick={send} disabled={sending || !to.trim() || !body.trim()}><Send className="h-4 w-4" /> {sending ? "Sending…" : "Send SMS"}</Button>
        {msg && <span className="text-sm text-brand-strong">{msg}</span>}
      </div>
    </div>
  );
}

/* ── Notes (local quick pad) ─────────────────────────────────────────── */

type QuickNote = { id: string; text: string; at: number };

function NotesTool() {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [draft, setDraft] = useState("");

  const load = useCallback(() => {
    try {
      setNotes(JSON.parse(localStorage.getItem("cc-quick-notes") || "[]"));
    } catch {
      setNotes([]);
    }
  }, []);
  useEffect(load, [load]);
  const persist = (n: QuickNote[]) => {
    setNotes(n);
    localStorage.setItem("cc-quick-notes", JSON.stringify(n));
  };

  function add() {
    const text = draft.trim();
    if (!text) return;
    persist([{ id: Math.random().toString(36).slice(2), text, at: Date.now() }, ...notes]);
    setDraft("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-end gap-2">
        <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && add()} placeholder="Jot a quick note… (⌘↵ to save)" className="flex-1" />
        <Button onClick={add} disabled={!draft.trim()}>Save</Button>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="whitespace-pre-wrap text-sm text-foreground">{n.text}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{new Date(n.at).toLocaleString()}</p>
            </div>
            <button onClick={() => persist(notes.filter((x) => x.id !== n.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))
      )}
    </div>
  );
}

function Scaffold({ icon: Icon, title, note }: { icon: typeof Phone; title: string; note: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-5 w-5" /></span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
