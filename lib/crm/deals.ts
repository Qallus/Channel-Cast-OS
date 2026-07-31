export type DealStage = "qualified" | "proposal" | "negotiation" | "won" | "lost";

export type Deal = {
  id: string;
  name: string;
  client: string;
  stage: DealStage;
  value: number;
  probability: number; // 0–100
  closeDate: string; // ISO date
  owner: string;
  notes: string;
  createdAt: string;
};

export const DEAL_STAGE: Record<DealStage, { label: string; tone: string; defaultProb: number }> = {
  qualified: { label: "Qualified", tone: "bg-brand/15 text-brand", defaultProb: 25 },
  proposal: { label: "Proposal", tone: "bg-accent text-accent-foreground", defaultProb: 50 },
  negotiation: { label: "Negotiation", tone: "bg-warning/15 text-warning", defaultProb: 75 },
  won: { label: "Won", tone: "bg-success/15 text-success", defaultProb: 100 },
  lost: { label: "Lost", tone: "bg-destructive/15 text-destructive", defaultProb: 0 },
};
export const DEAL_STAGE_ORDER: DealStage[] = ["qualified", "proposal", "negotiation", "won", "lost"];
export const OPEN_STAGES: DealStage[] = ["qualified", "proposal", "negotiation"];

export const seedDeals: Deal[] = [
  { id: "dl_oasis_x", name: "Oasis — two-tower expansion", client: "Oasis Tower Resorts", stage: "negotiation", value: 46000, probability: 75, closeDate: "2026-08-15", owner: "Alex Rivera", notes: "Contract redlines with legal. Verbal yes.", createdAt: "2026-07-01T00:00:00.000Z" },
  { id: "dl_harbor_ai", name: "Harbor Lights — AI-vision upgrade", client: "Harbor Lights Resort", stage: "proposal", value: 28000, probability: 50, closeDate: "2026-08-30", owner: "Jordan Cole", notes: "ROI one-pager sent. Awaiting marketing sign-off.", createdAt: "2026-07-08T00:00:00.000Z" },
  { id: "dl_northwind_qbr", name: "Northwind — 4-location add-on", client: "Northwind Retail Group", stage: "qualified", value: 33000, probability: 25, closeDate: "2026-09-20", owner: "Jordan Cole", notes: "Surfaced in QBR. Budget confirmed for Q4.", createdAt: "2026-07-15T00:00:00.000Z" },
  { id: "dl_summit_pilot", name: "Summit Outfitters — pilot", client: "Summit Outfitters", stage: "proposal", value: 24000, probability: 55, closeDate: "2026-08-12", owner: "Alex Rivera", notes: "Powder Days push tied to pilot approval.", createdAt: "2026-07-16T00:00:00.000Z" },
  { id: "dl_ironpeak", name: "Iron Peak Gyms — 8 locations", client: "Iron Peak Gyms", stage: "qualified", value: 31000, probability: 30, closeDate: "2026-09-05", owner: "Jordan Cole", notes: "Strong referral. Motion-trigger fit is ideal.", createdAt: "2026-07-22T00:00:00.000Z" },
  { id: "dl_maplewood", name: "Maplewood Malls — network rollout", client: "Maplewood Malls", stage: "negotiation", value: 42000, probability: 70, closeDate: "2026-08-25", owner: "Alex Rivera", notes: "Procurement reviewing MSA. Large footprint.", createdAt: "2026-07-20T00:00:00.000Z" },
  { id: "dl_localbrew_up", name: "Local Brew — location upsell", client: "Local Brew Co", stage: "won", value: 9000, probability: 100, closeDate: "2026-07-26", owner: "Jordan Cole", notes: "Closed. Adding two taprooms to the plan.", createdAt: "2026-07-05T00:00:00.000Z" },
  { id: "dl_ocean_renew", name: "Ocean Drive — renewal", client: "Ocean Drive Group", stage: "lost", value: 12000, probability: 0, closeDate: "2026-07-18", owner: "Jordan Cole", notes: "Lost to budget cuts after past-due invoices.", createdAt: "2026-06-20T00:00:00.000Z" },
  { id: "dl_windy_rev", name: "Windy City Pizza — rev-share deal", client: "Windy City Pizza Co", stage: "qualified", value: 18000, probability: 20, closeDate: "2026-09-10", owner: "Jordan Cole", notes: "Needs custom revenue-share terms.", createdAt: "2026-07-25T00:00:00.000Z" },
];
