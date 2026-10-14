"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string; tools?: { name: string; summary: string }[]; error?: boolean };

const STARTERS = [
  "Why is my business losing money, and what are the three biggest fixes?",
  "I drove 34 miles round trip to Mesa today to install a player at a client site.",
  "Bought a $1,299 MacBook at Best Buy on 3/14 — 80% business use.",
  "Find my subscriptions and tell me which ones to cancel.",
  "What if I add a second $3,000/month retainer?",
  "Walk me through what I need to file this year, in order.",
];

const STORAGE_KEY = "cc-finance-chat";

export function AssistantPanel({ onChanged }: { onChanged: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/finance/ai/assistant").then((r) => r.json()).then((d) => setConfigured(Boolean(d?.configured))).catch(() => setConfigured(false));
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setTurns(JSON.parse(saved));
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-40))); } catch { /* storage unavailable */ }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/finance/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((t) => !t.error).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "The assistant didn't answer.");
      setTurns((t) => [...t, { role: "assistant", content: data.reply, tools: data.tools }]);
      if (data.changed) onChanged();
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[70vh] min-h-[480px] flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand-strong" />
          <p className="text-sm font-semibold text-foreground">Bookkeeping assistant</p>
          <span className="text-xs text-muted-foreground">reads and updates your books · Claude</span>
        </div>
        {turns.length > 0 && <Button size="sm" variant="ghost" onClick={() => setTurns([])}>New chat</Button>}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {configured === false && (
          <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">The AI isn&apos;t connected yet. Add <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code> to the server environment and redeploy. Everything else on this page works without it.</p>
        )}
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tell it what happened in plain English — purchases, trips, hours, W-2 numbers — and it records them. Or ask it about your numbers.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={busy || configured === false} className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-brand/50 disabled:opacity-50">{s}</button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm", t.role === "user" ? "bg-brand/15 text-foreground" : t.error ? "bg-destructive/10 text-destructive" : "bg-muted/60 text-foreground")}>
              {t.tools && t.tools.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {t.tools.map((x, j) => <span key={j} className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground"><Wrench className="h-3 w-3" />{x.summary}</span>)}
                </div>
              )}
              <p className="whitespace-pre-wrap">{t.content}</p>
            </div>
          </div>
        ))}
        {busy && <p className="animate-pulse text-sm text-muted-foreground">Working on it…</p>}
        <div ref={endRef} />
      </div>

      <form className="flex items-end gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }} placeholder="e.g. Paid $240 for the CPA on April 2 · How much did I spend on hosting?" className="min-h-0 flex-1 resize-none" />
        <Button type="submit" disabled={busy || !draft.trim() || configured === false}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
