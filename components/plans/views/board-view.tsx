"use client";

import { useState } from "react";
import { CheckSquare, Flag, GripVertical, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MemberAvatarStack } from "@/components/plans/shared/member-avatar-stack";
import { DueDate, LabelChip, PriorityBadge, StatusBadge } from "@/components/plans/shared/badges";
import { cn } from "@/lib/utils";
import type { PlanLabel, PlanPerson, PlanTaskDetail } from "@/lib/plans/types";
import type { BoardColumn } from "@/lib/plans/view-model";

// Kanban board. Drag-and-drop is native HTML5 — matching the existing Project
// Manager kanban and the CMS editor — so no drag library is added to the project.
// Keyboard users move a task with the Group / Status selects in the task drawer;
// every drop is also announced through the parent's live region.

function TaskCard({
  task,
  labels,
  people,
  canEdit,
  onOpen,
  onDragStart,
  onDragEnd,
  onDropBefore,
  dragging,
}: {
  task: PlanTaskDetail;
  labels: PlanLabel[];
  people: PlanPerson[];
  canEdit: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropBefore: () => void;
  dragging: boolean;
}) {
  const [over, setOver] = useState(false);
  const taskLabels = labels.filter((l) => task.label_ids.includes(l.id));
  const assignees = people.filter((p) => task.assignee_ids.includes(p.id));
  const doneItems = task.checklist.filter((c) => c.is_complete).length;

  return (
    <div
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        onDropBefore();
      }}
      className={cn("rounded-lg", over && "ring-2 ring-ring ring-offset-1 ring-offset-background")}
    >
      <div
        draggable={canEdit}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={cn(
          "group w-full rounded-lg border border-border bg-card p-2.5 text-left shadow-sm transition",
          "hover:border-primary/40 hover:shadow",
          canEdit && "cursor-grab active:cursor-grabbing",
          dragging && "opacity-40",
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded"
        >
          <div className="flex items-start gap-1.5">
            {canEdit ? (
              <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" aria-hidden />
            ) : null}
            <span className={cn("min-w-0 flex-1 text-sm font-medium", task.status === "complete" && "text-muted-foreground line-through")}>
              {task.title}
            </span>
            {task.is_milestone ? <Flag className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Milestone" /> : null}
          </div>

          {taskLabels.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {taskLabels.map((label) => (
                <LabelChip key={label.id} label={label} />
              ))}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={task.status} />
            {task.priority !== "medium" ? <PriorityBadge priority={task.priority} /> : null}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <MemberAvatarStack people={assignees} max={3} />
            <div className="flex items-center gap-2">
              {task.checklist.length ? (
                <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                  <CheckSquare className="h-3 w-3" aria-hidden />
                  {doneItems}/{task.checklist.length}
                  <span className="sr-only">checklist items complete</span>
                </span>
              ) : null}
              <DueDate date={task.due_date} complete={task.status === "complete"} />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export function BoardView({
  columns,
  labels,
  people,
  canEdit,
  allowQuickAdd,
  onOpenTask,
  onMove,
  onQuickAdd,
  onDeleteGroup,
}: {
  columns: BoardColumn[];
  labels: PlanLabel[];
  people: PlanPerson[];
  canEdit: boolean;
  allowQuickAdd: boolean;
  onOpenTask: (task: PlanTaskDetail) => void;
  onMove: (taskId: string, column: BoardColumn, index: number) => void;
  onQuickAdd: (column: BoardColumn, title: string) => void;
  // Only supplied when grouping by Group — the other groupings aren't real
  // records, so there'd be nothing to delete.
  onDeleteGroup?: (column: BoardColumn) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function drop(column: BoardColumn, index: number) {
    if (dragId) onMove(dragId, column, index);
    setDragId(null);
    setOverColumn(null);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((column) => {
        const isCollapsed = collapsed[column.key];
        const complete = column.tasks.filter((t) => t.status === "complete").length;

        return (
          <section
            key={column.key}
            aria-label={column.title}
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setOverColumn(column.key);
            }}
            onDragLeave={() => setOverColumn((c) => (c === column.key ? null : c))}
            onDrop={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              // Dropping on the column body (not on a card) appends to the end.
              drop(column, column.tasks.length);
            }}
            className={cn(
              "group/col flex shrink-0 flex-col rounded-xl border bg-muted/30 transition",
              isCollapsed ? "w-12" : "w-72",
              overColumn === column.key ? "border-primary/60 bg-accent/30" : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 p-2.5">
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [column.key]: false }))}
                  className="flex h-full w-full flex-col items-center gap-2 py-2 text-xs font-medium"
                  aria-label={`Expand ${column.title}`}
                >
                  <span className="tabular-nums text-muted-foreground">{column.tasks.length}</span>
                  <span className="[writing-mode:vertical-rl] whitespace-nowrap">{column.title}</span>
                </button>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold">{column.title}</h3>
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {column.tasks.length}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {column.tasks.length ? (
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {complete}/{column.tasks.length} done
                      </span>
                    ) : null}
                    {/* No delete on the "No group" catch-all — it isn't a record. */}
                    {onDeleteGroup && column.groupId ? (
                      <button
                        type="button"
                        onClick={() => onDeleteGroup(column)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/col:opacity-100"
                        aria-label={`Delete group ${column.title}`}
                        title={`Delete group ${column.title}`}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setCollapsed((c) => ({ ...c, [column.key]: true }))}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      aria-label={`Collapse ${column.title}`}
                    >
                      <span aria-hidden className="text-xs leading-none">–</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {!isCollapsed ? (
              <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
                {column.tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    labels={labels}
                    people={people}
                    canEdit={canEdit}
                    dragging={dragId === task.id}
                    onOpen={() => onOpenTask(task)}
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverColumn(null);
                    }}
                    onDropBefore={() => drop(column, index)}
                  />
                ))}

                {column.tasks.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                    {canEdit ? "Drop a task here" : "No tasks"}
                  </p>
                ) : null}

                {canEdit && allowQuickAdd ? (
                  adding === column.key ? (
                    <div className="space-y-1.5">
                      <Input
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTitle.trim()) {
                            onQuickAdd(column, newTitle.trim());
                            setNewTitle("");
                            setAdding(null);
                          }
                          if (e.key === "Escape") {
                            setNewTitle("");
                            setAdding(null);
                          }
                        }}
                        onBlur={() => {
                          if (newTitle.trim()) onQuickAdd(column, newTitle.trim());
                          setNewTitle("");
                          setAdding(null);
                        }}
                        placeholder="Task title, then Enter"
                        aria-label={`New task in ${column.title}`}
                        className="h-8 text-sm"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdding(column.key)}
                      className="flex min-h-[36px] w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent/50 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden /> Add task
                    </button>
                  )
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
