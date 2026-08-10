// Sales pipeline — the Channel Cast lead-to-client lifecycle. An opportunity (deal)
// moves through progressing stages, then reaches an outcome. Won deals convert to a
// Client. Records link back to a contact so history stays on the contact profile.

export type DealStage =
  // Progressing (open pipeline)
  | "new_lead" | "qualified" | "prospect" | "opportunity" | "proposal" | "negotiation" | "won"
  // Outcomes (closed / parked)
  | "lost" | "disqualified" | "unresponsive" | "nurture";

export type Deal = {
  id: string;
  name: string;
  client: string; // company / account name
  contactId?: string | null; // linked contact
  stage: DealStage;
  value: number;
  probability: number; // 0–100
  closeDate: string; // expected close, ISO date
  owner: string; // assigned sales rep
  products?: string[]; // products / services
  source?: string;
  notes: string;
  createdAt: string;
};

export const DEAL_STAGE: Record<DealStage, { label: string; tone: string; defaultProb: number }> = {
  new_lead: { label: "New Lead", tone: "bg-muted text-muted-foreground", defaultProb: 10 },
  qualified: { label: "Qualified", tone: "bg-brand/15 text-brand-strong", defaultProb: 20 },
  prospect: { label: "Prospect", tone: "bg-brand/15 text-brand-strong", defaultProb: 30 },
  opportunity: { label: "Opportunity", tone: "bg-accent text-accent-foreground", defaultProb: 45 },
  proposal: { label: "Proposal / Quote", tone: "bg-accent text-accent-foreground", defaultProb: 60 },
  negotiation: { label: "Negotiation", tone: "bg-warning/15 text-warning", defaultProb: 80 },
  won: { label: "Deal Won", tone: "bg-success/15 text-success", defaultProb: 100 },
  lost: { label: "Deal Lost", tone: "bg-destructive/15 text-destructive", defaultProb: 0 },
  disqualified: { label: "Disqualified", tone: "bg-muted text-muted-foreground", defaultProb: 0 },
  unresponsive: { label: "Unresponsive", tone: "bg-muted text-muted-foreground", defaultProb: 0 },
  nurture: { label: "Nurture", tone: "bg-secondary text-secondary-foreground", defaultProb: 10 },
};

// Board column order (progressing stages first, then outcomes).
export const DEAL_STAGE_ORDER: DealStage[] = [
  "new_lead", "qualified", "prospect", "opportunity", "proposal", "negotiation", "won",
  "lost", "disqualified", "unresponsive", "nurture",
];
// Stages that count as live pipeline for the forecast.
export const OPEN_STAGES: DealStage[] = ["new_lead", "qualified", "prospect", "opportunity", "proposal", "negotiation"];
// Terminal / parked outcomes.
export const OUTCOME_STAGES: DealStage[] = ["lost", "disqualified", "unresponsive", "nurture"];

export const seedDeals: Deal[] = [
  { id: "dl_oasis_x", name: "Oasis — two-tower expansion", client: "Oasis Tower Resorts", contactId: "ct_dana", stage: "negotiation", value: 46000, probability: 80, closeDate: "2026-08-15", owner: "Jeremy Waters", products: ["Motion-activated audio", "Proof of play"], source: "Referral", notes: "Contract redlines with legal. Verbal yes.", createdAt: "2026-07-01T00:00:00.000Z" },
  { id: "dl_harbor_ai", name: "Harbor Lights — AI-vision upgrade", client: "Harbor Lights Resort", contactId: "ct_priya", stage: "proposal", value: 28000, probability: 60, closeDate: "2026-08-30", owner: "Jordan Cole", products: ["Digital displays"], source: "Website", notes: "ROI one-pager sent. Awaiting marketing sign-off.", createdAt: "2026-07-08T00:00:00.000Z" },
  { id: "dl_summit_pilot", name: "Summit Outfitters — pilot", client: "Summit Outfitters", contactId: "ct_riley", stage: "opportunity", value: 24000, probability: 45, closeDate: "2026-08-12", owner: "Jeremy Waters", products: ["Motion-activated audio"], source: "Event", notes: "Powder Days push tied to pilot approval.", createdAt: "2026-07-16T00:00:00.000Z" },
  { id: "dl_windy_rev", name: "Windy City Pizza — rev-share deal", client: "Windy City Pizza Co", contactId: "ct_tony", stage: "qualified", value: 18000, probability: 20, closeDate: "2026-09-10", owner: "Jordan Cole", products: ["Motion-activated audio"], source: "Cold outreach", notes: "Needs custom revenue-share terms.", createdAt: "2026-07-25T00:00:00.000Z" },
  { id: "dl_kzap_aff", name: "KZAP 104.3 — affiliate deal", client: "KZAP 104.3", contactId: "ct_wes", stage: "new_lead", value: 15000, probability: 10, closeDate: "2026-10-01", owner: "Jeremy Waters", products: ["Partner network"], source: "Partner intro", notes: "Exploring a network affiliate arrangement.", createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "dl_maplewood", name: "Maplewood Malls — network rollout", client: "Maplewood Malls", stage: "negotiation", value: 42000, probability: 75, closeDate: "2026-08-25", owner: "Jeremy Waters", products: ["Digital displays", "Street furniture"], source: "Inbound", notes: "Procurement reviewing MSA. Large footprint.", createdAt: "2026-07-20T00:00:00.000Z" },
  { id: "dl_localbrew_up", name: "Local Brew — location upsell", client: "Local Brew Co", contactId: "ct_owen", stage: "won", value: 9000, probability: 100, closeDate: "2026-07-26", owner: "Jordan Cole", products: ["Motion-activated audio"], source: "Roster", notes: "Closed. Adding two taprooms to the plan.", createdAt: "2026-07-05T00:00:00.000Z" },
  { id: "dl_ocean_renew", name: "Ocean Drive — renewal", client: "Ocean Drive Group", contactId: "ct_elena", stage: "lost", value: 12000, probability: 0, closeDate: "2026-07-18", owner: "Jordan Cole", source: "Referral", notes: "Lost to budget cuts after past-due invoices.", createdAt: "2026-06-20T00:00:00.000Z" },
  { id: "dl_ironpeak", name: "Iron Peak Gyms — 8 locations", client: "Iron Peak Gyms", stage: "nurture", value: 31000, probability: 15, closeDate: "2026-11-05", owner: "Jordan Cole", products: ["Motion-activated audio"], source: "Referral", notes: "Good fit, revisit next budget cycle.", createdAt: "2026-07-22T00:00:00.000Z" },
];
