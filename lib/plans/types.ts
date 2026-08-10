// Plan Builder types, adapted for Channel Cast's JSONB CRM store. Groups, labels
// and members are embedded on the plan record; assignees, labels and checklist are
// embedded on each task record (no join tables).

export type PlanType = "basic" | "premium";
export type PlanVisibility = "private" | "team";
export type PlanStatus = "active" | "archived";
export type PlanView = "grid" | "board" | "list" | "calendar";
export type PlanMemberRole = "owner" | "editor" | "member" | "viewer";
export type TaskStatus = "not_started" | "in_progress" | "waiting" | "blocked" | "complete";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TemplateSource = "app" | "shared" | "mine";

export type PlanGroup = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  color: string | null;
  is_collapsed: boolean;
};

export type PlanLabel = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export type PlanMember = {
  user_id: string;
  name: string | null;
  email: string | null;
  role: PlanMemberRole;
};

export type ChecklistItem = {
  id: string;
  title: string;
  is_complete: boolean;
  position: number;
};

// Stored plan record (in the "plans" collection).
export type Plan = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  plan_type: PlanType;
  visibility: PlanVisibility;
  status: PlanStatus;
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  default_view: PlanView;
  color: string;
  icon: string;
  cover_url: string | null;
  start_date: string | null;
  target_date: string | null;
  template_id: string | null;
  template_slug: string | null;
  settings: Record<string, unknown>;
  groups: PlanGroup[];
  labels: PlanLabel[];
  members: PlanMember[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

// Stored task record (in the "plan_tasks" collection). Grid and Board render this
// exact shape from the same fetch — two presentations of one record set.
export type PlanTaskDetail = {
  id: string;
  plan_id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  is_milestone: boolean;
  position: number;
  assignee_ids: string[];
  label_ids: string[];
  checklist: ChecklistItem[];
  created_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type PlanTemplate = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  category: string;
  plan_type: PlanType;
  visibility: "app" | "shared" | "private";
  preview_url: string | null;
  badge: string | null;
  template_data: TemplateData;
  is_system_template: boolean;
  created_by: string | null;
};

export type TemplateData = {
  views?: PlanView[];
  groups?: Array<{ key?: string; name: string; description?: string; color?: string }>;
  labels?: Array<{ name: string; color?: string }>;
  tasks?: Array<{
    title: string;
    group_key?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    start_offset_days?: number;
    due_offset_days?: number;
    is_milestone?: boolean;
    checklist?: string[];
  }>;
};

export type PlanPerson = {
  id: string;
  name: string;
  email: string;
};

export type PlanAccess = {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
};

export type PlanWorkspaceData = {
  plan: Plan;
  groups: PlanGroup[];
  labels: PlanLabel[];
  tasks: PlanTaskDetail[];
  members: Array<{ user_id: string; role: PlanMemberRole; person: PlanPerson | null }>;
  people: PlanPerson[];
  access: PlanAccess;
};

export type PlanSummary = Plan & {
  task_count: number;
  completed_count: number;
  member_count: number;
  owner: PlanPerson | null;
  can_manage: boolean;
};
