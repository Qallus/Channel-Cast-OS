// Server-side data layer for Plan Builder, backed by the JSONB CRM store.
// Plans embed groups/labels/members; tasks embed assignees/labels/checklist.
import { deleteRecord, listRecords, upsertRecords } from "@/lib/server/crm-db";
import { PlanAccessError, computeAccess, type PlanActor } from "./access";
import { DEFAULT_SCRATCH_GROUPS } from "./constants";
import { findTemplate } from "./templates";
import type {
  ChecklistItem, Plan, PlanGroup, PlanMemberRole, PlanPerson, PlanSummary, PlanTaskDetail,
  PlanWorkspaceData, TaskPriority, TaskStatus, TemplateData,
} from "./types";

const TASK_STATUSES = new Set<TaskStatus>(["not_started", "in_progress", "waiting", "blocked", "complete"]);
const TASK_PRIORITIES = new Set<TaskPriority>(["low", "medium", "high", "urgent"]);
const PLAN_VIEWS = new Set(["grid", "board", "list", "calendar"]);
const PLAN_VISIBILITIES = new Set(["private", "team"]);
const PLAN_COLOR_VALUES = new Set(["gold", "sand", "clay", "plum", "slate", "ink"]);

const now = () => new Date().toISOString();
type Rec = { id: string } & Record<string, unknown>;
const asRec = <T,>(v: T) => v as unknown as Rec;

