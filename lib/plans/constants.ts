import {
  BookOpen,
  Briefcase,
  CalendarRange,
  CircleDashed,
  CircleCheck,
  CirclePause,
  CircleSlash,
  ClipboardList,
  FolderKanban,
  Hammer,
  LayoutGrid,
  Megaphone,
  Rocket,
  Sparkles,
  Target,
  Timer,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PlanMemberRole, PlanType, PlanView, TaskPriority, TaskStatus } from "./types";

// Plan Builder presentation constants.
//
// Colour rule: the MJG palette is gold + ink + warm neutrals. There is deliberately
// NO green anywhere in here — completion is signalled by an icon and a strikethrough,
// not by colour, which also satisfies the spec's non-colour status indicators.
// Every swatch carries an explicit dark variant.

export const PLAN_COLORS = [
  { value: "gold", label: "Gold", swatch: "bg-amber-400", chip: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/30" },
  { value: "sand", label: "Sand", swatch: "bg-stone-300", chip: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-400/15 dark:text-stone-200 dark:border-stone-400/30" },
  { value: "clay", label: "Clay", swatch: "bg-rose-400", chip: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-400/15 dark:text-rose-200 dark:border-rose-400/30" },
  { value: "plum", label: "Plum", swatch: "bg-purple-400", chip: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-400/15 dark:text-purple-200 dark:border-purple-400/30" },
  { value: "slate", label: "Slate", swatch: "bg-slate-400", chip: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-400/15 dark:text-slate-200 dark:border-slate-400/30" },
  { value: "ink", label: "Ink", swatch: "bg-neutral-700", chip: "bg-neutral-200 text-neutral-800 border-neutral-400 dark:bg-neutral-400/15 dark:text-neutral-200 dark:border-neutral-400/30" },
] as const;

export type PlanColor = (typeof PLAN_COLORS)[number]["value"];

export function planColor(value: string | null | undefined) {
  return PLAN_COLORS.find((c) => c.value === value) ?? PLAN_COLORS[0];
}

export const PLAN_ICONS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "clipboard-list", label: "Checklist", icon: ClipboardList },
  { value: "folder-kanban", label: "Board", icon: FolderKanban },
  { value: "calendar-range", label: "Schedule", icon: CalendarRange },
  { value: "rocket", label: "Launch", icon: Rocket },
  { value: "hammer", label: "Build", icon: Hammer },
  { value: "megaphone", label: "Campaign", icon: Megaphone },
  { value: "users-round", label: "Team", icon: UsersRound },
  { value: "target", label: "Goal", icon: Target },
  { value: "briefcase", label: "Client", icon: Briefcase },
  { value: "book-open", label: "Guide", icon: BookOpen },
  { value: "layout-grid", label: "General", icon: LayoutGrid },
  { value: "sparkles", label: "Idea", icon: Sparkles },
];

export function planIcon(value: string | null | undefined): LucideIcon {
  return PLAN_ICONS.find((i) => i.value === value)?.icon ?? ClipboardList;
}

export const TASK_STATUSES: Array<{ value: TaskStatus; label: string; icon: LucideIcon; chip: string }> = [
  { value: "not_started", label: "Not started", icon: CircleDashed, chip: "bg-muted text-muted-foreground border-border" },
  { value: "in_progress", label: "In progress", icon: Timer, chip: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/30" },
  { value: "waiting", label: "Waiting", icon: CirclePause, chip: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-400/15 dark:text-stone-200 dark:border-stone-400/30" },
  { value: "blocked", label: "Blocked", icon: CircleSlash, chip: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-400/15 dark:text-rose-200 dark:border-rose-400/30" },
  { value: "complete", label: "Complete", icon: CircleCheck, chip: "bg-secondary text-secondary-foreground border-border" },
];

export function taskStatus(value: string | null | undefined) {
  return TASK_STATUSES.find((s) => s.value === value) ?? TASK_STATUSES[0];
}

export const TASK_PRIORITIES: Array<{ value: TaskPriority; label: string; chip: string }> = [
  { value: "low", label: "Low", chip: "bg-muted text-muted-foreground border-border" },
  { value: "medium", label: "Medium", chip: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-400/15 dark:text-stone-200 dark:border-stone-400/30" },
  { value: "high", label: "High", chip: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/30" },
  { value: "urgent", label: "Urgent", chip: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-400/15 dark:text-rose-200 dark:border-rose-400/30" },
];

export function taskPriority(value: string | null | undefined) {
  return TASK_PRIORITIES.find((p) => p.value === value) ?? TASK_PRIORITIES[1];
}

// Stored values stay "board"/"grid" (existing rows use them); the labels are what
// people actually call these views.
export const PLAN_VIEWS: Array<{ value: PlanView; label: string; description: string }> = [
  { value: "board", label: "Kanban", description: "Columns you can drag tasks between." },
  { value: "grid", label: "Table", description: "A spreadsheet-style grid for editing details fast." },
  { value: "list", label: "List", description: "A compact checklist, grouped and scannable." },
  { value: "calendar", label: "Calendar", description: "Tasks laid out by due date." },
];

// A plan started from scratch gets these columns. Without them a new plan opens
// with no columns at all — and therefore nowhere to add a task. These are also what
// the create-plan preview shows for a Basic plan, so the two must agree.
export const DEFAULT_SCRATCH_GROUPS = [
  { key: "todo", name: "To Do" },
  { key: "doing", name: "In Progress" },
  { key: "waiting", name: "Waiting" },
  { key: "done", name: "Completed" },
] as const;

export const PLAN_MEMBER_ROLES: Array<{ value: PlanMemberRole; label: string; description: string }> = [
  { value: "owner", label: "Owner", description: "Full control, including settings and members." },
  { value: "editor", label: "Editor", description: "Create and edit any task." },
  { value: "member", label: "Member", description: "Create and edit tasks." },
  { value: "viewer", label: "Viewer", description: "Read-only." },
];

// What each plan type advertises in the create-plan preview panel. Premium's extra
// views are Phase 3+; the flag currently gates plan creation and marks the record.
export const PLAN_TYPE_FEATURES: Record<PlanType, { views: string[]; features: string[] }> = {
  basic: {
    views: ["Board", "Grid"],
    features: ["Tasks and groups", "Assignees and labels", "Priority and status", "Dates and checklists", "Search, filter, sort and group"],
  },
  premium: {
    views: ["Board", "Grid", "Timeline (coming soon)", "People (coming soon)", "Goals (coming soon)"],
    features: ["Everything in Basic", "Dependencies and milestones", "Goals and sprints", "Custom fields", "Advanced reporting"],
  },
};

export const TEMPLATE_SOURCES = [
  { value: "app", label: "App Templates" },
  { value: "shared", label: "Shared" },
  { value: "mine", label: "Created by Me" },
] as const;
