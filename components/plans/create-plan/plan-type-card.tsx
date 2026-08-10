"use client";

import { Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// A selectable card in the "Start from scratch" section. Renders as a radio so the
// group is keyboard-navigable and announced as a choice, not a button.
export function PlanTypeCard({
  title,
  description,
  icon: Icon,
  selected,
  locked,
  lockedReason,
  onSelect,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
  locked?: boolean;
  lockedReason?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={locked}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition min-h-[44px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected ? "border-primary/50 bg-accent/60 shadow-sm" : "border-border bg-card hover:border-primary/30 hover:bg-accent/30",
        locked && "cursor-not-allowed opacity-60 hover:border-border hover:bg-card",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-primary",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">{title}</span>
          {locked ? <Lock className="h-3 w-3 text-muted-foreground" aria-hidden /> : null}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          {locked && lockedReason ? lockedReason : description}
        </span>
      </span>
    </button>
  );
}
