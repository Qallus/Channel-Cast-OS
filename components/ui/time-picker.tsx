"use client";

import * as React from "react";
import { Check, Clock } from "lucide-react";

import { cn } from "@/lib/utils";

export type TimePickerProps = {
  value: string; // "HH:MM" 24h
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  step?: number; // minutes between options
};

function options(step: number) {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return out;
}

function label(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

export function TimePicker({ value, onChange, placeholder = "Select time", className, disabled, step = 30 }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const opts = React.useMemo(() => options(step), [step]);

  React.useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-left text-sm shadow-sm transition-colors",
          "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          value ? "text-foreground" : "text-muted-foreground",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value ? label(value) : placeholder}</span>
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 top-[calc(100%+4px)] z-[70] max-h-56 w-full min-w-[9rem] overflow-auto rounded-lg border bg-card p-1 text-card-foreground shadow-xl">
          {opts.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { onChange(t); setOpen(false); }}
              className={cn("flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent", value === t ? "bg-accent font-medium text-brand-strong" : "text-foreground")}
            >
              {label(t)}{value === t && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
