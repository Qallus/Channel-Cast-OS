"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Spinners are noise on money fields, and every number here is tabular. */
const NUMERIC =
  "tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/**
 * A labelled numeric input with an optional `$` prefix or `%` suffix.
 * Values are kept as raw strings so a field can be cleared while typing.
 */
export function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  step,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  step?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm text-muted-foreground">
        {label}
        {hint ? <span className="ml-1 text-muted-foreground/70">{hint}</span> : null}
      </label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(NUMERIC, prefix && "pl-7", suffix && "pr-8")}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** One label/value line in a summary strip. */
export function SummaryRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "default" | "negative";
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong && "border-t border-border pt-1")}>
      <span className={cn("text-sm", strong ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span
        className={cn(
          "tabular-nums text-right",
          strong ? "font-bold" : "font-semibold",
          tone === "negative" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** The muted strip the input cards use for their derived totals. */
export function SummaryBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-1 rounded-lg bg-muted p-3", className)}>{children}</div>;
}
