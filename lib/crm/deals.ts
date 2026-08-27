// Opportunities — the actively worked sales record.
//
// A Deal/Opportunity is created when a Lead is intentionally added to the
// Pipeline. It links to the same contact and account rather than copying them,
// so a role change (Prospect -> Advertiser -> Client) never resets or duplicates
// the opportunity. Stage, owner and outcome history are append-only: the record
// must survive Closed Lost and stay reportable.

export type DealStage =
  // Forward path
  | "new_working" | "contacted" | "qualified" | "opportunity" | "proposal" | "negotiation" | "closed_won"
  // Outcome + parked
  | "closed_lost" | "nurture";

export type StageEvent = { stage: DealStage; at: string; by: string; note?: string };
export type OwnerEvent = { owner: string; at: string; by: string };

export type NextStepType = "call" | "email" | "sms" | "meeting" | "demo" | "proposal" | "follow_up" | "contract" | "other";
export type NextStep = {
  action: string;
  dueDate: string; // ISO date
  assignee: string;
  type: NextStepType;
  priority: "low" | "normal" | "high";
};

export type Stalled = { reason: string; since: string; notes?: string; followUpDate?: string };

export type Deal = {
  id: string;
  name: string;
  client: string; // company / account name
  contactId?: string | null; // primary contact — the person record
  accountId?: string | null; // account record when one exists
  leadId?: string | null; // the lead this was converted from
  contactIds?: string[]; // additional opportunity contacts
  stage: DealStage;
  value: number;
  probability: number; // 0–100
  closeDate: string; // expected close, ISO date
  owner: string; // required for every active opportunity
  opportunityType?: string;
  products?: string[];
  source?: string;
  campaign?: string;
  notes: string;
  createdAt: string;

  // Workflow state
  stageEnteredAt?: string;
  stageHistory?: StageEvent[];
  ownerHistory?: OwnerEvent[];
  /** Completed stage checklist items, keyed `${stage}:${itemId}`. */
  checklist?: Record<string, boolean>;
  nextStep?: NextStep | null;
  stalled?: Stalled | null;

  // Outcome
  closedAt?: string | null;
  wonSummary?: string;
  lostReason?: string;
  lostNotes?: string;
  competitor?: string;
  reopenedAt?: string | null;
};

export const DEAL_STAGE: Record<DealStage, { label: string; tone: string; defaultProb: number }> = {
  new_working: { label: "New / Working", tone: "bg-muted text-muted-foreground", defaultProb: 10 },
  contacted: { label: "Contacted", tone: "bg-brand/15 text-brand-strong", defaultProb: 20 },
  qualified: { label: "Qualified", tone: "bg-brand/15 text-brand-strong", defaultProb: 35 },
  opportunity: { label: "Opportunity", tone: "bg-accent text-accent-foreground", defaultProb: 50 },
  proposal: { label: "Proposal", tone: "bg-accent text-accent-foreground", defaultProb: 65 },
  negotiation: { label: "Negotiation", tone: "bg-warning/15 text-warning", defaultProb: 80 },
  closed_won: { label: "Closed Won", tone: "bg-success/15 text-success", defaultProb: 100 },
  closed_lost: { label: "Closed Lost", tone: "bg-destructive/15 text-destructive", defaultProb: 0 },
  nurture: { label: "Nurture", tone: "bg-secondary text-secondary-foreground", defaultProb: 10 },
};

/** The forward sales path. Closed Lost is an outcome from any stage, not a column to walk to. */
export const PIPELINE_PATH: DealStage[] = ["new_working", "contacted", "qualified", "opportunity", "proposal", "negotiation", "closed_won"];
export const DEAL_STAGE_ORDER: DealStage[] = [...PIPELINE_PATH, "closed_lost", "nurture"];
/** Counts toward open pipeline and forecast. */
export const OPEN_STAGES: DealStage[] = ["new_working", "contacted", "qualified", "opportunity", "proposal", "negotiation"];
export const OUTCOME_STAGES: DealStage[] = ["closed_won", "closed_lost", "nurture"];
export const isClosed = (s: DealStage) => s === "closed_won" || s === "closed_lost";

export const OPPORTUNITY_TYPES = [
  "Advertiser", "Advertising Campaign", "Venue / Location", "Device Placement", "Partner",
  "Agency", "Reseller", "Enterprise Account", "Sponsorship", "Hardware Deployment",
  "Software / Platform", "Service Agreement", "Other",
];

export const LOST_REASONS = [
  "Price", "No Budget", "Timing", "No Response", "Competitor", "Chose Another Solution",
  "Not a Fit", "Internal Approval Denied", "Project Canceled", "Duplicate", "Invalid Lead", "Other",
];

export const STALLED_REASONS = [
  "Waiting on budget", "Waiting on decision-maker", "Timing", "Internal review", "Waiting on proposal", "No response",
];

export const NEXT_STEP_TYPES: { key: NextStepType; label: string }[] = [
  { key: "call", label: "Call" }, { key: "email", label: "Email" }, { key: "sms", label: "SMS" },
  { key: "meeting", label: "Meeting" }, { key: "demo", label: "Demo" }, { key: "proposal", label: "Proposal" },
  { key: "follow_up", label: "Follow-up" }, { key: "contract", label: "Contract" }, { key: "other", label: "Other" },
];

