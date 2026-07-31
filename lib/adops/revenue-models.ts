export type ModelType = "revenue_share" | "flat_monthly" | "cpm" | "per_play" | "sponsorship" | "hybrid";
export type ModelStatus = "active" | "draft" | "archived";

export type RevenueModel = {
  id: string;
  name: string;
  type: ModelType;
  rate: number;
  unit: string; // how the rate reads, e.g. "% of ad revenue", "/mo", "per 1k plays"
  appliesTo: string; // audience/segment this applies to
  status: ModelStatus;
  description: string;
  notes: string;
  createdAt: string;
};

export const MODEL_TYPE: Record<ModelType, { label: string; tone: string }> = {
  revenue_share: { label: "Revenue share", tone: "bg-brand/15 text-brand-strong" },
  flat_monthly: { label: "Flat monthly", tone: "bg-success/15 text-success" },
  cpm: { label: "CPM", tone: "bg-accent text-accent-foreground" },
  per_play: { label: "Per play", tone: "bg-warning/15 text-warning" },
  sponsorship: { label: "Sponsorship", tone: "bg-secondary text-secondary-foreground" },
  hybrid: { label: "Hybrid", tone: "bg-muted text-muted-foreground" },
};
export const MODEL_TYPE_ORDER: ModelType[] = ["revenue_share", "flat_monthly", "cpm", "per_play", "sponsorship", "hybrid"];

export const MODEL_STATUS: Record<ModelStatus, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-success/15 text-success" },
  draft: { label: "Draft", tone: "bg-muted text-muted-foreground" },
  archived: { label: "Archived", tone: "bg-secondary text-secondary-foreground" },
};
export const MODEL_STATUS_ORDER: ModelStatus[] = ["active", "draft", "archived"];

// Format a model's headline price, e.g. "$1,200 /mo" or "45 % of ad revenue".
export function formatRate(m: Pick<RevenueModel, "type" | "rate" | "unit">): string {
  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  if (m.type === "revenue_share") return `${m.rate}${m.unit || "% of ad revenue"}`;
  return `${usd.format(m.rate)} ${m.unit}`.trim();
}

export const seedRevenueModels: RevenueModel[] = [
  { id: "rm_flat_std", name: "Standard Subscription", type: "flat_monthly", rate: 1200, unit: "/mo per location", appliesTo: "SMB single-site clients", status: "active", description: "Flat monthly fee per location with unlimited scheduled playback.", notes: "Most common plan for retail and hospitality.", createdAt: "2026-01-10T00:00:00.000Z" },
  { id: "rm_revshare", name: "Ad Revenue Share", type: "revenue_share", rate: 45, unit: "% of ad revenue", appliesTo: "Multi-site venues with ad inventory", status: "active", description: "Channel Cast retains 45% of advertiser spend; the venue keeps 55%.", notes: "Preferred by malls and large footprints.", createdAt: "2026-01-10T00:00:00.000Z" },
  { id: "rm_cpm", name: "CPM Advertising", type: "cpm", rate: 12, unit: "per 1k plays", appliesTo: "Advertiser-booked campaigns", status: "active", description: "Advertisers pay per thousand audio plays delivered.", notes: "Used for measurable awareness campaigns.", createdAt: "2026-02-02T00:00:00.000Z" },
  { id: "rm_perplay", name: "Per-Play Trigger", type: "per_play", rate: 0.02, unit: "per motion-triggered play", appliesTo: "Motion/AI-vision devices", status: "active", description: "Priced per motion- or person-detected play. Best for high-traffic zones.", notes: "Ties revenue to real foot traffic.", createdAt: "2026-03-14T00:00:00.000Z" },
  { id: "rm_sponsor", name: "Event Sponsorship Bloc", type: "sponsorship", rate: 6000, unit: "per event bloc", appliesTo: "Seasonal & event campaigns", status: "active", description: "Fixed sponsorship fee for a defined event window and spot bloc.", notes: "BrewFest, night markets, etc.", createdAt: "2026-05-01T00:00:00.000Z" },
  { id: "rm_hybrid", name: "Hybrid Base + Share", type: "hybrid", rate: 600, unit: "/mo + 25% ad share", appliesTo: "Growth accounts", status: "draft", description: "Reduced base fee plus a smaller revenue share on ad inventory.", notes: "Piloting with Windy City Pizza.", createdAt: "2026-07-20T00:00:00.000Z" },
  { id: "rm_legacy", name: "Legacy Flat (2025)", type: "flat_monthly", rate: 950, unit: "/mo per location", appliesTo: "Grandfathered accounts", status: "archived", description: "Older flat plan retained for early clients.", notes: "Do not offer to new accounts.", createdAt: "2025-09-01T00:00:00.000Z" },
];
