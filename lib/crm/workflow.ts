// The Channel Cast lead-servicing workflow — a Salesforce-style path every lead is
// worked through, from first touch to active client. Stored on the contact as
// `workflowStage`; "won" and "lost" both resolve to the "Closed" node.

export type WorkflowStage =
  | "lead_source" | "lead" | "qualified" | "opportunity" | "proposal" | "won" | "lost" | "onboarding";

export type WorkflowNode = {
  key: string;
  label: string;
  stages: WorkflowStage[];
  guidance: { title: string; items: string[] };
};

export const WORKFLOW_NODES: WorkflowNode[] = [
  {
    key: "lead_source", label: "Lead Source", stages: ["lead_source"],
    guidance: { title: "Capture where this lead came from", items: ["Record the campaign or source (referral, website, event, partner).", "Log the first point of contact as an activity."] },
  },
  {
    key: "lead", label: "Lead", stages: ["lead"],
    guidance: { title: "Confirm the lead is real & de-duplicated", items: ["Capture identity and contact details.", "Confirm it isn't spam and de-dupe against existing contacts.", "Assign an owner."] },
  },
  {
    key: "qualified", label: "Qualified", stages: ["qualified"],
    guidance: { title: "Qualify the opportunity", items: ["Hold the discovery call.", "Confirm the fit, locations, and budget.", "Assess timing and decision process."] },
  },
  {
    key: "opportunity", label: "Opportunity", stages: ["opportunity"],
    guidance: { title: "Work the open opportunity", items: ["Scope products / services and pricing.", "Identify the decision maker and next milestone."] },
  },
  {
    key: "proposal", label: "Proposal", stages: ["proposal"],
    guidance: { title: "Send the proposal / quote", items: ["Send the proposal or quote.", "Handle questions and negotiate terms."] },
  },
  {
    key: "closed", label: "Closed", stages: ["won", "lost"],
    guidance: { title: "Close the deal", items: ["Closed Won: terms agreed — proceed to onboarding.", "Closed Lost: record the reason so we can nurture later."] },
  },
  {
    key: "onboarding", label: "Onboarding", stages: ["onboarding"],
    guidance: { title: "Onboard the client", items: ["Execute the agreement.", "Assign devices / creative and go live."] },
  },
];

export function nodeIndexForStage(stage: string): number {
  const i = WORKFLOW_NODES.findIndex((n) => (n.stages as string[]).includes(stage));
  return i < 0 ? 0 : i;
}
export function stageForNodeAdvance(nodeKey: string): WorkflowStage {
  const map: Record<string, WorkflowStage> = { lead_source: "lead_source", lead: "lead", qualified: "qualified", opportunity: "opportunity", proposal: "proposal", closed: "won", onboarding: "onboarding" };
  return map[nodeKey] ?? "lead_source";
}
export const WORKFLOW_STAGE_LABEL: Record<WorkflowStage, string> = {
  lead_source: "Lead Source", lead: "Lead", qualified: "Qualified", opportunity: "Opportunity", proposal: "Proposal", won: "Closed Won", lost: "Closed Lost", onboarding: "Onboarding",
};

// Default a contact's workflow stage from its type when none is stored yet.
export function defaultStageForType(type: string): WorkflowStage {
  return type === "client" ? "onboarding" : type === "prospect" ? "qualified" : type === "lead" ? "lead" : "lead_source";
}

// Ways a "next step" can be actioned — mirrors the CFS methods plus Channel Cast surfaces.
export const NEXT_STEP_METHODS = [
  { key: "call", label: "Phone call" },
  { key: "sms", label: "Text / SMS" },
  { key: "email", label: "Email" },
  { key: "meeting", label: "Meeting" },
  { key: "notification", label: "In-app notification" },
  { key: "workspace", label: "Workspace doc" },
  { key: "plan", label: "Plan / task" },
  { key: "invoice", label: "Invoice" },
  { key: "contract", label: "Contract" },
  { key: "document", label: "Document" },
  { key: "media", label: "Media" },
  { key: "business_card", label: "Business card" },
  { key: "automation", label: "Automation" },
] as const;

export const REMIND_CHANNELS = [
  { key: "none", label: "No reminder" }, { key: "email", label: "Email me" }, { key: "sms", label: "Text me" }, { key: "both", label: "Email + text" },
];
export const REPEAT_OPTIONS = [
  { key: "once", label: "Once" }, { key: "daily", label: "Daily" }, { key: "weekly", label: "Weekly" }, { key: "biweekly", label: "Every 2 weeks" }, { key: "monthly", label: "Monthly" }, { key: "quarterly", label: "Quarterly" },
];
export const REMIND_LEAD_TIMES = [
  { minutes: 0, label: "At the due time" }, { minutes: 60, label: "1 hour before" }, { minutes: 1440, label: "1 day before" }, { minutes: 4320, label: "3 days before" }, { minutes: 10080, label: "1 week before" },
];

export type FollowUp = {
  id: string;
  contactId: string;
  dueAt: string; // ISO datetime
  method: string;
  subject: string;
  notes: string;
  remindChannel: string;
  remindBeforeMinutes: number;
  repeat: string;
  status: "open" | "done";
  completedAt: string | null;
  createdAt: string;
};
