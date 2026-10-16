"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, ClipboardCopy, Copy, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildTurboTax, type TtField, type TtScreen } from "@/lib/finance/turbotax";
import type { TaxInput, TaxSummary } from "@/lib/finance/tax";
import { cn } from "@/lib/utils";

import { usd0 } from "./fin-ui";

const progressKey = (year: number) => `cc-tt-progress-${year}`;

function loadProgress(year: number): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(progressKey(year)) || "[]")); } catch { return new Set(); }
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function TurboTaxPanel({ input, summary }: { input: TaxInput; summary: TaxSummary }) {
  const steps = useMemo(() => buildTurboTax(input, summary), [input, summary]);
  const flat = useMemo(() => steps.flatMap((st) => st.screens.map((sc) => ({ step: st, screen: sc }))), [steps]);
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const year = summary.year;

  useEffect(() => { setDone(loadProgress(year)); setIndex(0); }, [year]);
  const toggleDone = (id: string) => setDone((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    try { localStorage.setItem(progressKey(year), JSON.stringify([...next])); } catch { /* storage unavailable */ }
    return next;
  });

  async function copy(id: string, text: string) {
    if (await copyText(text)) { setCopied(id); setTimeout(() => setCopied((c) => (c === id ? null : c)), 1400); }
  }

  const current = flat[Math.min(index, flat.length - 1)];
  const fedRefund = -summary.federalBalance;
  const azRefund = -summary.az.balance;
  const completed = flat.filter((f) => done.has(f.screen.id)).length;

  return (
    <div className="space-y-4">
      {/* Refund meter */}
      <div className="flex flex-wrap items-stretch gap-3 rounded-xl border border-border bg-card p-3">
        <Meter label={`Federal ${fedRefund >= 0 ? "refund" : "tax due"}`} value={Math.abs(fedRefund)} good={fedRefund >= 0} />
        <Meter label={`Arizona ${azRefund >= 0 ? "refund" : "tax due"}`} value={Math.abs(azRefund)} good={azRefund >= 0} />
        <div className="flex min-w-[180px] flex-1 flex-col justify-center px-2">
          <p className="text-xs text-muted-foreground">{completed} of {flat.length} screens entered</p>
          <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-brand transition-all" style={{ width: `${(completed / Math.max(1, flat.length)) * 100}%` }} /></div>
          <p className="mt-1 text-[11px] text-muted-foreground">TurboTax&apos;s meter should land on these numbers when you&apos;re done.</p>
        </div>
        <Button variant="outline" size="sm" className="self-center" onClick={() => setShowAll((v) => !v)}><List className="h-4 w-4" /> {showAll ? "One screen at a time" : "Show every screen"}</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Step navigation */}
        <nav className="h-fit rounded-xl border border-border bg-card p-2 lg:sticky lg:top-4" aria-label="Interview steps">
          {steps.map((st) => (
            <div key={st.id} className="mb-1">
              <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{st.title}</p>
              {st.screens.map((sc) => {
                const i = flat.findIndex((f) => f.screen.id === sc.id);
                const active = !showAll && i === index;
                return (
                  <button key={sc.id} type="button" onClick={() => { setShowAll(false); setIndex(i); }}
                    className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors", active ? "bg-brand/15 text-brand-strong" : "text-foreground hover:bg-muted/60")}>
                    {done.has(sc.id) ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" /> : <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                    <span className="truncate">{sc.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Screens */}
        <div className="min-w-0 space-y-4">
          {(showAll ? flat : current ? [current] : []).map(({ step, screen }) => (
            <ScreenCard key={screen.id} step={step.title} screen={screen} done={done.has(screen.id)} onDone={() => toggleDone(screen.id)} copied={copied} onCopy={copy} />
          ))}
          {!showAll && (
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}><ChevronLeft className="h-4 w-4" /> Back</Button>
              <span className="text-xs text-muted-foreground">Screen {index + 1} of {flat.length}</span>
              <Button onClick={() => { if (current && !done.has(current.screen.id)) toggleDone(current.screen.id); setIndex((i) => Math.min(flat.length - 1, i + 1)); }} disabled={index >= flat.length - 1}>
                Entered — continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Values copy as plain numbers (no $ or commas) so they paste cleanly into TurboTax. Screen names follow TurboTax&apos;s interview but can differ slightly by edition — the form and line under each title is the reliable match. Progress checkmarks are saved in this browser.</p>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value, good }: { label: string; value: number; good: boolean }) {
  return (
    <div className="min-w-[150px] rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", good ? "text-success" : "text-destructive")}>{usd0.format(value)}</p>
    </div>
  );
}

function ScreenCard({ step, screen, done, onDone, copied, onCopy }: { step: string; screen: TtScreen; done: boolean; onDone: () => void; copied: string | null; onCopy: (id: string, text: string) => void }) {
  const all = [...screen.fields, ...(screen.groups ?? []).flatMap((g) => g.fields)].filter((f) => f.copy !== "");
  const asText = [screen.title, ...screen.fields.map((f) => `${f.label}\t${f.copy}`), ...(screen.groups ?? []).flatMap((g) => [`\n${g.title}`, ...g.fields.map((f) => `${f.label}\t${f.copy}`)])].join("\n");
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{screen.path.startsWith(step) ? screen.path : `${step} · ${screen.path}`}</p>
          <h3 className="mt-0.5 text-lg font-semibold text-foreground">{screen.title}</h3>
          {screen.form && <p className="text-xs text-muted-foreground">{screen.form}</p>}
        </div>
        <div className="flex gap-2">
          {all.length > 1 && <Button size="sm" variant="outline" onClick={() => onCopy(`all-${screen.id}`, asText)}><ClipboardCopy className="h-3.5 w-3.5" /> {copied === `all-${screen.id}` ? "Copied" : "Copy screen"}</Button>}
          <Button size="sm" variant={done ? "default" : "outline"} onClick={onDone}><Check className="h-3.5 w-3.5" /> {done ? "Entered" : "Mark entered"}</Button>
        </div>
      </header>
      <div className="space-y-4 p-4">
        {screen.help && <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{screen.help}</p>}
        {screen.warn && <p className="flex gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{screen.warn}</p>}
        {screen.fields.length > 0 && <Fields fields={screen.fields} copied={copied} onCopy={onCopy} />}
        {(screen.groups ?? []).map((g) => (
          <div key={g.title} className="rounded-lg border border-border">
            <p className="border-b border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">{g.title}</p>
            <div className="p-3"><Fields fields={g.fields} copied={copied} onCopy={onCopy} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Fields({ fields, copied, onCopy }: { fields: TtField[]; copied: string | null; onCopy: (id: string, text: string) => void }) {
  return (
    <div className="divide-y divide-border/60">
      {fields.map((f) => (
        <div key={f.id} className="flex items-center gap-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">{f.label}</p>
            {f.note && <p className="text-xs text-muted-foreground">{f.note}</p>}
          </div>
          <span className={cn("shrink-0 rounded-md border px-2.5 py-1 font-mono text-sm tabular-nums", f.kind === "money" ? "border-border bg-background text-foreground" : f.kind === "choice" ? "border-brand/30 bg-brand/5 text-brand-strong" : "border-border bg-background text-foreground", !f.copy && "text-muted-foreground")}>
            {f.display}
          </span>
          <button type="button" disabled={!f.copy} onClick={() => onCopy(f.id, f.copy)} aria-label={`Copy ${f.label}`}
            className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-30", copied === f.id ? "border-success text-success" : "border-border text-muted-foreground hover:text-foreground")}>
            {copied === f.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      ))}
    </div>
  );
}
