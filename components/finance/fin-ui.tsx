"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_GROUPS, allCategories } from "@/lib/finance/categories";
import { newId, type CustomField, type FinProfile } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const signedUsd = (n: number) => (n < 0 ? `−${usd0.format(-n)}` : usd0.format(n));

export function Section({ title, description, action, children, className }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function NumberInput({ value, onChange, step = "0.01", min, className, placeholder }: { value: number | undefined; onChange: (n: number) => void; step?: string; min?: number; className?: string; placeholder?: string }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={Number.isFinite(value) && value !== 0 ? value : value === 0 ? 0 : ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={className}
    />
  );
}

export function CategorySelect({ value, onChange, profile, className, placeholder = "Category" }: { value: string; onChange: (v: string) => void; profile?: FinProfile; className?: string; placeholder?: string }) {
  const cats = allCategories(profile);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-[60vh]">
        {CATEGORY_GROUPS.map((g) => {
          const list = cats.filter(g.filter);
          if (!list.length) return null;
          return (
            <SelectGroup key={g.label}>
              <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</div>
              {list.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/** The "misc labels" repeater: any number of label/value pairs on a record. */
export function CustomFieldsRepeater({ value, onChange, addLabel = "Add field", placeholderLabel = "Label (e.g. Project)", placeholderValue = "Value" }: { value: CustomField[] | undefined; onChange: (v: CustomField[]) => void; addLabel?: string; placeholderLabel?: string; placeholderValue?: string }) {
  const rows = value ?? [];
  const set = (id: string, patch: Partial<CustomField>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[1fr_1.4fr_32px] items-center gap-2">
          <Input value={r.label} onChange={(e) => set(r.id, { label: e.target.value })} placeholder={placeholderLabel} />
          <Input value={r.value} onChange={(e) => set(r.id, { value: e.target.value })} placeholder={placeholderValue} />
          <button type="button" onClick={() => onChange(rows.filter((x) => x.id !== r.id))} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive" aria-label="Remove field"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...rows, { id: newId("cf"), label: "", value: "" }])}><Plus className="h-3.5 w-3.5" /> {addLabel}</Button>
    </div>
  );
}

/** Generic list repeater: renders each row with `render`, plus add/remove. */
export function Repeater<T extends { id: string }>({ items, onChange, render, create, addLabel, empty }: { items: T[]; onChange: (v: T[]) => void; render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode; create: () => T; addLabel: string; empty?: string }) {
  return (
    <div className="space-y-3">
      {items.length === 0 && empty && <p className="text-sm text-muted-foreground">{empty}</p>}
      {items.map((it) => (
        <div key={it.id} className="relative rounded-lg border border-border bg-background p-3 pr-11">
          {render(it, (patch) => onChange(items.map((x) => (x.id === it.id ? { ...x, ...patch } : x))))}
          <button type="button" onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, create()])}><Plus className="h-3.5 w-3.5" /> {addLabel}</Button>
    </div>
  );
}

export function TagInput({ value, onChange }: { value: string[] | undefined; onChange: (v: string[]) => void }) {
  return (
    <Input
      value={(value ?? []).join(", ")}
      onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
      placeholder="Comma-separated, e.g. client-x, trade-show"
    />
  );
}

export function Tone({ tone, children }: { tone: "good" | "warn" | "risk" | "info"; children: React.ReactNode }) {
  const cls = { good: "bg-success/15 text-success", warn: "bg-warning/15 text-warning", risk: "bg-destructive/15 text-destructive", info: "bg-muted text-muted-foreground" }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>{children}</span>;
}
