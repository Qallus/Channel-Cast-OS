"use client";

import { useEffect, useState } from "react";
import { Check, Flag, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { MemberAvatar } from "@/components/plans/shared/member-avatar-stack";
import { LabelChip, ProgressIndicator } from "@/components/plans/shared/badges";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/plans/constants";
import { cn } from "@/lib/utils";
import type { ChecklistItem, PlanGroup, PlanLabel, PlanPerson, PlanTaskDetail, TaskPriority, TaskStatus } from "@/lib/plans/types";

export type TaskDraft = {
  title: string;
  description: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  group_id: string | null;
  start_date: string;
  due_date: string;
  is_milestone: boolean;
  assignee_ids: string[];
  label_ids: string[];
  checklist: Array<Pick<ChecklistItem, "title" | "is_complete">>;
};

export function draftFromTask(task: PlanTaskDetail): TaskDraft {
  return {
    title: task.title,
    description: task.description ?? "",
    notes: task.notes ?? "",
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    group_id: task.group_id,
    start_date: task.start_date ?? "",
    due_date: task.due_date ?? "",
    is_milestone: task.is_milestone,
    assignee_ids: task.assignee_ids,
    label_ids: task.label_ids,
    checklist: task.checklist.map((c) => ({ title: c.title, is_complete: c.is_complete })),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const UNGROUPED = "__ungrouped__";

export function TaskDetailDrawer({
  task,
  groups,
  labels,
  people,
  canEdit,
  saving,
  error,
  onSave,
  onDelete,
  onClose,
}: {
  task: PlanTaskDetail | null;
  groups: PlanGroup[];
  labels: PlanLabel[];
  people: PlanPerson[];
  canEdit: boolean;
  saving: boolean;
  error: string | null;
  onSave: (draft: TaskDraft) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setDraft(task ? draftFromTask(task) : null);
    setConfirmDelete(false);
    setNewItem("");
  }, [task]);

  if (!task || !draft) return null;
  const patch = (next: Partial<TaskDraft>) => setDraft((current) => (current ? { ...current, ...next } : current));

  const done = draft.checklist.filter((c) => c.is_complete).length;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-4 py-3">
          {/* pr-8 leaves room for SheetContent's own close button. */}
          <SheetTitle className="pr-8 text-base">{canEdit ? "Edit task" : "Task"}</SheetTitle>
        </SheetHeader>

        {/* min-h-0 lets this shrink so it scrolls, instead of pushing the action bar
            off the bottom of the drawer. */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {!canEdit ? (
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              You have read-only access to this plan.
            </p>
          ) : null}

          <Field label="Title">
            <Input value={draft.title} onChange={(e) => patch({ title: e.target.value })} disabled={!canEdit} maxLength={300} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select value={draft.status} onValueChange={(v) => patch({ status: v as TaskStatus })} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={draft.priority} onValueChange={(v) => patch({ priority: v as TaskPriority })} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* This select is also the keyboard-accessible equivalent of dragging the
              card between board columns. */}
          <Field label="Group">
            <Select
              value={draft.group_id ?? UNGROUPED}
              onValueChange={(v) => patch({ group_id: v === UNGROUPED ? null : v })}
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNGROUPED}>No group</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <DatePicker value={draft.start_date} onChange={(v) => patch({ start_date: v })} placeholder="Not set" />
            </Field>
            <Field label="Due date">
              <DatePicker value={draft.due_date} onChange={(v) => patch({ due_date: v })} placeholder="Not set" />
            </Field>
          </div>

          <Field label={`Progress — ${draft.progress}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={draft.progress}
              onChange={(e) => patch({ progress: Number(e.target.value) })}
              disabled={!canEdit}
              aria-label="Progress percentage"
              className="w-full accent-primary"
            />
            <ProgressIndicator value={draft.progress} />
          </Field>

          <Field label="Assignees">
            {people.length ? (
              <div className="flex flex-wrap gap-1.5">
                {people.map((person) => {
                  const selected = draft.assignee_ids.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      disabled={!canEdit}
                      onClick={() =>
                        patch({
                          assignee_ids: selected
                            ? draft.assignee_ids.filter((id) => id !== person.id)
                            : [...draft.assignee_ids, person.id],
                        })
                      }
                      className={cn(
                        "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                        selected ? "border-primary/50 bg-accent text-accent-foreground" : "border-border bg-card hover:bg-accent/40",
                        !canEdit && "cursor-not-allowed opacity-60",
                      )}
                    >
                      {selected ? <Check className="h-3 w-3" aria-hidden /> : <MemberAvatar person={person} className="h-4 w-4 text-[8px]" />}
                      {person.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No one to assign yet.</p>
            )}
          </Field>

          <Field label="Labels">
            {labels.length ? (
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label) => {
                  const selected = draft.label_ids.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      disabled={!canEdit}
                      onClick={() =>
                        patch({
                          label_ids: selected ? draft.label_ids.filter((id) => id !== label.id) : [...draft.label_ids, label.id],
                        })
                      }
                      className={cn(
                        "rounded-full transition min-h-[32px]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                        selected ? "opacity-100" : "opacity-50 hover:opacity-80",
                        !canEdit && "cursor-not-allowed",
                      )}
                    >
                      <LabelChip label={label} className={cn(selected && "ring-1 ring-primary")} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This plan has no labels yet.</p>
            )}
          </Field>

          <Field label={draft.checklist.length ? `Steps — ${done}/${draft.checklist.length} done` : "Steps"}>
            <div className="space-y-1.5">
              {draft.checklist.length === 0 && canEdit && (
                <p className="text-xs text-muted-foreground">Break this task into steps and tick them off as you go.</p>
              )}
              {draft.checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.is_complete}
                    aria-label={item.title}
                    disabled={!canEdit}
                    onClick={() =>
                      patch({
                        checklist: draft.checklist.map((c, j) => (i === j ? { ...c, is_complete: !c.is_complete } : c)),
                      })
                    }
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      item.is_complete ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                    )}
                  >
                    {item.is_complete ? <Check className="h-3 w-3" aria-hidden /> : null}
                  </button>
                  <span className={cn("min-w-0 flex-1 text-sm", item.is_complete && "text-muted-foreground line-through")}>
                    {item.title}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => patch({ checklist: draft.checklist.filter((_, j) => j !== i) })}
                      aria-label={`Remove ${item.title}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}

              {canEdit ? (
                <div className="flex gap-2">
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newItem.trim()) {
                        e.preventDefault();
                        patch({ checklist: [...draft.checklist, { title: newItem.trim(), is_complete: false }] });
                        setNewItem("");
                      }
                    }}
                    placeholder="Add an item…"
                    aria-label="New checklist item"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!newItem.trim()}
                    aria-label="Add checklist item"
                    onClick={() => {
                      patch({ checklist: [...draft.checklist, { title: newItem.trim(), is_complete: false }] });
                      setNewItem("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </Field>

          <Field label="Description">
            <Textarea value={draft.description} onChange={(e) => patch({ description: e.target.value })} disabled={!canEdit} rows={3} />
          </Field>

          <Field label="Notes">
            <Textarea value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} disabled={!canEdit} rows={2} />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
            <Label htmlFor="milestone" className="flex items-center gap-2 text-sm font-medium">
              <Flag className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              Milestone
            </Label>
            <Switch
              id="milestone"
              checked={draft.is_milestone}
              onCheckedChange={(v) => patch({ is_milestone: v })}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background p-4">
          {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
          {confirmDelete ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">Delete this task? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={onDelete} disabled={saving}>
                  {saving ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          ) : (
            // Left-aligned on purpose: the Steward FAB is fixed to the bottom-right
            // and was sitting on top of Save.
            <div className="flex items-center gap-2 pr-16">
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
              {canEdit ? (
                <Button size="sm" onClick={() => onSave(draft)} disabled={saving || !draft.title.trim()}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
