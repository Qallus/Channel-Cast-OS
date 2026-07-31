export type DocStatus = "draft" | "sent" | "signed" | "archived";
export type DocType = "Contract" | "Proposal" | "Agreement" | "Invoice" | "Asset" | "Report";

export type Document = {
  id: string;
  name: string;
  type: DocType;
  relatedTo: string; // client / advertiser
  status: DocStatus;
  owner: string;
  sizeKb: number;
  notes: string;
  createdAt: string;
};

export const DOC_STATUS: Record<DocStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", tone: "bg-brand/15 text-brand" },
  signed: { label: "Signed", tone: "bg-success/15 text-success" },
  archived: { label: "Archived", tone: "bg-secondary text-secondary-foreground" },
};
export const DOC_STATUS_ORDER: DocStatus[] = ["draft", "sent", "signed", "archived"];
export const DOC_TYPES: DocType[] = ["Contract", "Proposal", "Agreement", "Invoice", "Asset", "Report"];

export const seedDocuments: Document[] = [
  { id: "doc_oasis_msa", name: "Oasis Tower — Master Service Agreement", type: "Agreement", relatedTo: "Oasis Tower Resorts", status: "signed", owner: "Alex Rivera", sizeKb: 342, notes: "Two-tower expansion addendum attached.", createdAt: "2026-02-12T00:00:00.000Z" },
  { id: "doc_northwind_sow", name: "Northwind — Statement of Work (Q4)", type: "Contract", relatedTo: "Northwind Retail Group", status: "sent", owner: "Jordan Cole", sizeKb: 210, notes: "Awaiting counter-signature.", createdAt: "2026-07-15T00:00:00.000Z" },
  { id: "doc_summit_prop", name: "Summit Outfitters — Pilot Proposal", type: "Proposal", relatedTo: "Summit Outfitters", status: "sent", owner: "Alex Rivera", sizeKb: 128, notes: "Powder Days push scope + pricing.", createdAt: "2026-07-14T00:00:00.000Z" },
  { id: "doc_harbor_roi", name: "Harbor Lights — AI-Vision ROI Brief", type: "Report", relatedTo: "Harbor Lights Resort", status: "draft", owner: "Jordan Cole", sizeKb: 96, notes: "Upsell one-pager in progress.", createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "doc_windy_rev", name: "Windy City Pizza — Revenue-Share Terms", type: "Agreement", relatedTo: "Windy City Pizza Co", status: "draft", owner: "Jordan Cole", sizeKb: 74, notes: "Custom rev-share draft.", createdAt: "2026-07-26T00:00:00.000Z" },
  { id: "doc_brew_asset", name: "BrewFest — Spot Creative Pack", type: "Asset", relatedTo: "Local Brew Co", status: "signed", owner: "Jordan Cole", sizeKb: 5120, notes: "Final MP3s + cover art delivered.", createdAt: "2026-07-19T00:00:00.000Z" },
  { id: "doc_ocean_inv", name: "Ocean Drive — June/July Invoices", type: "Invoice", relatedTo: "Ocean Drive Group", status: "sent", owner: "Jordan Cole", sizeKb: 64, notes: "Past due — dunning in progress.", createdAt: "2026-07-10T00:00:00.000Z" },
  { id: "doc_maple_msa", name: "Maplewood Malls — Draft MSA", type: "Agreement", relatedTo: "Maplewood Malls", status: "draft", owner: "Alex Rivera", sizeKb: 288, notes: "With procurement for review.", createdAt: "2026-07-21T00:00:00.000Z" },
  { id: "doc_fashion_arch", name: "Fashion Row — 2025 Contract", type: "Contract", relatedTo: "Fashion Row", status: "archived", owner: "Alex Rivera", sizeKb: 176, notes: "Churned account. Retained for reference.", createdAt: "2025-12-06T00:00:00.000Z" },
];
