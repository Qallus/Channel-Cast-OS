"use client";

import { Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatarStack } from "@/components/plans/shared/member-avatar-stack";
import { DueDate, LabelChip, PriorityBadge, StatusBadge } from "@/components/plans/shared/badges";
import { taskStatus } from "@/lib/plans/constants";
import { cn } from "@/lib/utils";
import type { BoardColumn } from "@/lib/plans/view-model";
import type { PlanLabel, PlanPerson, PlanTaskDetail } from "@/lib/plans/types";

// List view — the same records as Kanban/Table, as a compact checklist. The circle
// on the left toggles complete without opening anything, which is the whole point
// of a list: run down it and tick things off.

export function ListView({
  columns,
  labels,
  people,
  canEdit,
  grouped,
  onOpenTask,
  onToggleComplete,
  onAddTask,
}: {
  columns: BoardColumn[];
  labels: PlanLabel[];
  people: PlanPerson[];
  canEdit: boolean;
  grouped: boolean;
  onOpenTask: (task: PlanTaskDetail) => void;
  onToggleComplete: (task: PlanTaskDetail) => void;
  onAddTask?: (column: BoardColumn) => void;
}) {
  const total = columns.reduce((sum, c) => sum + c.tasks.length, 0);

  if (total === 0 && !onAddTask) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/25 p-10 text-center text-sm text-muted-foreground">
        No tasks match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {columns.map((column) => {
        if (grouped && column.tasks.length === 0 && !onAddTask) return null;
        const done = column.tasks.filter((t) => t.status === "complete").length;

        return (
          <section key={column.key} aria-label={column.title} className="space-y-1.5">
            {grouped && (
              <div className="flex items-center gap-2 border-b border-border pb-1.5">
                <h3 className="text-sm font-semibold">{column.title}</h3>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {column.tasks.length}
                </span>
                {column.tasks.length > 0 && (
                  <span className="text-xs tabular-nums text-muted-foreground">{done}/{column.tasks.length} done</span>
                )}
              </div>
            )}

            {column.tasks.map((task) => {
              const meta = taskStatus(task.status);
              const complete = task.status === "complete";
              const assignees = people.filter((p) => task.assignee_ids.includes(p.id));
              const taskLabels = labels.filter((l) => task.label_ids.includes(l.id));
              const checked = task.checklist.filter((c) => c.is_complete).length;

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 transition hover:border-primary/40"
                >
                  <button
                    type="button"
                    onClick={() => onToggleComplete(task)}
                    disabled={!canEdit}
                    aria-label={complete ? `Mark ${task.title} not started` : `Mark ${task.title} complete`}
                    aria-pressed={complete}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      complete ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-primary",
                      !canEdit && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <meta.icon className="h-3 w-3" aria-hidden />
                  </button>

                  <button type="button" onClick={() => onOpenTask(task)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1.5">
                      {task.is_milestone && <Flag className="h-3 w-3 shrink-0 text-primary" aria-label="Milestone" />}
                      <span className={cn("truncate text-sm font-medium", complete && "text-muted-foreground line-through")}>
                        {task.title}
                      </span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      {task.checklist.length > 0 && <span className="tabular-nums">{checked}/{task.checklist.length} steps</span>}
                      {taskLabels.map((l) => <LabelChip key={l.id} label={l} />)}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={task.status} className="hidden sm:inline-flex" />
                    {task.priority !== "medium" && <PriorityBadge priority={task.priority} className="hidden md:inline-flex" />}
                    <DueDate date={task.due_date} complete={complete} />
                    <MemberAvatarStack people={assignees} max={2} />
                  </div>
                </div>
              );
            })}

            {column.tasks.length === 0 && (
              <p className="px-1 py-2 text-xs text-muted-foreground">Nothing here yet.</p>
            )}

            {canEdit && onAddTask && (
              <Button variant="ghost" size="sm" onClick={() => onAddTask(column)} className="gap-1.5 text-muted-foreground">
                <Plus className="h-3.5 w-3.5" aria-hidden /> Add task{grouped ? ` to ${column.title}` : ""}
              </Button>
            )}
          </section>
        );
      })}
    </div>
  );
}