/** Pre-redesign stage keys, mapped onto the current path. Used by the migration and by any stale client cache. */
export const LEGACY_STAGE_MAP: Record<string, DealStage> = {
  new_lead: "new_working",
  prospect: "contacted",
  qualified: "qualified",
  opportunity: "opportunity",
  proposal: "proposal",
  negotiation: "negotiation",
  won: "closed_won",
  lost: "closed_lost",
  disqualified: "closed_lost",
  unresponsive: "closed_lost",
  nurture: "nurture",
};

export function normalizeStage(stage: string): DealStage {
  return (DEAL_STAGE[stage as DealStage] ? (stage as DealStage) : LEGACY_STAGE_MAP[stage]) ?? "new_working";
}

export const weightedValue = (d: Deal) => Math.round((d.value || 0) * ((d.probability ?? 0) / 100));

const DAY = 86_400_000;
export const daysBetween = (from: string, to: string | Date = new Date()) =>
  Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / DAY));

export const daysOpen = (d: Deal) => daysBetween(d.createdAt, d.closedAt || new Date());
export const daysInStage = (d: Deal) => daysBetween(d.stageEnteredAt || d.createdAt);

/** No future next step is the signal the spec asks us to flag. */
export function needsNextStep(d: Deal): boolean {
  if (isClosed(d.stage)) return false;
  if (!d.nextStep?.dueDate) return true;
  return new Date(d.nextStep.dueDate).getTime() < Date.now();
}

export const seedDeals: Deal[] = [
  { id: "dl_oasis_x", name: "Oasis — two-tower expansion", client: "Oasis Tower Resorts", contactId: "ct_dana", stage: "negotiation", value: 46000, probability: 80, closeDate: "2026-08-15", owner: "Jeremy Waters", opportunityType: "Venue / Location", products: ["Motion-activated audio", "Proof of play"], source: "Referral", notes: "Contract redlines with legal. Verbal yes.", createdAt: "2026-07-01T00:00:00.000Z" },
  { id: "dl_harbor_ai", name: "Harbor Lights — AI-vision upgrade", client: "Harbor Lights Resort", contactId: "ct_priya", stage: "proposal", value: 28000, probability: 65, closeDate: "2026-08-30", owner: "Jordan Cole", opportunityType: "Hardware Deployment", products: ["Digital displays"], source: "Website", notes: "ROI one-pager sent. Awaiting marketing sign-off.", createdAt: "2026-07-08T00:00:00.000Z" },
  { id: "dl_summit_pilot", name: "Summit Outfitters — pilot", client: "Summit Outfitters", contactId: "ct_riley", stage: "opportunity", value: 24000, probability: 50, closeDate: "2026-08-12", owner: "Jeremy Waters", opportunityType: "Advertiser", products: ["Motion-activated audio"], source: "Event", notes: "Powder Days push tied to pilot approval.", createdAt: "2026-07-16T00:00:00.000Z" },
  { id: "dl_windy_rev", name: "Windy City Pizza — rev-share deal", client: "Windy City Pizza Co", contactId: "ct_tony", stage: "qualified", value: 18000, probability: 35, closeDate: "2026-09-10", owner: "Jordan Cole", opportunityType: "Advertiser", products: ["Motion-activated audio"], source: "Cold outreach", notes: "Needs custom revenue-share terms.", createdAt: "2026-07-25T00:00:00.000Z" },
  { id: "dl_kzap_aff", name: "KZAP 104.3 — affiliate deal", client: "KZAP 104.3", contactId: "ct_wes", stage: "new_working", value: 15000, probability: 10, closeDate: "2026-10-01", owner: "Jeremy Waters", opportunityType: "Partner", products: ["Partner network"], source: "Partner intro", notes: "Exploring a network affiliate arrangement.", createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "dl_maplewood", name: "Maplewood Malls — network rollout", client: "Maplewood Malls", stage: "negotiation", value: 42000, probability: 80, closeDate: "2026-08-25", owner: "Jeremy Waters", opportunityType: "Venue / Location", products: ["Digital displays", "Street furniture"], source: "Inbound", notes: "Procurement reviewing MSA. Large footprint.", createdAt: "2026-07-20T00:00:00.000Z" },
  { id: "dl_localbrew_up", name: "Local Brew — location upsell", client: "Local Brew Co", contactId: "ct_owen", stage: "closed_won", value: 9000, probability: 100, closeDate: "2026-07-26", owner: "Jordan Cole", opportunityType: "Advertiser", products: ["Motion-activated audio"], source: "Roster", notes: "Closed. Adding two taprooms to the plan.", createdAt: "2026-07-05T00:00:00.000Z" },
  { id: "dl_ocean_renew", name: "Ocean Drive — renewal", client: "Ocean Drive Group", contactId: "ct_elena", stage: "closed_lost", value: 12000, probability: 0, closeDate: "2026-07-18", owner: "Jordan Cole", opportunityType: "Advertiser", source: "Referral", lostReason: "No Budget", notes: "Lost to budget cuts after past-due invoices.", createdAt: "2026-06-20T00:00:00.000Z" },
  { id: "dl_ironpeak", name: "Iron Peak Gyms — 8 locations", client: "Iron Peak Gyms", stage: "nurture", value: 31000, probability: 10, closeDate: "2026-11-05", owner: "Jordan Cole", opportunityType: "Advertiser", products: ["Motion-activated audio"], source: "Referral", notes: "Good fit, revisit next budget cycle.", createdAt: "2026-07-22T00:00:00.000Z" },
];
