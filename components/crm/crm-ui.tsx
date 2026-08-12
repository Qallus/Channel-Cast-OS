"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, Search, type LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ── Page header ─────────────────────────────────────────────────────── */

export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

/* ── Stat tiles ──────────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="w-40 shrink-0 snap-start rounded-xl border border-border bg-card p-4 sm:w-auto sm:min-w-0 sm:shrink">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", accent ? "text-brand-strong" : "text-foreground")}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// Single, horizontally-scrollable row on mobile; a grid from sm up.
export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="flex snap-x gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">{children}</div>;
}

/* ── View switcher ───────────────────────────────────────────────────── */

export function ViewSwitcher<T extends string>({
  views,
  value,
  onChange,
}: {
  views: { id: T; label: string; icon: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
      {views.map((v) => {
        const Icon = v.icon;
        const active = v.id === value;
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-brand-strong")} /> {v.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Search box ──────────────────────────────────────────────────────── */

export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
    </div>
  );
}

/* ── Avatar (initials) ───────────────────────────────────────────────── */

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-xs font-semibold text-brand-strong", className)}>
      {initialsOf(name)}
    </span>
  );
}

/* ── Row action menu ─────────────────────────────────────────────────── */

export type RowAction = { label: string; icon: LucideIcon; onClick: () => void; destructive?: boolean };

export function RowActions({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Actions"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-border bg-popover p-1 shadow-md">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  a.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  a.destructive ? "text-destructive hover:text-destructive" : "text-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Drawer detail field ─────────────────────────────────────────────── */

export function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[62%] text-right text-sm font-medium text-foreground">{children || <span className="text-muted-foreground/60">—</span>}</span>
    </div>
  );
}

/* ── Labeled form field ──────────────────────────────────────────────── */

export function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────── */

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">{message}</div>
  );
}

/* ── Reusable month calendar ─────────────────────────────────────────── */

const parseDay = (iso: string) => new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);

// Generic month calendar: place any records on the day of `getDate`. Reused across
// pages (clients, leads, pipeline, quotes, …).
export function RecordCalendar<T>({
  items,
  getId,
  getDate,
  getTitle,
  onOpen,
  footer,
}: {
  items: T[];
  getId: (t: T) => string;
  getDate: (t: T) => string;
  getTitle: (t: T) => string;
  onOpen: (id: string) => void;
  footer?: string;
}) {
  const initial = useMemo(() => {
    const d = items[0] ? parseDay(getDate(items[0])) : new Date(2026, 6, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  const [cursor, setCursor] = useState(initial);

  const first = new Date(cursor.year, cursor.month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const byDay = useMemo(() => {
    const map = new Map<number, T[]>();
    items.forEach((it) => {
      const d = parseDay(getDate(it));
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), it]);
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, cursor]);

  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground hover:text-foreground">‹</button>
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <button onClick={() => shift(1)} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground hover:text-foreground">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={cn("min-h-[76px] rounded-md border p-1", day ? "border-border" : "border-transparent")}>
            {day && (
              <>
                <span className="text-xs text-muted-foreground">{day}</span>
                <div className="mt-1 space-y-1">
                  {(byDay.get(day) ?? []).map((it) => (
                    <button key={getId(it)} onClick={() => onOpen(getId(it))} className="w-full truncate rounded bg-brand/15 px-1.5 py-0.5 text-left text-[10px] font-medium text-brand-strong" title={getTitle(it)}>
                      {getTitle(it)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {footer ? <p className="mt-2 text-xs text-muted-foreground">{footer}</p> : null}
    </div>
  );
}
