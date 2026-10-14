"use client";

import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, FileText, Receipt, Sparkles, Upload } from "lucide-react";

import { FormField } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { categoryOf } from "@/lib/finance/categories";
import { guessColumns, importKey, mapRows, parseCsv, toEntries, type ColumnMap } from "@/lib/finance/csv";
import { newId, type FinEntry } from "@/lib/finance/types";
import { invoiceTotal, type Invoice } from "@/lib/ops/invoices";
import { cn } from "@/lib/utils";

import { CategorySelect, Section, usd } from "./fin-ui";
import type { FinanceStore } from "./use-finance";

type Mode = "csv" | "document" | "invoices";
type Row = FinEntry & { duplicate: boolean; signed: number; include: boolean };
const NONE = "-1";

const ROLES: { key: keyof ColumnMap; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount (one column)" },
  { key: "debit", label: "Debit / money out" },
  { key: "credit", label: "Credit / money in" },
  { key: "vendor", label: "Merchant (optional)" },
];

export function ImportPanel({ store, flash, onDone }: { store: FinanceStore; flash: (m: string, tone?: "ok" | "error") => void; onDone: () => void }) {
  const { profile } = store;
  const [mode, setMode] = useState<Mode>("csv");
  const [account, setAccount] = useState("");
  const [business, setBusiness] = useState(profile.businesses[0]?.id ?? "");
  // CSV
  const [table, setTable] = useState<string[][] | null>(null);
  const [map, setMap] = useState<ColumnMap | null>(null);
  const [positiveIs, setPositiveIs] = useState<"out" | "in">("out");
  const [paste, setPaste] = useState("");
  // Preview
  const [rows, setRows] = useState<Row[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const existingKeys = useMemo(() => new Set(store.entries.items.map((e) => e.importKey).filter(Boolean) as string[]), [store.entries.items]);
  const reset = () => { setTable(null); setMap(null); setRows(null); setNote(null); setPaste(""); };

  function loadTable(text: string) {
    const parsed = parseCsv(text);
    if (parsed.length < 2) { flash("That file has no rows to import.", "error"); return; }
    // Some exports put a few lines of account info above the header — use the first row that looks like one.
    const headerIdx = Math.max(0, parsed.findIndex((r) => r.some((c) => /date/i.test(c))));
    const t = parsed.slice(headerIdx);
    setTable(t);
    setMap(guessColumns(t[0]));
    setRows(null);
  }

  function buildPreview() {
    if (!table || !map) return;
    if (map.date < 0 || (map.amount < 0 && map.debit < 0 && map.credit < 0)) { flash("Pick at least a date column and an amount column.", "error"); return; }
    const { rows: parsed, skipped } = mapRows(table.slice(1), map, positiveIs);
    const entries = toEntries(parsed, { account: account || undefined, business, rules: profile.rules, existingKeys, source: "csv", newId: () => newId("fe") });
    setRows(entries.map((e) => ({ ...e, include: !e.duplicate })));
    setNote(`${parsed.length} rows read${skipped ? `, ${skipped} skipped (no date or amount)` : ""}${entries.some((e) => e.duplicate) ? ` — ${entries.filter((e) => e.duplicate).length} already in your ledger are unchecked` : ""}.`);
  }

  async function readDocument(file: File) {
    setBusy("Reading the document with AI — a long statement can take a minute…");
    try {
      // Keep the original in private storage so the ledger lines can point back to it.
      const up = new FormData(); up.append("file", file);
      const stored = await fetch("/api/finance/receipts", { method: "POST", body: up }).then((r) => r.json()).catch(() => ({}));
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/finance/ai/extract", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't read that document.");
      const now = new Date().toISOString();
      const src = data.kind === "receipt" ? "receipt" : "statement";
      const list: Row[] = (data.transactions ?? []).map((t: { date: string; description: string; amount: number; direction: "in" | "out"; vendor: string; category: string }) => {
        const signed = t.direction === "in" ? Math.abs(t.amount) : -Math.abs(t.amount);
        const key = importKey(t.date, signed, t.description);
        return {
          id: newId("fe"), date: t.date, description: t.description, amount: Math.abs(t.amount), direction: t.direction, category: t.category || "uncategorized",
          vendor: t.vendor || undefined, account: account || [data.issuer, data.accountLast4 && `••${data.accountLast4}`].filter(Boolean).join(" ") || undefined,
          business, source: src, importKey: key, receiptPath: stored?.path, createdAt: now,
          duplicate: existingKeys.has(key), signed, include: !existingKeys.has(key),
        } as Row;
      });
      setRows(list);
      const bits = [
        `${list.length} transaction${list.length === 1 ? "" : "s"} found`,
        data.issuer && `from ${data.issuer}${data.accountLast4 ? ` ••${data.accountLast4}` : ""}`,
        data.periodStart && `${data.periodStart} → ${data.periodEnd}`,
        data.interestCharged ? `interest ${usd.format(data.interestCharged)}` : null,
        data.feesCharged ? `fees ${usd.format(data.feesCharged)}` : null,
      ].filter(Boolean).join(" · ");
      setNote(`${bits}.${data.notes ? ` Note: ${data.notes}` : ""}`);
    } catch (e) {
      flash((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function loadInvoices() {
    setBusy("Loading invoices…");
    try {
      const res = await fetch("/api/crm/invoices");
      const invoices = (await res.json().catch(() => [])) as Invoice[];
      const now = new Date().toISOString();
      const list: Row[] = (Array.isArray(invoices) ? invoices : []).filter((i) => i.status === "paid").map((i) => {
        const key = `invoice:${i.id}`;
        return {
          id: newId("fe"), date: i.issueDate, description: `${i.number} — ${i.billTo?.name || i.client}${i.description ? ` · ${i.description}` : ""}`,
          amount: Math.round(invoiceTotal(i) * 100) / 100, direction: "in", category: "inc_services", vendor: i.billTo?.company || i.billTo?.name || i.client,
          business, source: "invoice", importKey: key, createdAt: now, notes: "Dated by invoice issue date — change to the day the money arrived if it was paid in a different month (cash basis).",
          duplicate: existingKeys.has(key), signed: invoiceTotal(i), include: false,
        } as Row;
      });
      setRows(list);
      setNote(`${list.length} paid invoices. Nothing is checked — tick the real ones (the demo invoices in Billing aren't your income).`);
    } catch {
      flash("Couldn't load invoices.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function aiCategorize() {
    if (!rows) return;
    const target = rows.filter((r) => r.include && r.category === "uncategorized");
    if (!target.length) { flash("Every checked row already has a category."); return; }
    setBusy(`Categorizing ${target.length} rows…`);
    try {
      const results: { id: string; category: string; businessUsePct: number }[] = [];
      for (let i = 0; i < target.length; i += 200) {
        const res = await fetch("/api/finance/ai/categorize", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: target.slice(i, i + 200).map((r) => ({ id: r.id, description: r.description, amount: r.amount, direction: r.signed > 0 ? "in" : "out", vendor: r.vendor })) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Categorizing failed.");
        results.push(...(data.results ?? []));
      }
      const by = new Map(results.map((r) => [r.id, r]));
      setRows((list) => list!.map((r) => {
        const s = by.get(r.id);
        return s ? { ...r, category: s.category, businessUsePct: s.businessUsePct < 100 ? s.businessUsePct : r.businessUsePct } : r;
      }));
      flash(`Categorized ${results.length} rows — review, then import.`);
    } catch (e) {
      flash((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function commit() {
    if (!rows) return;
    const chosen = rows.filter((r) => r.include).map(({ duplicate: _d, signed: _s, include: _i, ...e }) => e as FinEntry);
    if (!chosen.length) return;
    setBusy(`Importing ${chosen.length} entries…`);
    const okSave = await store.entries.saveMany(chosen);
    setBusy(null);
    if (!okSave) { flash("Import failed — nothing was saved.", "error"); return; }
    flash(`Imported ${chosen.length} entries.`);
    reset();
    onDone();
  }

  const included = rows?.filter((r) => r.include) ?? [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {([
          { id: "csv", icon: FileSpreadsheet, title: "Spreadsheet or CSV", text: "Bank & card exports, Excel/Sheets (save as CSV or paste cells), expense logs." },
          { id: "document", icon: FileText, title: "Statement, receipt, or tax form", text: "PDF statements, receipt photos, 1098 mortgage forms — AI reads every line." },
          { id: "invoices", icon: Receipt, title: "Paid invoices from Billing", text: "Bring income you invoiced in the Invoices tab into the books." },
        ] as const).map((m) => (
          <button key={m.id} type="button" onClick={() => { setMode(m.id); reset(); }}
            className={cn("rounded-xl border p-4 text-left transition-colors", mode === m.id ? "border-brand-strong bg-brand/5" : "border-border bg-card hover:border-brand/40")}>
            <m.icon className="h-5 w-5 text-brand-strong" />
            <p className="mt-2 text-sm font-semibold text-foreground">{m.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{m.text}</p>
          </button>
        ))}
      </div>

      <Section title="Import settings">
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Account name"><Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="e.g. Amex Business Gold" /></FormField>
          <FormField label="Business">
            <Select value={business} onValueChange={setBusiness}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{profile.businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          {mode === "csv" && (
            <FormField label="Positive amounts are">
              <Select value={positiveIs} onValueChange={(v) => setPositiveIs(v as "out" | "in")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="out">Charges / money out (card exports)</SelectItem>
                  <SelectItem value="in">Deposits / money in (bank exports)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </div>
      </Section>

      {mode === "csv" && !rows && (
        <Section title="1 · Choose the file" description="Excel or Google Sheets: File → Download/Save as → CSV. Or copy the cells and paste below.">
          <div className="space-y-3">
            <input ref={csvRef} type="file" accept=".csv,.tsv,.txt,text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) loadTable(await f.text()); e.target.value = ""; }} />
            <Button variant="outline" onClick={() => csvRef.current?.click()}><Upload className="h-4 w-4" /> Choose CSV file</Button>
            <Textarea rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"…or paste rows here, header first:\nDate\tDescription\tAmount\n01/03/2026\tAdobe\t54.99"} />
            {paste.trim() && <Button size="sm" onClick={() => loadTable(paste)}>Use pasted rows</Button>}
          </div>
          {table && map && (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-medium text-foreground">2 · Match the columns <span className="font-normal text-muted-foreground">({table.length - 1} rows)</span></p>
              <div className="grid gap-3 sm:grid-cols-3">
                {ROLES.map((r) => (
                  <FormField key={r.key} label={r.label}>
                    <Select value={String(map[r.key])} onValueChange={(v) => setMap({ ...map, [r.key]: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— none —</SelectItem>
                        {table[0].map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                ))}
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <tbody>
                    {table.slice(0, 4).map((r, i) => (
                      <tr key={i} className={cn("border-b border-border last:border-0", i === 0 && "bg-muted/50 font-medium")}>
                        {r.map((c, j) => <td key={j} className="max-w-[180px] truncate px-2 py-1">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={buildPreview}>Preview import</Button>
            </div>
          )}
        </Section>
      )}

      {mode === "document" && !rows && (
        <Section title="Upload a document" description="PDF or photo, up to 25MB. The original is stored privately and linked to each line.">
          <input ref={docRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readDocument(f); e.target.value = ""; }} />
          <Button onClick={() => docRef.current?.click()} disabled={Boolean(busy)}><Sparkles className="h-4 w-4" /> Choose PDF or photo</Button>
        </Section>
      )}

      {mode === "invoices" && !rows && (
        <Section title="Paid invoices" description="Reads the Invoices tab. You pick which ones become income.">
          <Button onClick={loadInvoices} disabled={Boolean(busy)}>Load paid invoices</Button>
        </Section>
      )}

      {busy && <p className="animate-pulse text-sm text-muted-foreground">{busy}</p>}

      {rows && (
        <Section
          title={`Review · ${included.length} of ${rows.length} selected`}
          description={note ?? undefined}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setRows(rows.map((r) => ({ ...r, include: !r.duplicate })))}>Select new</Button>
              <Button size="sm" variant="outline" onClick={aiCategorize} disabled={Boolean(busy)}><Sparkles className="h-3.5 w-3.5" /> AI categorize</Button>
              <Button size="sm" variant="ghost" onClick={reset}>Start over</Button>
              <Button size="sm" onClick={commit} disabled={!included.length || Boolean(busy)}>Import {included.length}</Button>
            </div>
          }
        >
          <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-9 p-2"><input type="checkbox" checked={rows.every((r) => r.include)} onChange={(e) => setRows(rows.map((r) => ({ ...r, include: e.target.checked })))} aria-label="Select all" /></th>
                  <th className="p-2 font-medium">Date</th><th className="p-2 font-medium">Description</th><th className="p-2 font-medium">Category</th><th className="p-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={cn("border-b border-border/60 last:border-0", !r.include && "opacity-50")}>
                    <td className="p-2"><input type="checkbox" checked={r.include} onChange={() => setRows(rows.map((x) => (x.id === r.id ? { ...x, include: !x.include } : x)))} aria-label="Include row" /></td>
                    <td className="whitespace-nowrap p-2 text-muted-foreground">{r.date}</td>
                    <td className="max-w-[320px] p-2"><p className="truncate text-foreground">{r.description}</p>{r.duplicate && <p className="text-[11px] text-warning">Already imported</p>}</td>
                    <td className="p-2"><CategorySelect value={r.category} onChange={(v) => setRows(rows.map((x) => (x.id === r.id ? { ...x, category: v } : x)))} profile={profile} className={cn("h-8 w-[210px] text-xs", r.category === "uncategorized" && "border-warning")} /></td>
                    <td className={cn("whitespace-nowrap p-2 text-right tabular-nums", r.signed > 0 ? "text-success" : "text-foreground")}>{r.signed > 0 ? "+" : "−"}{usd.format(r.amount)}<span className="block text-[10px] text-muted-foreground">{categoryOf(r.category, profile.customCategories).kind}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
