"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Paperclip, Pencil, Plus, Sparkles, Trash2, Upload } from "lucide-react";

import { EmptyState, FormField, RowActions, SearchBox } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { allCategories, categoryOf } from "@/lib/finance/categories";
import { toCsv } from "@/lib/finance/csv";
import { inYear } from "@/lib/finance/tax";
import { newId, type FinEntry, type FinProfile } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

import { CategorySelect, CustomFieldsRepeater, NumberInput, TagInput, usd } from "./fin-ui";
import type { FinanceStore } from "./use-finance";

type Suggestion = { id: string; category: string; businessUsePct: number; confidence: string; reason: string; accept: boolean };
const PAGE = 150;

export function LedgerPanel({ store, flash }: { store: FinanceStore; flash: (m: string, tone?: "ok" | "error") => void }) {
  const { profile } = store;
  const year = profile.taxYear;
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [month, setMonth] = useState("all");
  const [account, setAccount] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<{ draft: FinEntry; isNew: boolean } | null>(null);
  const [bulkCat, setBulkCat] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);

  const yearEntries = useMemo(() => store.entries.items.filter((e) => inYear(e.date, year)), [store.entries.items, year]);
  const accounts = useMemo(() => [...new Set(yearEntries.map((e) => e.account).filter(Boolean) as string[])].sort(), [yearEntries]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return yearEntries
      .filter((e) => cat === "all" || (cat === "kind:income" ? categoryOf(e.category, profile.customCategories).kind === "income" : cat === "kind:expense" ? categoryOf(e.category, profile.customCategories).kind === "expense" : e.category === cat))
      .filter((e) => month === "all" || e.date.slice(5, 7) === month)
      .filter((e) => account === "all" || e.account === account)
      .filter((e) => !q || [e.description, e.vendor, e.notes, e.account, ...(e.tags ?? []), ...(e.custom ?? []).map((c) => `${c.label} ${c.value}`)].join(" ").toLowerCase().includes(q) || String(e.amount).includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [yearEntries, cat, month, account, search, profile.customCategories]);

  const total = (list: FinEntry[], kind: "income" | "expense") => list.reduce((s, e) => s + (categoryOf(e.category, profile.customCategories).kind === kind ? e.amount : 0), 0);
  const uncategorized = yearEntries.filter((e) => e.category === "uncategorized");
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  function blank(): FinEntry {
    return { id: newId("fe"), date: new Date().toISOString().slice(0, 10), description: "", amount: 0, category: "uncategorized", business: profile.businesses[0]?.id, source: "manual", createdAt: new Date().toISOString(), custom: [], tags: [] };
  }

  async function save() {
    if (!editing) return;
    const d = editing.draft;
    if (!d.description.trim() || !(d.amount > 0)) return;
    const okSave = await store.entries.saveMany([{ ...d, amount: Math.round(d.amount * 100) / 100 }]);
    flash(okSave ? (editing.isNew ? "Entry added." : "Entry saved.") : "Couldn't save — check your connection.", okSave ? "ok" : "error");
    setEditing(null);
  }

  async function applyBulkCategory() {
    if (!bulkCat || !selected.size) return;
    const changed = store.entries.items.filter((e) => selected.has(e.id)).map((e) => ({ ...e, category: bulkCat, reviewed: true }));
    const okSave = await store.entries.saveMany(changed);
    flash(okSave ? `Recategorized ${changed.length} entries.` : "Couldn't save the change.", okSave ? "ok" : "error");
    setSelected(new Set());
    setBulkCat("");
  }

  async function runAi() {
    const target = selected.size ? store.entries.items.filter((e) => selected.has(e.id)) : uncategorized;
    if (!target.length) { flash("Nothing to categorize — select rows or clear the uncategorized ones first."); return; }
    setAiBusy(true);
    const found: Suggestion[] = [];
    try {
      for (let i = 0; i < target.length; i += 200) {
        const batch = target.slice(i, i + 200).map((e) => ({ id: e.id, description: e.description, amount: e.amount, direction: e.direction ?? (categoryOf(e.category).kind === "income" ? "in" : "out"), vendor: e.vendor }));
        const res = await fetch("/api/finance/ai/categorize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: batch }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "The AI couldn't categorize these.");
        for (const r of data.results ?? []) found.push({ ...r, accept: r.confidence !== "low" });
      }
      setSuggestions(found);
    } catch (e) {
      flash((e as Error).message, "error");
    } finally {
      setAiBusy(false);
    }
  }

  async function acceptSuggestions() {
    if (!suggestions) return;
    const byId = new Map(suggestions.filter((s) => s.accept).map((s) => [s.id, s]));
    const changed = store.entries.items.filter((e) => byId.has(e.id)).map((e) => {
      const s = byId.get(e.id)!;
      return { ...e, category: s.category, businessUsePct: s.businessUsePct < 100 ? s.businessUsePct : e.businessUsePct, reviewed: true };
    });
    const okSave = await store.entries.saveMany(changed);
    flash(okSave ? `Applied ${changed.length} categories.` : "Couldn't save.", okSave ? "ok" : "error");
    setSuggestions(null);
    setSelected(new Set());
  }

  async function doDelete() {
    if (!confirmDelete) return;
    const okDel = await store.entries.removeMany(confirmDelete);
    flash(okDel ? `Deleted ${confirmDelete.length} entr${confirmDelete.length === 1 ? "y" : "ies"}.` : "Couldn't delete.", okDel ? "ok" : "error");
    setSelected(new Set());
    setConfirmDelete(null);
  }

  function exportCsv() {
    const header = ["Date", "Description", "Vendor", "Amount", "Category", "Tax line", "Business use %", "Deductible", "Account", "Business", "Tags", "Notes", "Custom fields"];
    const biz = new Map(profile.businesses.map((b) => [b.id, b.name]));
    const lines = rows.map((e) => {
      const c = categoryOf(e.category, profile.customCategories);
      const deductible = c.kind === "expense" ? e.amount * ((e.businessUsePct ?? 100) / 100) * ((c.deductiblePct ?? 100) / 100) : "";
      return [e.date, e.description, e.vendor, e.amount.toFixed(2), c.label, c.lineLabel, e.businessUsePct ?? 100, typeof deductible === "number" ? deductible.toFixed(2) : "", e.account, biz.get(e.business ?? "") ?? "", (e.tags ?? []).join("; "), e.notes, (e.custom ?? []).map((x) => `${x.label}: ${x.value}`).join("; ")];
    });
    const blob = new Blob([toCsv([header, ...lines])], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ledger-${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setLimit(PAGE); }} placeholder="Search description, vendor, tags…" />
          <Select value={cat} onValueChange={(v) => { setCat(v); setLimit(PAGE); }}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="kind:income">All income</SelectItem>
              <SelectItem value="kind:expense">All business expenses</SelectItem>
              {allCategories(profile).map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{new Date(2000, i, 1).toLocaleString("en-US", { month: "long" })}</SelectItem>)}
            </SelectContent>
          </Select>
          {accounts.length > 0 && (
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={runAi} disabled={aiBusy}><Sparkles className="h-4 w-4" /> {aiBusy ? "Categorizing…" : selected.size ? `Categorize ${selected.size} with AI` : `Categorize ${uncategorized.length} with AI`}</Button>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> CSV</Button>
          <Button onClick={() => setEditing({ draft: blank(), isNew: true })}><Plus className="h-4 w-4" /> Add entry</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{rows.length} entries</span>
        <span>Income <span className="font-medium text-success">{usd.format(total(rows, "income"))}</span></span>
        <span>Expenses <span className="font-medium text-foreground">{usd.format(total(rows, "expense"))}</span></span>
        {uncategorized.length > 0 && <button className="font-medium text-warning hover:underline" onClick={() => setCat("uncategorized")}>{uncategorized.length} uncategorized</button>}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/40 bg-brand/5 p-2">
          <span className="px-1 text-sm font-medium text-foreground">{selected.size} selected</span>
          <CategorySelect value={bulkCat} onChange={setBulkCat} profile={profile} className="h-8 w-[220px]" placeholder="Set category…" />
          <Button size="sm" onClick={applyBulkCategory} disabled={!bulkCat}>Apply</Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmDelete([...selected])}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState message={yearEntries.length ? "No entries match these filters." : `No ${year} entries yet. Import a statement or spreadsheet, add one by hand, or tell the AI assistant what you spent.`} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-9 p-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
                <th className="p-2 font-medium">Date</th>
                <th className="p-2 font-medium">Description</th>
                <th className="p-2 font-medium">Category</th>
                <th className="p-2 text-right font-medium">Amount</th>
                <th className="w-10 p-2" />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((e) => {
                const c = categoryOf(e.category, profile.customCategories);
                return (
                  <tr key={e.id} className={cn("border-b border-border/60 last:border-0 hover:bg-muted/40", selected.has(e.id) && "bg-brand/5")}>
                    <td className="p-2"><input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} aria-label={`Select ${e.description}`} /></td>
                    <td className="whitespace-nowrap p-2 text-muted-foreground">{e.date}</td>
                    <td className="max-w-[340px] p-2">
                      <button className="block w-full truncate text-left text-foreground hover:underline" onClick={() => setEditing({ draft: { ...e }, isNew: false })}>{e.description}</button>
                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                        {e.account && <span>{e.account}</span>}
                        {(e.businessUsePct ?? 100) < 100 && <Badge variant="outline" className="h-4 px-1 text-[10px]">{e.businessUsePct}% business</Badge>}
                        {(e.tags ?? []).map((t) => <Badge key={t} variant="outline" className="h-4 px-1 text-[10px]">{t}</Badge>)}
                        {e.receiptPath && <a href={`/api/finance/receipts?path=${encodeURIComponent(e.receiptPath)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-brand-strong hover:underline"><Paperclip className="h-3 w-3" />receipt</a>}
                      </div>
                    </td>
                    <td className="p-2">
                      <CategorySelect value={e.category} onChange={(v) => store.entries.update(e.id, { category: v, reviewed: true })} profile={profile} className={cn("h-8 w-[210px] text-xs", e.category === "uncategorized" && "border-warning text-warning")} />
                    </td>
                    <td className={cn("whitespace-nowrap p-2 text-right font-medium tabular-nums", c.kind === "income" ? "text-success" : c.kind === "excluded" ? "text-muted-foreground" : "text-foreground")}>
                      {c.kind === "income" ? "+" : ""}{usd.format(e.amount)}
                    </td>
                    <td className="p-2">
                      <RowActions actions={[
                        { label: "Edit", icon: Pencil, onClick: () => setEditing({ draft: { ...e }, isNew: false }) },
                        { label: "Delete", icon: Trash2, onClick: () => setConfirmDelete([e.id]), destructive: true },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > limit && <div className="p-3 text-center"><Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more</Button></div>}
        </div>
      )}

      {/* Editor */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.isNew ? "Add entry" : "Edit entry"}</DialogTitle></DialogHeader>
          {editing && <EntryEditor draft={editing.draft} profile={profile} onChange={(draft) => setEditing({ ...editing, draft })} flash={flash} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!editing || !editing.draft.description.trim() || !(editing.draft.amount > 0)}>{editing?.isNew ? "Add entry" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI review */}
      <Dialog open={Boolean(suggestions)} onOpenChange={(o) => !o && setSuggestions(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Review AI categories</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Low-confidence suggestions start unchecked. Change any category before applying.</p>
          <div className="divide-y divide-border rounded-lg border border-border">
            {suggestions?.map((s) => {
              const e = store.entries.items.find((x) => x.id === s.id);
              if (!e) return null;
              return (
                <div key={s.id} className="grid grid-cols-[24px_1fr_220px] items-center gap-2 p-2 text-sm">
                  <input type="checkbox" checked={s.accept} onChange={() => setSuggestions((list) => list!.map((x) => (x.id === s.id ? { ...x, accept: !x.accept } : x)))} aria-label="Apply this suggestion" />
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{e.description} <span className="text-muted-foreground">· {usd.format(e.amount)}</span></p>
                    <p className="truncate text-xs text-muted-foreground">{s.reason}{s.businessUsePct < 100 ? ` · ${s.businessUsePct}% business` : ""} · <span className={s.confidence === "low" ? "text-warning" : ""}>{s.confidence}</span></p>
                  </div>
                  <CategorySelect value={s.category} onChange={(v) => setSuggestions((list) => list!.map((x) => (x.id === s.id ? { ...x, category: v, accept: true } : x)))} profile={profile} className="h-8 text-xs" />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestions(null)}>Cancel</Button>
            <Button onClick={acceptSuggestions}>Apply {suggestions?.filter((s) => s.accept).length ?? 0}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete {confirmDelete?.length === 1 ? "entry" : `${confirmDelete?.length} entries`}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This can&apos;t be undone. Attached receipts stay in storage.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryEditor({ draft, profile, onChange, flash }: { draft: FinEntry; profile: FinProfile; onChange: (d: FinEntry) => void; flash: (m: string, tone?: "ok" | "error") => void }) {
  const set = <K extends keyof FinEntry>(k: K, v: FinEntry[K]) => onChange({ ...draft, [k]: v });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const c = categoryOf(draft.category, profile.customCategories);

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/finance/receipts", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed.");
      set("receiptPath", data.path);
    } catch (e) {
      flash((e as Error).message, "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Date"><DatePicker value={draft.date} onChange={(v) => set("date", v)} /></FormField>
        <FormField label="Amount ($)"><NumberInput value={draft.amount} onChange={(n) => set("amount", n)} min={0} /></FormField>
        <FormField label="Description" className="sm:col-span-2"><Input value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="What was it?" /></FormField>
        <FormField label="Category"><CategorySelect value={draft.category} onChange={(v) => set("category", v)} profile={profile} /></FormField>
        <FormField label="Vendor / client"><Input value={draft.vendor ?? ""} onChange={(e) => set("vendor", e.target.value)} /></FormField>
        {profile.businesses.length > 1 && (
          <FormField label="Business">
            <Select value={draft.business ?? profile.businesses[0]?.id} onValueChange={(v) => set("business", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{profile.businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        )}
        <FormField label="Account"><Input value={draft.account ?? ""} onChange={(e) => set("account", e.target.value)} placeholder="e.g. Amex Business" /></FormField>
        {(c.kind === "expense" || c.kind === "personal") && (
          <FormField label="Business use %"><NumberInput value={draft.businessUsePct ?? 100} onChange={(n) => set("businessUsePct", Math.min(100, Math.max(0, n)))} step="1" min={0} /></FormField>
        )}
      </div>
      <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">Goes on: <span className="font-medium text-foreground">{c.lineLabel}</span>{c.hint ? ` — ${c.hint}` : ""}</p>
      <FormField label="Tags"><TagInput value={draft.tags} onChange={(v) => set("tags", v)} /></FormField>
      <FormField label="Notes"><Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder={draft.category === "exp_meals" ? "Who you met and the business purpose" : "Business purpose"} /></FormField>
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Receipt</p>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : draft.receiptPath ? "Replace" : "Attach receipt"}</Button>
          {draft.receiptPath && <a className="text-sm text-brand-strong hover:underline" href={`/api/finance/receipts?path=${encodeURIComponent(draft.receiptPath)}`} target="_blank" rel="noreferrer">View receipt</a>}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Custom fields</p>
        <CustomFieldsRepeater value={draft.custom} onChange={(v) => set("custom", v)} />
      </div>
    </div>
  );
}
