// Stage guidance and completion requirements.
//
// Kept as data rather than markup so an admin screen can edit it later without
// touching the Opportunity workspace (spec §11: "administrators can customize
// stage guidance and required completion items").

import type { Deal, DealStage } from "@/lib/crm/deals";

export type ChecklistItem = {
  id: string;
  label: string;
  /** Blocks advancing past this stage until satisfied. */
  required?: boolean;
  /** Satisfied automatically from the record — no tick needed. */
  auto?: (d: Deal) => boolean;
};

export type StageGuide = {
  goal: string;
  actions: string[];
  checklist: ChecklistItem[];
};

const hasNextStep = (d: Deal) => Boolean(d.nextStep?.action && d.nextStep?.dueDate);

export const STAGE_GUIDE: Record<DealStage, StageGuide> = {
  new_working: {
    goal: "Get the opportunity properly owned and the first outreach out the door.",
    actions: ["Confirm the contact details are current.", "Confirm where the lead came from.", "Make the first outreach attempt.", "Schedule the next action."],
    checklist: [
      { id: "owner", label: "Owner assigned", required: true, auto: (d) => Boolean(d.owner?.trim()) },
      { id: "contact", label: "Contact information verified", required: true, auto: (d) => Boolean(d.contactId) },
      { id: "source", label: "Lead source confirmed", auto: (d) => Boolean(d.source?.trim()) },
      { id: "outreach", label: "First outreach attempted" },
      { id: "next", label: "Next action scheduled", required: true, auto: hasNextStep },
    ],
  },
  contacted: {
    goal: "Establish two-way contact and find out what they actually need.",
    actions: ["Reach a real conversation, not just a voicemail.", "Identify the need or interest.", "Find out who decides.", "Book the follow-up."],
    checklist: [
      { id: "twoway", label: "Two-way contact made", required: true },
      { id: "need", label: "Need or interest identified", required: true },
      { id: "dm", label: "Decision-maker identified" },
      { id: "followup", label: "Follow-up scheduled", auto: hasNextStep },
    ],
  },
  qualified: {
    goal: "Confirm this is a legitimate Channel Cast opportunity worth working.",
    actions: ["Confirm the business fit and use case.", "Confirm buying authority.", "Confirm timing.", "Review the estimated budget.", "Agree the next sales action."],
    checklist: [
      { id: "fit", label: "Business fit confirmed", required: true },
      { id: "dm", label: "Decision-maker identified", required: true },
      { id: "type", label: "Opportunity type selected", required: true, auto: (d) => Boolean(d.opportunityType) },
      { id: "value", label: "Estimated value entered", required: true, auto: (d) => (d.value || 0) > 0 },
      { id: "close", label: "Expected close date entered", required: true, auto: (d) => Boolean(d.closeDate) },
      { id: "next", label: "Next action scheduled", auto: hasNextStep },
    ],
  },
  opportunity: {
    goal: "Scope the deal: what they're buying, for how much, and by when.",
    actions: ["Scope products and services.", "Confirm pricing approach.", "Map the stakeholders.", "Agree the next milestone."],
    checklist: [
      { id: "products", label: "Products / services scoped", required: true, auto: (d) => Boolean(d.products?.length) },
      { id: "stakeholders", label: "Stakeholders mapped" },
      { id: "value", label: "Value and probability current", auto: (d) => (d.value || 0) > 0 },
      { id: "next", label: "Next milestone agreed", auto: hasNextStep },
    ],
  },
  proposal: {
    goal: "Get a proposal in front of them and confirm it was received.",
    actions: ["Build the proposal or media plan.", "Send it.", "Confirm it was opened or reviewed.", "Handle the first round of questions.", "Book the review meeting."],
    checklist: [
      { id: "created", label: "Proposal created", required: true },
      { id: "sent", label: "Proposal sent", required: true },
      { id: "reviewed", label: "Pricing reviewed with the client" },
      { id: "objections", label: "Objections captured" },
      { id: "meeting", label: "Next meeting booked", auto: hasNextStep },
    ],
  },
  negotiation: {
    goal: "Close the remaining gaps — price, terms, timing, approval.",
    actions: ["Settle final pricing and any discount.", "Move the contract through review.", "Confirm campaign dates and placements.", "Confirm billing requirements.", "Confirm the decision date."],
    checklist: [
      { id: "pricing", label: "Final pricing agreed", required: true },
      { id: "contract", label: "Contract status known", required: true },
      { id: "dates", label: "Campaign / placement dates confirmed" },
      { id: "billing", label: "Billing requirements captured" },
      { id: "decision", label: "Decision date confirmed", auto: (d) => Boolean(d.closeDate) },
    ],
  },
  closed_won: {
    goal: "Capture what was sold and hand it to onboarding.",
    actions: ["Record the final value.", "Summarise why it was won.", "Set the customer's role.", "Kick off onboarding."],
    checklist: [
      { id: "value", label: "Final deal value recorded", required: true, auto: (d) => (d.value || 0) > 0 },
      { id: "closedate", label: "Close date recorded", required: true, auto: (d) => Boolean(d.closedAt || d.closeDate) },
      { id: "summary", label: "Won reason / summary", auto: (d) => Boolean(d.wonSummary?.trim()) },
      { id: "role", label: "Customer role updated" },
    ],
  },
  closed_lost: {
    goal: "Record why, so the pattern is visible and the account can be nurtured later.",
    actions: ["Record the lost reason.", "Note the competitor if there was one.", "Decide whether to nurture."],
    checklist: [
      { id: "reason", label: "Lost reason recorded", required: true, auto: (d) => Boolean(d.lostReason) },
      { id: "notes", label: "Lost notes captured", auto: (d) => Boolean(d.lostNotes?.trim()) },
    ],
  },
  nurture: {
    goal: "Stay in touch until the timing is right.",
    actions: ["Set a revisit date.", "Keep the account on a light-touch cadence."],
    checklist: [{ id: "revisit", label: "Revisit date set", auto: hasNextStep }],
  },
};

export type ChecklistState = { item: ChecklistItem; done: boolean; automatic: boolean };

/** Resolve a stage's checklist against the record plus any manual ticks. */
export function checklistFor(deal: Deal, stage: DealStage = deal.stage): ChecklistState[] {
  const guide = STAGE_GUIDE[stage];
  if (!guide) return [];
  return guide.checklist.map((item) => {
    const automatic = Boolean(item.auto?.(deal));
    return { item, automatic, done: automatic || Boolean(deal.checklist?.[`${stage}:${item.id}`]) };
  });
}

/** Required items still outstanding — what blocks advancing out of a stage. */
export function blockingItems(deal: Deal, stage: DealStage = deal.stage): ChecklistItem[] {
  return checklistFor(deal, stage).filter((c) => c.item.required && !c.done).map((c) => c.item);
}

export const checklistProgress = (deal: Deal, stage: DealStage = deal.stage) => {
  const items = checklistFor(deal, stage);
  return { done: items.filter((i) => i.done).length, total: items.length };
};
