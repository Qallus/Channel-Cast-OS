"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Columns3, Eye, LayoutGrid, ListChecks, Plus, Rows3, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BoardView } from "./views/board-view";
import { GridView } from "./views/grid-view";
import { ListView } from "./views/list-view";
import { CalendarView } from "./views/calendar-view";
import { TaskDetailDrawer, type TaskDraft } from "./tasks/task-detail-drawer";
import { MemberAvatarStack } from "./shared/member-avatar-stack";
import { planColor, planIcon, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/plans/constants";
import {
  applyFilters,
  applySort,
  BLANK_FILTERS,
  buildColumns,
  hasActiveFilters,
  type BoardColumn,
  type GroupBy,
  type PlanFilters,
  type SortBy,
} from "@/lib/plans/view-model";
import { cn } from "@/lib/utils";
import type { PlanTaskDetail, PlanView, PlanWorkspaceData, TaskPriority, TaskStatus } from "@/lib/plans/types";

const ANY = "__any__";

export function PlanWorkspace({ data, initialView }: { data: PlanWorkspaceData; initialView: PlanView }) {
  const router = useRouter();
  const { plan, groups, labels, people, access } = data;

  const [tasks, setTasks] = useState<PlanTaskDetail[]>(data.tasks);
  const [view, setView] = useState<PlanView>(initialView);
  const [groupBy, setGroupBy] = useState<GroupBy>("group");
  const [sortBy, setSortBy] = useState<SortBy>("manual");
  const [filters, setFilters] = useState<PlanFilters>(BLANK_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<PlanTaskDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", groupId: "" });
  const [deletingGroup, setDeletingGroup] = useState<BoardColumn | null>(null);

  // Re-seed when the server component re-renders (e.g. after router.refresh()).
  useEffect(() => setTasks(data.tasks), [data.tasks]);

  // Keep the chosen view in the URL so it survives a refresh and can be linked to.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("view") !== view) {
      url.searchParams.set("view", view);
      window.history.replaceState(null, "", url.toString());
    }
  }, [view]);

  const columns = useMemo(() => {
    const filtered = applyFilters(tasks, filters);
    const sorted = applySort(filtered, sortBy);
    return buildColumns(sorted, groupBy, { groups, labels, people });
  }, [tasks, filters, sortBy, groupBy, groups, labels, people]);

  const visibleCount = useMemo(() => applyFilters(tasks, filters).length, [tasks, filters]);
  const canEdit = access.canEdit;

  // Keep the open drawer in sync with the record it's showing.
  useEffect(() => {
    if (!selected) return;
    const fresh = tasks.find((t) => t.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
    if (!fresh) setSelected(null);
  }, [tasks, selected]);

  async function send(url: string, method: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message ?? "Something went wrong.");
    return data;
  }

  // Optimistic write with rollback: apply locally, call the API, and put the old
  // state back if it fails so the UI never claims a change that didn't land.
  async function mutate(optimistic: (current: PlanTaskDetail[]) => PlanTaskDetail[], call: () => Promise<unknown>) {
    const rollback = tasks;
    setTasks(optimistic(tasks));
    setError(null);
    setSaving(true);
    try {
      await call();
    } catch (e) {
      setTasks(rollback);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function localMove(current: PlanTaskDetail[], taskId: string, groupId: string | null, index: number) {
    const task = current.find((t) => t.id === taskId);
    if (!task) return current;

    const rest = current.filter((t) => t.id !== taskId);
    const target = rest.filter((t) => t.group_id === groupId).sort((a, b) => a.position - b.position);
    target.splice(Math.max(0, Math.min(index, target.length)), 0, { ...task, group_id: groupId });

    const renumbered = new Map(target.map((t, i) => [t.id, { ...t, group_id: groupId, position: i }]));
    if (task.group_id !== groupId) {
      rest
        .filter((t) => t.group_id === task.group_id)
        .sort((a, b) => a.position - b.position)
        .forEach((t, i) => renumbered.set(t.id, { ...t, position: i }));
    }

    return current.map((t) => renumbered.get(t.id) ?? t);
  }

  function onMove(taskId: string, column: BoardColumn, index: number) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !canEdit) return;

    if (groupBy === "group") {
      const groupId = column.groupId;
      if (task.group_id === groupId && task.position === index) return;
      setAnnouncement(`Moved ${task.title} to ${column.title}, position ${index + 1}.`);
      void mutate(
        (current) => localMove(current, taskId, groupId, index),
        () => send(`/api/admin/plans/${plan.id}/tasks/${taskId}/move`, "POST", { groupId, index }),
      );
      return;
    }

    if (groupBy === "status" && column.status && column.status !== task.status) {
      setAnnouncement(`Moved ${task.title} to ${column.title}.`);
      void updateTaskFields(taskId, { status: column.status });
    }
  }

  function updateTaskFields(taskId: string, patch: Partial<PlanTaskDetail> & { status?: TaskStatus; priority?: TaskPriority }) {
    return mutate(
      (current) => current.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      async () => {
        const result = (await send(`/api/admin/plans/${plan.id}/tasks/${taskId}`, "PATCH", patch)) as { task: PlanTaskDetail };
        // The server derives completed_at/progress from status, so reconcile.
        setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, ...result.task, assignee_ids: t.assignee_ids, label_ids: t.label_ids, checklist: t.checklist } : t)));
      },
    );
  }

  async function quickAdd(column: BoardColumn, title: string) {
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { title };
      if (groupBy === "group") body.group_id = column.groupId;
      if (groupBy === "status" && column.status) body.status = column.status;
      if (groupBy === "priority") body.priority = column.key;
      const result = (await send(`/api/admin/plans/${plan.id}/tasks`, "POST", body)) as { task: PlanTaskDetail };
      setTasks((current) => [...current, { ...result.task, assignee_ids: [], label_ids: [], checklist: [] }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTask(draft: TaskDraft) {
    if (!selected) return;
    setError(null);
    setSaving(true);
    try {
      const result = (await send(`/api/admin/plans/${plan.id}/tasks/${selected.id}`, "PATCH", {
        title: draft.title,
        description: draft.description,
        notes: draft.notes,
        status: draft.status,
        priority: draft.priority,
        progress: draft.progress,
        group_id: draft.group_id,
        start_date: draft.start_date || null,
        due_date: draft.due_date || null,
        is_milestone: draft.is_milestone,
        assignee_ids: draft.assignee_ids,
        label_ids: draft.label_ids,
        checklist: draft.checklist,
      })) as { task: PlanTaskDetail };

      setTasks((current) =>
        current.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                ...result.task,
                assignee_ids: draft.assignee_ids,
                label_ids: draft.label_ids,
                checklist: draft.checklist.map((c, i) => ({ id: `${selected.id}-${i}`, task_id: selected.id, position: i, ...c })),
              }
            : t,
        ),
      );
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTask() {
    if (!selected) return;
    const id = selected.id;
    setError(null);
    setSaving(true);
    try {
      await send(`/api/admin/plans/${plan.id}/tasks/${id}`, "DELETE", {});
      setTasks((current) => current.filter((t) => t.id !== id));
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task delete failed.");
    } finally {
      setSaving(false);
    }
  }

  // The always-visible "Add task" path. Board/List columns also have their own
  // inline quick-add, but that's only discoverable once columns exist — this
  // button works from any view, including an empty plan.
  async function addTaskFromDialog() {
    const title = newTask.title.trim();
    if (!title) return;
    setError(null);
    setSaving(true);
    try {
      const groupId = newTask.groupId || groups[0]?.id || null;
      const result = (await send(`/api/admin/plans/${plan.id}/tasks`, "POST", { title, group_id: groupId })) as { task: PlanTaskDetail };
      setTasks((current) => [...current, { ...result.task, assignee_ids: [], label_ids: [], checklist: [] }]);
      setNewTask({ title: "", groupId: newTask.groupId });
      setAddOpen(false);
      // Open it straight away so dates, assignees and steps are one click on, not a hunt.
      setSelected({ ...result.task, assignee_ids: [], label_ids: [], checklist: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task create failed.");
    } finally {
      setSaving(false);
    }
  }

  function openAddTask(groupId?: string | null) {
    setNewTask({ title: "", groupId: groupId ?? groups[0]?.id ?? "" });
    setAddOpen(true);
  }

  async function addGroup() {
    const name = groupName.trim();
    if (!name) return;
    setError(null);
    try {
      await send(`/api/admin/plans/${plan.id}/groups`, "POST", { name });
      setGroupName("");
      setAddingGroup(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Group create failed.");
    }
  }

  async function deleteGroup() {
    const column = deletingGroup;
    if (!column?.groupId) return;
    setError(null);
    setSaving(true);
    try {
      await send(`/api/admin/plans/${plan.id}/groups/${column.groupId}`, "DELETE", {});
      // plan_groups.id is ON DELETE SET NULL on plan_tasks, so its tasks survive as
      // ungrouped — reflect that locally rather than dropping them from the board.
      setTasks((current) => current.map((t) => (t.group_id === column.groupId ? { ...t, group_id: null } : t)));
      setDeletingGroup(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Group delete failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan() {
    setDeletingPlan(true);
    setError(null);
    try {
      await send(`/api/admin/plans/${plan.id}`, "DELETE", {});
      // Leave before refreshing — this page no longer has a plan to render.
      router.push("/app/admin/plans");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan delete failed.");
      setDeletingPlan(false);
      setConfirmDeletePlan(false);
    }
  }

  const Icon = planIcon(plan.icon);
  const color = planColor(plan.color);
  const memberPeople = data.members.map((m) => m.person).filter(Boolean) as typeof people;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Link
            href="/app/admin/plans"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden /> All plans
          </Link>
          <div className="flex items-start gap-2.5">
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border", color.chip)}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-normal">
                {plan.name}
                {plan.plan_type === "premium" ? (
                  <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                    Premium
                  </span>
                ) : null}
                {!canEdit ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Eye className="h-3 w-3" aria-hidden /> Read only
                  </span>
                ) : null}
              </h1>
              {plan.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{plan.description}</p> : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MemberAvatarStack people={memberPeople} max={4} />
          {access.canManage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeletePlan(true)}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete plan
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-0.5" role="tablist" aria-label="View">
          {(
            [
              { value: "board" as const, label: "Kanban", icon: Columns3 },
              { value: "grid" as const, label: "Table", icon: Rows3 },
              { value: "list" as const, label: "List", icon: ListChecks },
              { value: "calendar" as const, label: "Calendar", icon: CalendarDays },
            ]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={view === option.value}
              onClick={() => setView(option.value)}
              className={cn(
                "inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === option.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <option.icon className="h-3.5 w-3.5" aria-hidden /> {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-44 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search tasks…"
              className="pl-9"
              aria-label="Search tasks"
            />
          </div>

          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="h-9 w-auto min-w-36 gap-1.5 text-xs" aria-label="Group by">
              <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="group">Group by: Group</SelectItem>
              <SelectItem value="status">Group by: Status</SelectItem>
              <SelectItem value="assignee">Group by: Assignee</SelectItem>
              <SelectItem value="priority">Group by: Priority</SelectItem>
              <SelectItem value="label">Group by: Label</SelectItem>
              <SelectItem value="none">Group by: None</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-9 w-auto min-w-32 text-xs" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Sort: Manual</SelectItem>
              <SelectItem value="due_date">Sort: Due date</SelectItem>
              <SelectItem value="priority">Sort: Priority</SelectItem>
              <SelectItem value="title">Sort: Title</SelectItem>
              <SelectItem value="updated_at">Sort: Recently updated</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showFilters || hasActiveFilters(filters) ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters((s) => !s)}
            className="gap-1.5"
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Filters
            {hasActiveFilters(filters) ? <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> : null}
          </Button>

          {canEdit ? (
            <Button size="sm" onClick={() => openAddTask()} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add task
            </Button>
          ) : null}

          {canEdit ? (
            addingGroup ? (
              <Input
                autoFocus
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addGroup();
                  if (e.key === "Escape") {
                    setGroupName("");
                    setAddingGroup(false);
                  }
                }}
                onBlur={() => void addGroup()}
                placeholder="Group name, then Enter"
                aria-label="New group name"
                className="h-9 w-44"
              />
            ) : (
              <Button size="sm" variant="outline" onClick={() => setAddingGroup(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" aria-hidden /> Group
              </Button>
            )
          ) : null}
        </div>
      </div>

      {showFilters ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <Select
            value={filters.assigneeId ?? ANY}
            onValueChange={(v) => setFilters((f) => ({ ...f, assigneeId: v === ANY ? null : v }))}
          >
            <SelectTrigger className="h-8 w-40 text-xs" aria-label="Filter by assignee"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any assignee</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status ?? ANY} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === ANY ? null : (v as TaskStatus) }))}>
            <SelectTrigger className="h-8 w-36 text-xs" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any status</SelectItem>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.priority ?? ANY} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === ANY ? null : (v as TaskPriority) }))}>
            <SelectTrigger className="h-8 w-32 text-xs" aria-label="Filter by priority"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any priority</SelectItem>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {labels.length ? (
            <Select value={filters.labelId ?? ANY} onValueChange={(v) => setFilters((f) => ({ ...f, labelId: v === ANY ? null : v }))}>
              <SelectTrigger className="h-8 w-36 text-xs" aria-label="Filter by label"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any label</SelectItem>
                {labels.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {[
            { key: "overdue" as const, label: "Overdue only" },
            { key: "hideComplete" as const, label: "Hide complete" },
          ].map((toggle) => (
            <button
              key={toggle.key}
              type="button"
              aria-pressed={filters[toggle.key]}
              onClick={() => setFilters((f) => ({ ...f, [toggle.key]: !f[toggle.key] }))}
              className={cn(
                "min-h-[32px] rounded-full border px-3 py-1 text-xs font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filters[toggle.key] ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent/40",
              )}
            >
              {toggle.label}
            </button>
          ))}

          {hasActiveFilters(filters) ? (
            <Button variant="ghost" size="sm" onClick={() => setFilters(BLANK_FILTERS)} className="gap-1.5">
              <X className="h-3.5 w-3.5" aria-hidden /> Clear
            </Button>
          ) : null}

          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {visibleCount} of {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {/* Drag-and-drop outcomes are announced here for screen readers. */}
      <p aria-live="polite" className="sr-only">{announcement}</p>

      {/* An empty plan still renders its columns — the previous empty state replaced
          the board entirely, which hid the very "Add task" it told people to use. */}
      {tasks.length === 0 && canEdit ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 px-6 py-8 text-center">
          <p className="text-sm font-medium">This plan has no tasks yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add your first one — you can set dates, assignees, labels and steps once it exists.
          </p>
          <Button size="sm" onClick={() => openAddTask()} className="mt-3 gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add task
          </Button>
        </div>
      ) : null}

      {view === "board" ? (
        <BoardView
          columns={columns}
          labels={labels}
          people={people}
          canEdit={canEdit}
          // Quick-add only where the new task can inherit the column's meaning.
          allowQuickAdd={groupBy === "group" || groupBy === "status" || groupBy === "priority"}
          onOpenTask={setSelected}
          onMove={onMove}
          onQuickAdd={(column, title) => void quickAdd(column, title)}
          onDeleteGroup={canEdit && groupBy === "group" ? setDeletingGroup : undefined}
        />
      ) : view === "grid" ? (
        <GridView
          columns={columns}
          labels={labels}
          people={people}
          canEdit={canEdit}
          grouped={groupBy !== "none"}
          onOpenTask={setSelected}
          onInlineChange={(task, patch) => void updateTaskFields(task.id, patch)}
        />
      ) : view === "list" ? (
        <ListView
          columns={columns}
          labels={labels}
          people={people}
          canEdit={canEdit}
          grouped={groupBy !== "none"}
          onOpenTask={setSelected}
          onToggleComplete={(task) => void updateTaskFields(task.id, { status: task.status === "complete" ? "not_started" : "complete" })}
          onAddTask={groupBy === "group" ? (column) => openAddTask(column.groupId) : undefined}
        />
      ) : (
        // Calendar shows every task in date order, so it ignores grouping.
        <CalendarView tasks={applySort(applyFilters(tasks, filters), sortBy)} onOpenTask={setSelected} />
      )}

      <Dialog open={Boolean(deletingGroup)} onOpenChange={(open) => !open && !saving && setDeletingGroup(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete “{deletingGroup?.title}”?</DialogTitle>
            <DialogDescription>
              {/* Say what happens to the contents — deleting a column shouldn't feel
                  like it might take the work with it. */}
              {deletingGroup?.tasks.length
                ? `The group is removed. Its ${deletingGroup.tasks.length} task${deletingGroup.tasks.length === 1 ? "" : "s"} are kept and moved to “No group”, so nothing is lost — you can drag them somewhere else afterwards.`
                : "The group is empty, so nothing else changes."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button variant="ghost" onClick={() => setDeletingGroup(null)} disabled={saving}>Cancel</Button>
            <Button variant="destructive" onClick={() => void deleteGroup()} disabled={saving}>
              {saving ? "Deleting…" : "Delete group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(open) => !open && !saving && setAddOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a task</DialogTitle>
            <DialogDescription>It opens straight after, so you can add dates, assignees and steps.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Task</Label>
              <Input
                autoFocus
                value={newTask.title}
                onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && newTask.title.trim()) void addTaskFromDialog(); }}
                placeholder="What needs doing?"
                maxLength={300}
              />
            </div>
            {groups.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Group</Label>
                <Select value={newTask.groupId || groups[0].id} onValueChange={(v) => setNewTask((t) => ({ ...t, groupId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void addTaskFromDialog()} disabled={saving || !newTask.title.trim()}>
              {saving ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeletePlan} onOpenChange={(open) => !open && !deletingPlan && setConfirmDeletePlan(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this plan?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{plan.name}</span> and its {tasks.length} task
              {tasks.length === 1 ? "" : "s"}, groups, labels and activity history will be permanently deleted. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmDeletePlan(false)} disabled={deletingPlan}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void deletePlan()} disabled={deletingPlan}>
              {deletingPlan ? "Deleting…" : "Delete plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailDrawer
        task={selected}
        groups={groups}
        labels={labels}
        people={people}
        canEdit={canEdit}
        saving={saving}
        error={error}
        onSave={(draft) => void saveTask(draft)}
        onDelete={() => void removeTask()}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
