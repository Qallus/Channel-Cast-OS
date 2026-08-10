import type { PlanTemplate } from "./types";

// App-provided starter templates for the create-plan modal. Channel Cast has no
// user-authored templates yet, so the "Shared" and "Created by Me" tabs are empty
// and every template here is a system template.
function tpl(
  t: Omit<PlanTemplate, "preview_url" | "visibility" | "is_system_template" | "created_by" | "plan_type" | "badge"> & { plan_type?: PlanTemplate["plan_type"]; badge?: string | null },
): PlanTemplate {
  return { preview_url: null, visibility: "app", is_system_template: true, created_by: null, plan_type: t.plan_type ?? "basic", badge: t.badge ?? null, ...t };
}

export const APP_TEMPLATES: PlanTemplate[] = [
  tpl({
    id: "tpl-simple", slug: "simple-plan", name: "Simple Plan", category: "Simple Plans", badge: "Recommended",
    description: "A clean To Do → Done board for everyday work.",
    template_data: {
      views: ["board", "grid"],
      groups: [
        { key: "todo", name: "To Do" }, { key: "doing", name: "In Progress" },
        { key: "waiting", name: "Waiting" }, { key: "done", name: "Completed" },
      ],
      tasks: [
        { title: "Add your first task", group_key: "todo", priority: "medium" },
        { title: "Group work into columns", group_key: "todo", priority: "low" },
        { title: "Invite your team", group_key: "doing", priority: "medium" },
        { title: "Set due dates", group_key: "waiting", priority: "low" },
      ],
    },
  }),
  tpl({
    id: "tpl-project", slug: "project-management", name: "Project Management", category: "Project Management",
    description: "A phase-based board from discovery through delivery.",
    template_data: {
      views: ["board", "grid"],
      groups: [
        { key: "discovery", name: "Discovery" }, { key: "planning", name: "Planning" },
        { key: "design", name: "Design" }, { key: "production", name: "Production" },
        { key: "review", name: "Review" }, { key: "delivery", name: "Delivery" }, { key: "done", name: "Completed" },
      ],
      tasks: [
        { title: "Define goals and scope", group_key: "discovery", priority: "high" },
        { title: "Stakeholder interviews", group_key: "discovery", priority: "medium" },
        { title: "Draft project plan", group_key: "planning", priority: "high" },
        { title: "Estimate timeline & budget", group_key: "planning", priority: "medium" },
        { title: "Design review", group_key: "design", priority: "medium" },
        { title: "Kickoff production", group_key: "production", priority: "medium" },
        { title: "Final delivery", group_key: "delivery", priority: "high", is_milestone: true, due_offset_days: 30 },
      ],
    },
  }),
  tpl({
    id: "tpl-software", slug: "software-development", name: "Software Development", category: "Software Development",
    description: "A dev workflow from backlog to release.",
    template_data: {
      views: ["board", "grid"],
      groups: [
        { key: "backlog", name: "Backlog" }, { key: "ready", name: "Ready" }, { key: "doing", name: "In Progress" },
        { key: "review", name: "Code Review" }, { key: "testing", name: "Testing" },
        { key: "blocked", name: "Blocked" }, { key: "released", name: "Released" },
      ],
      tasks: [
        { title: "Write the spec", group_key: "backlog", priority: "medium" },
        { title: "Break down into tickets", group_key: "ready", priority: "medium" },
        { title: "Implement feature", group_key: "doing", priority: "high" },
        { title: "Open pull request", group_key: "review", priority: "medium" },
        { title: "QA pass", group_key: "testing", priority: "medium" },
        { title: "Ship it", group_key: "released", priority: "high", is_milestone: true },
      ],
    },
  }),
  tpl({
    id: "tpl-onboarding", slug: "client-onboarding", name: "Client Onboarding", category: "Client Onboarding",
    description: "Take a new client from signed to active.",
    template_data: {
      views: ["board", "grid"],
      groups: [
        { key: "new", name: "New Client" }, { key: "info", name: "Information Needed" }, { key: "setup", name: "Setup" },
        { key: "internal", name: "Internal Review" }, { key: "client", name: "Client Review" }, { key: "active", name: "Active" },
      ],
      tasks: [
        { title: "Send welcome email", group_key: "new", priority: "high" },
        { title: "Collect brand assets", group_key: "info", priority: "medium", checklist: ["Logo", "Brand colors", "Fonts"] },
        { title: "Provision accounts", group_key: "setup", priority: "medium" },
        { title: "Internal QA", group_key: "internal", priority: "medium" },
        { title: "Client sign-off", group_key: "client", priority: "high" },
        { title: "Go live", group_key: "active", priority: "high", is_milestone: true },
      ],
    },
  }),
  tpl({
    id: "tpl-construction", slug: "construction-project", name: "Construction Project", category: "Construction",
    description: "Lead to warranty for a build project.",
    template_data: {
      views: ["board", "grid"],
      groups: [
        { key: "lead", name: "Lead" }, { key: "pre", name: "Pre-Construction" }, { key: "design", name: "Design" },
        { key: "estimate", name: "Estimating" }, { key: "permit", name: "Permitting" }, { key: "procure", name: "Procurement" },
        { key: "build", name: "Construction" }, { key: "punch", name: "Punch List" }, { key: "close", name: "Closeout" }, { key: "warranty", name: "Warranty" },
      ],
      tasks: [
        { title: "Site visit & qualify lead", group_key: "lead", priority: "medium" },
        { title: "Preliminary design", group_key: "design", priority: "medium" },
        { title: "Prepare estimate", group_key: "estimate", priority: "high" },
        { title: "Pull permits", group_key: "permit", priority: "high" },
        { title: "Order materials", group_key: "procure", priority: "medium" },
        { title: "Final walkthrough", group_key: "punch", priority: "medium" },
      ],
    },
  }),
  tpl({
    id: "tpl-marketing", slug: "marketing-campaign", name: "Marketing Campaign", category: "Marketing", badge: "New",
    description: "Ideas to reporting for a campaign.",
    template_data: {
      views: ["board", "grid"],
      groups: [
        { key: "ideas", name: "Ideas" }, { key: "strategy", name: "Strategy" }, { key: "content", name: "Content" },
        { key: "design", name: "Design" }, { key: "approval", name: "Approval" }, { key: "scheduled", name: "Scheduled" },
        { key: "published", name: "Published" }, { key: "reporting", name: "Reporting" },
      ],
      tasks: [
        { title: "Brainstorm campaign angle", group_key: "ideas", priority: "medium" },
        { title: "Define audience & channels", group_key: "strategy", priority: "high" },
        { title: "Write copy", group_key: "content", priority: "medium" },
        { title: "Design creative", group_key: "design", priority: "medium" },
        { title: "Get approval", group_key: "approval", priority: "high" },
        { title: "Schedule posts", group_key: "scheduled", priority: "medium" },
        { title: "Report on results", group_key: "reporting", priority: "medium", due_offset_days: 21 },
      ],
    },
  }),
];

export function findTemplate(id: string | null | undefined): PlanTemplate | null {
  if (!id) return null;
  return APP_TEMPLATES.find((t) => t.id === id) ?? null;
}
