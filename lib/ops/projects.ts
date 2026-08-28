export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";

export type Project = {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number; // 0–100
  owner: string;
  startDate: string; // ISO date
  dueDate: string; // ISO date
  notes: string;
  createdAt: string;
  /** Set when connected from a Pipeline opportunity. */
  opportunityId?: string | null;
  contactId?: string | null;
};

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: string }> = {
  planning: { label: "Planning", tone: "bg-muted text-muted-foreground" },
  active: { label: "Active", tone: "bg-brand/15 text-brand-strong" },
  on_hold: { label: "On hold", tone: "bg-warning/15 text-warning" },
  completed: { label: "Completed", tone: "bg-success/15 text-success" },
};
export const PROJECT_STATUS_ORDER: ProjectStatus[] = ["planning", "active", "on_hold", "completed"];

export const seedProjects: Project[] = [
  { id: "pj_oasis", name: "Oasis Tower — Tower 3 & 4 Install", client: "Oasis Tower Resorts", status: "active", progress: 60, owner: "Alex Rivera", startDate: "2026-07-10", dueDate: "2026-08-20", notes: "28 devices across two new towers. Cabling done; audio zones next.", createdAt: "2026-07-08T00:00:00.000Z" },
  { id: "pj_northwind", name: "Northwind — Q4 Store Rollout", client: "Northwind Retail Group", status: "planning", progress: 15, owner: "Jordan Cole", startDate: "2026-08-14", dueDate: "2026-10-14", notes: "Safety-loop deployment to 4 additional stores.", createdAt: "2026-07-14T00:00:00.000Z" },
  { id: "pj_summit", name: "Summit Outfitters — Pilot Onboarding", client: "Summit Outfitters", status: "active", progress: 40, owner: "Alex Rivera", startDate: "2026-07-18", dueDate: "2026-08-10", notes: "Two-store pilot. Powder Days creative in production.", createdAt: "2026-07-16T00:00:00.000Z" },
  { id: "pj_harbor", name: "Harbor Lights — AI-Vision Upgrade", client: "Harbor Lights Resort", status: "planning", progress: 10, owner: "Jordan Cole", startDate: "2026-08-20", dueDate: "2026-09-30", notes: "Pending ROI sign-off. Hardware swap on 12 devices.", createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "pj_ironpeak", name: "Iron Peak Gyms — 8-Location Deploy", client: "Iron Peak Gyms", status: "planning", progress: 5, owner: "Jordan Cole", startDate: "2026-09-01", dueDate: "2026-10-20", notes: "Scoping motion-audio devices per gym.", createdAt: "2026-07-24T00:00:00.000Z" },
  { id: "pj_ocean", name: "Ocean Drive — Reactivation", client: "Ocean Drive Group", status: "on_hold", progress: 30, owner: "Jordan Cole", startDate: "2026-06-15", dueDate: "2026-08-01", notes: "On hold pending payment resolution.", createdAt: "2026-06-14T00:00:00.000Z" },
  { id: "pj_localbrew", name: "Local Brew — BrewFest Setup", client: "Local Brew Co", status: "completed", progress: 100, owner: "Jordan Cole", startDate: "2026-07-05", dueDate: "2026-07-19", notes: "Sponsorship bloc live. Creative delivered.", createdAt: "2026-07-04T00:00:00.000Z" },
  { id: "pj_city", name: "City Events — Seasonal Refresh", client: "City Events LLC", status: "active", progress: 55, owner: "Alex Rivera", startDate: "2026-07-12", dueDate: "2026-08-05", notes: "Night Market teaser scheduling + spot refresh.", createdAt: "2026-07-11T00:00:00.000Z" },
];
