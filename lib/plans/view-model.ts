import { TASK_PRIORITIES, TASK_STATUSES } from "./constants";
import type { PlanGroup, PlanLabel, PlanPerson, PlanTaskDetail, TaskPriority, TaskStatus } from "./types";

// Pure view-model helpers shared by the Board and the Grid.
//
// These are the ONLY thing that differs between the two views: both render the same
// PlanTaskDetail[] the server loaded, so filtering, sorting and grouping can never
// make them disagree — and none of it mutates the underlying records.

export type GroupBy = "group" | "status" | "assignee" | "priority" | "label" | "none";
export type SortBy = "manual" | "due_date" | "priority" | "title" | "updated_at";

export type PlanFilters = {
  search: string;
  assigneeId: string | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  labelId: string | null;
  overdue: boolean;
  hideComplete: boolean;
};

export const BLANK_FILTERS: PlanFilters = {
  search: "",
  assigneeId: null,
  status: null,
  priority: null,
  labelId: null,
  overdue: false,
  hideComplete: false,
};

export function hasActiveFilters(filters: PlanFilters) {
  return Boolean(
    filters.search.trim() || filters.assigneeId || filters.status || filters.priority || filters.labelId || filters.overdue || filters.hideComplete,
  );
}

export type BoardColumn = {
  key: string;
  title: string;
  // Set only when grouping by group/status — the two groupings a drop can write back.
  groupId: string | null;
  status: TaskStatus | null;
  droppable: boolean;
  tasks: PlanTaskDetail[];
};

function todayYmd() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function applyFilters(tasks: PlanTaskDetail[], filters: PlanFilters): PlanTaskDetail[] {
  const query = filters.search.trim().toLowerCase();
  const today = todayYmd();

  return tasks.filter((task) => {
    if (query) {
      const haystack = [task.title, task.description ?? "", task.notes ?? "", ...task.checklist.map((c) => c.title)]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.assigneeId && !task.assignee_ids.includes(filters.assigneeId)) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.labelId && !task.label_ids.includes(filters.labelId)) return false;
    if (filters.hideComplete && task.status === "complete") return false;
    if (filters.overdue) {
      if (task.status === "complete") return false;
      if (!task.due_date || task.due_date >= today) return false;
    }
    return true;
  });
}

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function applySort(tasks: PlanTaskDetail[], sortBy: SortBy): PlanTaskDetail[] {
  const sorted = [...tasks];
  switch (sortBy) {
    case "due_date":
      // Unscheduled tasks sort last rather than first, which is what "by due date" means.
      return sorted.sort((a, b) => {
        if (!a.due_date && !b.due_date) return a.position - b.position;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    case "priority":
      return sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.position - b.position);
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "updated_at":
      return sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    case "manual":
    default:
      return sorted.sort((a, b) => a.position - b.position);
  }
}

export const UNGROUPED_KEY = "__ungrouped__";

export function buildColumns(
  tasks: PlanTaskDetail[],
  groupBy: GroupBy,
  context: { groups: PlanGroup[]; labels: PlanLabel[]; people: PlanPerson[] },
): BoardColumn[] {
  const column = (key: string, title: string, extra: Partial<BoardColumn> = {}): BoardColumn => ({
    key,
    title,
    groupId: null,
    status: null,
    droppable: false,
    tasks: [],
    ...extra,
  });

  switch (groupBy) {
    case "group": {
      const columns = context.groups.map((g) => column(g.id, g.name, { groupId: g.id, droppable: true }));
      const ungrouped = column(UNGROUPED_KEY, "No group", { groupId: null, droppable: true });
      for (const task of tasks) {
        const target = columns.find((c) => c.groupId === task.group_id) ?? ungrouped;
        target.tasks.push(task);
      }
      // Only show the catch-all column when it has something in it, or when the plan
      // has no groups at all and it's the only place tasks can go.
      return ungrouped.tasks.length || !columns.length ? [...columns, ungrouped] : columns;
    }

    case "status": {
      const columns = TASK_STATUSES.map((s) => column(s.value, s.label, { status: s.value, droppable: true }));
      for (const task of tasks) columns.find((c) => c.status === task.status)?.tasks.push(task);
      return columns;
    }

    case "priority": {
      const columns = TASK_PRIORITIES.map((p) => column(p.value, p.label));
      for (const task of tasks) columns.find((c) => c.key === task.priority)?.tasks.push(task);
      return columns;
    }

    case "assignee": {
      const columns = context.people.map((p) => column(p.id, p.name));
      const unassigned = column(UNGROUPED_KEY, "Unassigned");
      for (const task of tasks) {
        if (!task.assignee_ids.length) unassigned.tasks.push(task);
        // A task with several assignees appears under each of them — the board is a
        // lens, not a partition.
        else for (const id of task.assignee_ids) columns.find((c) => c.key === id)?.tasks.push(task);
      }
      return [...columns.filter((c) => c.tasks.length), unassigned];
    }

    case "label": {
      const columns = context.labels.map((l) => column(l.id, l.name));
      const unlabelled = column(UNGROUPED_KEY, "No label");
      for (const task of tasks) {
        if (!task.label_ids.length) unlabelled.tasks.push(task);
        else for (const id of task.label_ids) columns.find((c) => c.key === id)?.tasks.push(task);
      }
      return [...columns, unlabelled];
    }

    case "none":
    default:
      return [column("all", "All tasks", { tasks: [...tasks] })];
  }
}