function genId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rnd}`;
}

function slugify(name: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return `${base || "plan"}-${Math.random().toString(36).slice(2, 7)}`;
}

function optionalDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  return value.trim();
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function allPlans(): Promise<Plan[]> {
  return (await listRecords("plans")) as unknown as Plan[];
}
async function allTasks(): Promise<PlanTaskDetail[]> {
  return (await listRecords("plan_tasks")) as unknown as PlanTaskDetail[];
}

export async function loadPlanById(id: string): Promise<Plan | null> {
  return (await allPlans()).find((p) => p.id === id) ?? null;
}

// ── People (team members + the current user) ───────────────────────────────────

export async function listPeople(actor: PlanActor): Promise<PlanPerson[]> {
  const self: PlanPerson = { id: actor.id, name: actor.name || actor.email || "You", email: actor.email || "" };
  let team: PlanPerson[] = [];
  try {
    const rows = await listRecords("team_members");
    team = rows.map((r) => ({
      id: String(r.id),
      name: String((r.name as string) || (r.display_name as string) || (r.email as string) || "Member"),
      email: String((r.email as string) || ""),
    }));
  } catch { /* no team collection yet */ }
  const seen = new Set([self.id]);
  const out = [self];
  for (const p of team) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
  return out;
}

// ── Reads ──────────────────────────────────────────────────────────────────────

export async function listPlansForActor(actor: PlanActor, includeArchived = false): Promise<PlanSummary[]> {
  const plans = (await allPlans()).filter((p) => includeArchived || !p.archived_at);
  const tasks = await allTasks();

  const visible = plans.filter((plan) => {
    const memberRole = plan.members?.find((m) => m.user_id === actor.id)?.role ?? null;
    return computeAccess(plan, memberRole, actor).canView;
  });

  return visible
    .map((plan) => {
      const planTasks = tasks.filter((t) => t.plan_id === plan.id && !t.archived_at);
      const memberRole = plan.members?.find((m) => m.user_id === actor.id)?.role ?? null;
      return {
        ...plan,
        task_count: planTasks.length,
        completed_count: planTasks.filter((t) => t.status === "complete").length,
        member_count: plan.members?.length ?? 0,
        owner: { id: plan.owner_id, name: plan.owner_name || "Owner", email: plan.owner_email || "" },
        can_manage: computeAccess(plan, memberRole, actor).canManage,
      };
    })
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
}

export async function loadPlanWorkspace(planId: string, actor: PlanActor): Promise<PlanWorkspaceData | null> {
  const plan = await loadPlanById(planId);
  if (!plan) return null;
  const memberRole = plan.members?.find((m) => m.user_id === actor.id)?.role ?? null;
  const access = computeAccess(plan, memberRole, actor);
  if (!access.canView) return null;

  const tasks = (await allTasks())
    .filter((t) => t.plan_id === planId && !t.archived_at)
    .sort((a, b) => a.position - b.position);
  const people = await listPeople(actor);
  const peopleById = new Map(people.map((p) => [p.id, p]));

  return {
    plan,
    groups: [...(plan.groups ?? [])].sort((a, b) => a.position - b.position),
    labels: [...(plan.labels ?? [])].sort((a, b) => a.position - b.position),
    tasks,
    members: (plan.members ?? []).map((m) => ({ user_id: m.user_id, role: m.role, person: peopleById.get(m.user_id) ?? (m.name ? { id: m.user_id, name: m.name, email: m.email || "" } : null) })),
    people,
    access,
  };
}

async function requireAccess(planId: string, actor: PlanActor, level: keyof ReturnType<typeof computeAccess>, denial: string): Promise<Plan> {
  const plan = await loadPlanById(planId);
  if (!plan) throw new PlanAccessError("Plan not found.", 404);
  const memberRole = plan.members?.find((m) => m.user_id === actor.id)?.role ?? null;
  const access = computeAccess(plan, memberRole, actor);
  if (!access.canView) throw new PlanAccessError("Plan not found.", 404);
  if (!access[level]) throw new PlanAccessError(denial, 403);
  return plan;
}
export const requirePlanEdit = (planId: string, actor: PlanActor) => requireAccess(planId, actor, "canEdit", "You have read-only access to this plan.");
export const requirePlanManage = (planId: string, actor: PlanActor) => requireAccess(planId, actor, "canManage", "Only the plan owner can do that.");

// ── Create plan (+ template groups/tasks) ──────────────────────────────────────

export type CreatePlanInput = {
  name: string;
  description?: string | null;
  planType: "basic" | "premium";
  visibility: "private" | "team";
  defaultView: "grid" | "board" | "list" | "calendar";
  color: string;
  icon: string;
  startDate?: string | null;
  targetDate?: string | null;
  memberIds?: string[];
  templateId?: string | null;
};

export async function createPlan(actor: PlanActor, input: CreatePlanInput): Promise<string> {
  const name = (input.name ?? "").trim();
  if (!name) throw new PlanAccessError("Plan name is required.", 400);
  if (name.length > 120) throw new PlanAccessError("Plan name must be 120 characters or fewer.", 400);

  const template = findTemplate(input.templateId);
  const templateData: TemplateData = template?.template_data ?? { groups: DEFAULT_SCRATCH_GROUPS.map((g) => ({ key: g.key, name: g.name })) };
  const startDate = optionalDate(input.startDate);

  // Groups (keyed so template tasks can resolve their column).
  const groupIdByKey = new Map<string, string>();
  const groups: PlanGroup[] = (templateData.groups ?? []).map((g, i) => {
    const id = genId("grp");
    if (g.key) groupIdByKey.set(g.key, id);
    return { id, name: g.name, description: g.description ?? null, position: i, color: g.color ?? null, is_collapsed: false };
  });

  const labels = (templateData.labels ?? []).map((l, i) => ({ id: genId("lbl"), name: l.name, color: l.color ?? "gold", position: i }));

  // People for member metadata.
  const people = await listPeople(actor);
  const personById = new Map(people.map((p) => [p.id, p]));
  const memberIds = [...new Set(input.memberIds ?? [])].filter((id) => id !== actor.id);
  const members = [
    { user_id: actor.id, name: actor.name, email: actor.email, role: "owner" as PlanMemberRole },
    ...memberIds.map((id) => { const p = personById.get(id); return { user_id: id, name: p?.name ?? null, email: p?.email ?? null, role: "member" as PlanMemberRole }; }),
  ];

  const ts = now();
  const plan: Plan = {
    id: genId("plan"),
    name,
    slug: slugify(name),
    description: (input.description ?? "").trim() || null,
    plan_type: input.planType === "premium" ? "premium" : "basic",
    visibility: PLAN_VISIBILITIES.has(input.visibility) ? input.visibility : "team",
    status: "active",
    owner_id: actor.id,
    owner_name: actor.name,
    owner_email: actor.email,
    default_view: PLAN_VIEWS.has(input.defaultView) ? input.defaultView : "board",
    color: PLAN_COLOR_VALUES.has(input.color) ? input.color : "gold",
    icon: (input.icon ?? "clipboard-list").trim() || "clipboard-list",
    cover_url: null,
    start_date: startDate,
    target_date: optionalDate(input.targetDate),
    template_id: template?.id ?? null,
    template_slug: template?.slug ?? null,
    settings: {},
    groups,
    labels,
    members,
    created_by: actor.id,
    created_at: ts,
    updated_at: ts,
    archived_at: null,
  };
  await upsertRecords("plans", [asRec(plan)]);

  // Template tasks.
  const tasks: PlanTaskDetail[] = (templateData.tasks ?? []).map((t, i) => {
    const start = startDate && typeof t.start_offset_days === "number" ? addDays(startDate, t.start_offset_days) : null;
    const due = startDate && typeof t.due_offset_days === "number" ? addDays(startDate, t.due_offset_days) : null;
    return {
      id: genId("task"),
      plan_id: plan.id,
      group_id: t.group_key ? groupIdByKey.get(t.group_key) ?? null : null,
      title: t.title,
      description: t.description ?? null,
      notes: null,
      status: t.status && TASK_STATUSES.has(t.status) ? t.status : "not_started",
      priority: t.priority && TASK_PRIORITIES.has(t.priority) ? t.priority : "medium",
      progress: 0,
      start_date: start,
      due_date: due,
      estimated_minutes: null,
      is_milestone: Boolean(t.is_milestone),
      position: i,
      assignee_ids: [],
      label_ids: [],
      checklist: (t.checklist ?? []).map((title, j) => ({ id: genId("ck"), title, is_complete: false, position: j })),
      created_by: actor.id,
      completed_by: null,
      completed_at: null,
      created_at: ts,
      updated_at: ts,
      archived_at: null,
    };
  });
  if (tasks.length) await upsertRecords("plan_tasks", tasks.map(asRec));

  return plan.id;
}

export async function updatePlan(plan: Plan, patch: Record<string, unknown>): Promise<Plan> {
  const next = { ...plan, updated_at: now() };
  if (typeof patch.name === "string" && patch.name.trim()) next.name = patch.name.trim().slice(0, 120);
  if ("description" in patch) next.description = String(patch.description ?? "").trim() || null;
  if (typeof patch.visibility === "string" && PLAN_VISIBILITIES.has(patch.visibility)) next.visibility = patch.visibility as Plan["visibility"];
  if (typeof patch.default_view === "string" && PLAN_VIEWS.has(patch.default_view)) next.default_view = patch.default_view as Plan["default_view"];
  if (typeof patch.color === "string" && PLAN_COLOR_VALUES.has(patch.color)) next.color = patch.color;
  if (typeof patch.icon === "string" && patch.icon.trim()) next.icon = patch.icon.trim();
  if ("start_date" in patch) next.start_date = optionalDate(patch.start_date);
  if ("target_date" in patch) next.target_date = optionalDate(patch.target_date);
  if (typeof patch.archived === "boolean") {
    next.archived_at = patch.archived ? now() : null;
    next.status = patch.archived ? "archived" : "active";
  }
  await upsertRecords("plans", [asRec(next)]);
  return next;
}

export async function deletePlan(planId: string): Promise<void> {
  const tasks = (await allTasks()).filter((t) => t.plan_id === planId);
  await Promise.all(tasks.map((t) => deleteRecord("plan_tasks", t.id)));
  await deleteRecord("plans", planId);
}

// ── Groups ─────────────────────────────────────────────────────────────────────

export async function createGroup(plan: Plan, name: string): Promise<Plan> {
  const trimmed = name.trim();
  if (!trimmed) throw new PlanAccessError("Group name is required.", 400);
  const position = (plan.groups ?? []).reduce((max, g) => Math.max(max, g.position), -1) + 1;
  const group: PlanGroup = { id: genId("grp"), name: trimmed.slice(0, 80), description: null, position, color: null, is_collapsed: false };
  const next = { ...plan, groups: [...(plan.groups ?? []), group], updated_at: now() };
  await upsertRecords("plans", [asRec(next)]);
  return next;
}

export async function updateGroup(plan: Plan, groupId: string, patch: Record<string, unknown>): Promise<Plan> {
  const next = {
    ...plan,
    groups: (plan.groups ?? []).map((g) => g.id === groupId ? {
      ...g,
      name: typeof patch.name === "string" && patch.name.trim() ? patch.name.trim().slice(0, 80) : g.name,
      is_collapsed: "is_collapsed" in patch ? Boolean(patch.is_collapsed) : g.is_collapsed,
    } : g),
    updated_at: now(),
  };
  await upsertRecords("plans", [asRec(next)]);
  return next;
}

export async function deleteGroup(plan: Plan, groupId: string): Promise<Plan> {
  const next = { ...plan, groups: (plan.groups ?? []).filter((g) => g.id !== groupId), updated_at: now() };
  await upsertRecords("plans", [asRec(next)]);
  // Tasks in the deleted group survive as ungrouped.
  const tasks = (await allTasks()).filter((t) => t.plan_id === plan.id && t.group_id === groupId);
  if (tasks.length) await upsertRecords("plan_tasks", tasks.map((t) => asRec({ ...t, group_id: null, updated_at: now() })));
  return next;
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

function normalizeTaskPatch(body: Record<string, unknown>): Partial<PlanTaskDetail> {
  const patch: Partial<PlanTaskDetail> = {};
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 300);
  if ("description" in body) patch.description = String(body.description ?? "").trim() || null;
  if ("notes" in body) patch.notes = String(body.notes ?? "").trim() || null;
  if (typeof body.status === "string" && TASK_STATUSES.has(body.status as TaskStatus)) patch.status = body.status as TaskStatus;
  if (typeof body.priority === "string" && TASK_PRIORITIES.has(body.priority as TaskPriority)) patch.priority = body.priority as TaskPriority;
  if (body.progress !== undefined) patch.progress = Math.max(0, Math.min(100, Number(body.progress) || 0));
  if ("start_date" in body) patch.start_date = optionalDate(body.start_date);
  if ("due_date" in body) patch.due_date = optionalDate(body.due_date);
  if ("group_id" in body) patch.group_id = body.group_id ? String(body.group_id) : null;
  if ("is_milestone" in body) patch.is_milestone = Boolean(body.is_milestone);
  return patch;
}

async function planTasks(planId: string): Promise<PlanTaskDetail[]> {
  return (await allTasks()).filter((t) => t.plan_id === planId && !t.archived_at);
}

export async function createTask(actor: PlanActor, planId: string, body: Record<string, unknown>): Promise<PlanTaskDetail> {
  const title = String(body.title ?? "").trim();
  if (!title) throw new PlanAccessError("Task title is required.", 400);
  const tasks = await planTasks(planId);
  const position = tasks.reduce((max, t) => Math.max(max, t.position), -1) + 1;
  const ts = now();
  const task: PlanTaskDetail = {
    id: genId("task"), plan_id: planId, group_id: body.group_id ? String(body.group_id) : null,
    title, description: null, notes: null,
    status: (body.status as TaskStatus) && TASK_STATUSES.has(body.status as TaskStatus) ? (body.status as TaskStatus) : "not_started",
    priority: (body.priority as TaskPriority) && TASK_PRIORITIES.has(body.priority as TaskPriority) ? (body.priority as TaskPriority) : "medium",
    progress: 0, start_date: null, due_date: null, estimated_minutes: null, is_milestone: false, position,
    assignee_ids: Array.isArray(body.assignee_ids) ? body.assignee_ids.map(String) : [],
    label_ids: Array.isArray(body.label_ids) ? body.label_ids.map(String) : [],
    checklist: [], created_by: actor.id, completed_by: null, completed_at: null, created_at: ts, updated_at: ts, archived_at: null,
  };
  await upsertRecords("plan_tasks", [asRec(task)]);
  return task;
}

export async function updateTask(actor: PlanActor, planId: string, taskId: string, body: Record<string, unknown>): Promise<PlanTaskDetail> {
  const tasks = await allTasks();
  const before = tasks.find((t) => t.id === taskId && t.plan_id === planId);
  if (!before) throw new PlanAccessError("Task not found.", 404);

  const patch = normalizeTaskPatch(body);
  if (patch.status && patch.status !== before.status) {
    if (patch.status === "complete") {
      patch.completed_at = now(); patch.completed_by = actor.id;
      if (body.progress === undefined) patch.progress = 100;
    } else {
      patch.completed_at = null; patch.completed_by = null;
      if (body.progress === undefined && before.status === "complete") patch.progress = 0;
    }
  }
  if (Array.isArray(body.assignee_ids)) patch.assignee_ids = [...new Set(body.assignee_ids.map(String))];
  if (Array.isArray(body.label_ids)) patch.label_ids = [...new Set(body.label_ids.map(String))];
  if (Array.isArray(body.checklist)) {
    patch.checklist = body.checklist.flatMap((item, i) => {
      const rec = item as { title?: unknown; is_complete?: unknown };
      const title = String(rec?.title ?? "").trim();
      return title ? [{ id: genId("ck"), title: title.slice(0, 300), is_complete: Boolean(rec?.is_complete), position: i }] : [];
    });
  }

  const next = { ...before, ...patch, updated_at: now() };
  await upsertRecords("plan_tasks", [asRec(next)]);
  return next;
}

export async function moveTask(planId: string, taskId: string, targetGroupId: string | null, targetIndex: number): Promise<PlanTaskDetail> {
  const all = await allTasks();
  const task = all.find((t) => t.id === taskId && t.plan_id === planId);
  if (!task) throw new PlanAccessError("Task not found.", 404);
  const sourceGroupId = task.group_id;

  const inPlan = all.filter((t) => t.plan_id === planId && !t.archived_at).sort((a, b) => a.position - b.position);
  const target = inPlan.filter((t) => t.group_id === targetGroupId && t.id !== taskId).map((t) => t.id);
  const index = Math.max(0, Math.min(Number.isFinite(targetIndex) ? targetIndex : target.length, target.length));
  target.splice(index, 0, taskId);

  const updates = new Map<string, PlanTaskDetail>();
  target.forEach((id, i) => {
    const t = all.find((x) => x.id === id)!;
    updates.set(id, { ...t, group_id: targetGroupId, position: i, updated_at: now() });
  });
  if (sourceGroupId !== targetGroupId) {
    inPlan.filter((t) => t.group_id === sourceGroupId && t.id !== taskId).forEach((t, i) => {
      updates.set(t.id, { ...t, position: i, updated_at: now() });
    });
  }
  await upsertRecords("plan_tasks", [...updates.values()].map(asRec));
  return updates.get(taskId)!;
}

export async function deleteTask(planId: string, taskId: string): Promise<void> {
  const task = (await allTasks()).find((t) => t.id === taskId && t.plan_id === planId);
  if (!task) throw new PlanAccessError("Task not found.", 404);
  await deleteRecord("plan_tasks", taskId);
}

export type { ChecklistItem };
