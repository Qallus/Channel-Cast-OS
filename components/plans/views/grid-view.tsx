"use client";

import { Fragment } from "react";
import { Flag } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberAvatarStack } from "@/components/plans/shared/member-avatar-stack";
import { DueDate, LabelChip, ProgressIndicator } from "@/components/plans/shared/badges";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/plans/constants";
import { cn } from "@/lib/utils";
import type { BoardColumn } from "@/lib/plans/view-model";
import type { PlanLabel, PlanPerson, PlanTaskDetail, TaskPriority, TaskStatus } from "@/lib/plans/types";

// Grid view — the same PlanTaskDetail records the board renders, as a table.
// Status and priority edit inline; everything else opens the drawer.

const COLUMN_COUNT = 9;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TaskRow({
  task,
  labels,
  people,
  canEdit,
  onOpen,
  onInlineChange,
}: {
  task: PlanTaskDetail;
  labels: PlanLabel[];
  people: PlanPerson[];
  canEdit: boolean;
  onOpen: () => void;
  onInlineChange: (patch: { status?: TaskStatus; priority?: TaskPriority }) => void;
}) {
  const taskLabels = labels.filter((l) => task.label_ids.includes(l.id));
  const assignees = people.filter((p) => task.assignee_ids.includes(p.id));

  return (
    <TableRow className="cursor-pointer hover:bg-accent/50" onClick={onOpen}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-1.5">
          {task.is_milestone ? <Flag className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Milestone" /> : null}
          <span className={cn("min-w-0", task.status === "complete" && "text-muted-foreground line-through")}>{task.title}</span>
        </div>
      </TableCell>

      {/* Inline editors must not bubble their click into the row's open handler. */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select value={task.status} onValueChange={(v) => onInlineChange({ status: v as TaskStatus })} disabled={!canEdit}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select value={task.priority} onValueChange={(v) => onInlineChange({ priority: v as TaskPriority })} disabled={!canEdit}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell><MemberAvatarStack people={assignees} max={3} /></TableCell>
      <TableCell className="text-xs tabular-nums text-muted-foreground">{formatDate(task.start_date)}</TableCell>
      <TableCell><DueDate date={task.due_date} complete={task.status === "complete"} /></TableCell>
      <TableCell className="w-36"><ProgressIndicator value={task.progress} /></TableCell>
      <TableCell>
        {taskLabels.length ? (
          <div className="flex flex-wrap gap-1">
            {taskLabels.map((label) => (
              <LabelChip key={label.id} label={label} />
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs tabular-nums text-muted-foreground">
        {new Date(task.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </TableCell>
    </TableRow>
  );
}

export function GridView({
  columns,
  labels,
  people,
  canEdit,
  grouped,
  onOpenTask,
  onInlineChange,
}: {
  columns: BoardColumn[];
  labels: PlanLabel[];
  people: PlanPerson[];
  canEdit: boolean;
  grouped: boolean;
  onOpenTask: (task: PlanTaskDetail) => void;
  onInlineChange: (task: PlanTaskDetail, patch: { status?: TaskStatus; priority?: TaskPriority }) => void;
}) {
  const total = columns.reduce((sum, c) => sum + c.tasks.length, 0);

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-56">Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {total === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-muted-foreground">
                  No tasks match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              columns.map((column) =>
                column.tasks.length === 0 && grouped ? null : (
                  <Fragment key={column.key}>
                    {grouped ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={COLUMN_COUNT} className="bg-muted/50 py-1.5">
                          <span className="text-xs font-semibold">{column.title}</span>
                          <span className="ml-2 text-xs tabular-nums text-muted-foreground">{column.tasks.length}</span>
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {column.tasks.map((task) => (
                      <TaskRow
                        key={`${column.key}-${task.id}`}
                        task={task}
                        labels={labels}
                        people={people}
                        canEdit={canEdit}
                        onOpen={() => onOpenTask(task)}
                        onInlineChange={(patch) => onInlineChange(task, patch)}
                      />
                    ))}
                  </Fragment>
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
