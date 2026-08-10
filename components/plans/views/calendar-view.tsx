"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { taskStatus } from "@/lib/plans/constants";
import { cn } from "@/lib/utils";
import type { PlanTaskDetail } from "@/lib/plans/types";

// Calendar view — the same task records placed on their due date. Read-only
// placement for now: dragging to reschedule is Phase 3 in the spec, and a calendar
// that silently ignored a drag would be worse than one that doesn't offer it.
// Tasks without a due date can't be placed, so they get an explicit
// "Unscheduled" rail rather than vanishing.

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  tasks,
  onOpenTask,
}: {
  tasks: PlanTaskDetail[];
  onOpenTask: (task: PlanTaskDetail) => void;
}) {
  const [cursor, setCursor] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const today = ymd(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const byDate = React.useMemo(() => {
    const map = new Map<string, PlanTaskDetail[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const list = map.get(t.due_date) ?? [];
      list.push(t);
      map.set(t.due_date, list);
    }
    return map;
  }, [tasks]);

  const unscheduled = tasks.filter((t) => !t.due_date);

  // Six weeks always, so the grid height doesn't jump between months.
  const first = new Date(year, month, 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}
          >
            Today
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-7 border-b border-border bg-muted/50">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d[0]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === month;
              const dayTasks = byDate.get(key) ?? [];
              const isToday = key === today;

              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-24 border-b border-r border-border p-1 last:border-r-0",
                    !inMonth && "bg-muted/30",
                  )}
                >
                  <div className="mb-1 flex justify-end">
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] tabular-nums",
                        isToday ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-muted-foreground" : "text-muted-foreground/40",
                      )}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((t) => {
                      const meta = taskStatus(t.status);
                      return (
                        <button
                          key={t.id}
                          onClick={() => onOpenTask(t)}
                          title={t.title}
                          className={cn(
                            "flex w-full items-center gap-1 rounded border px-1 py-0.5 text-left text-[10px] transition hover:border-primary/50",
                            meta.chip,
                            t.status === "complete" && "line-through opacity-70",
                          )}
                        >
                          {t.is_milestone && <Flag className="h-2.5 w-2.5 shrink-0" aria-hidden />}
                          <span className="truncate">{t.title}</span>
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <span className="block px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold">Unscheduled</h3>
        <p className="text-xs text-muted-foreground">
          {unscheduled.length ? "No due date — open one to schedule it." : "Everything has a due date."}
        </p>
        <div className="space-y-1.5">
          {unscheduled.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenTask(t)}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-xs transition hover:border-primary/40"
            >
              {t.is_milestone && <Flag className="h-3 w-3 shrink-0 text-primary" aria-hidden />}
              <span className={cn("truncate", t.status === "complete" && "text-muted-foreground line-through")}>{t.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
