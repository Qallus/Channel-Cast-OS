import { cn } from "@/lib/utils";
import { planColor, taskPriority, taskStatus } from "@/lib/plans/constants";
import type { PlanLabel, TaskPriority, TaskStatus } from "@/lib/plans/types";

// Small presentation pieces shared by the board, grid and task drawer.
// Every badge pairs colour with an icon or text so status is never colour-only.

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const meta = taskStatus(status);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.chip,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const meta = taskPriority(priority);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.chip,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function LabelChip({ label, className }: { label: PlanLabel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        planColor(label.color).chip,
        className,
      )}
    >
      {label.name}
    </span>
  );
}

export function ProgressIndicator({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{clamped}%</span>
    </div>
  );
}

export function DueDate({ date, complete }: { date: string | null; complete?: boolean }) {
  if (!date) return <span className="text-muted-foreground">—</span>;

  const due = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = !complete && due < today;
  const label = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <span
      className={cn(
        "whitespace-nowrap text-xs tabular-nums",
        overdue ? "font-semibold text-destructive" : "text-muted-foreground",
      )}
    >
      {/* Overdue is spelled out, not just coloured. */}
      {overdue ? `${label} · overdue` : label}
    </span>
  );
}
