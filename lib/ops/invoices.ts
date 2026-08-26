export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export type LineItem = { id: string; description: string; qty: number; rate: number; included?: boolean };
export type Party = { name: string; company?: string; email?: string; phone?: string; address?: string };

export type Invoice = {
  id: string;
  number: string;
  client: string;
  amount: number;      // kept in sync with the computed total for stats/search
  status: InvoiceStatus;
  issueDate: string;   // ISO date
  dueDate: string;     // ISO date
  description: string;
  owner: string;
  createdAt: string;
  // Robust invoice fields (optional for back-compat with older records).
  logoUrl?: string;
  from?: Party;        // letterhead / "from"
  billTo?: Party;
  lineItems?: LineItem[];
  taxRate?: number;    // percent, e.g. 8.6
  discount?: number;   // flat amount off
  notes?: string;
  terms?: string;
  contactId?: string | null;
  // Random, unguessable id for the public /i/<token> view. Minted the first time
  // an invoice is shared, then stable so a link already sent keeps working.
  publicToken?: string;
};

// Default Channel Cast letterhead + logo (light backgrounds → the full-color mark).
export const DEFAULT_LOGO = "/logos/logo.svg";
export const CHANNEL_CAST_FROM: Party = {
  name: "Channel Cast",
  email: "hello@channelcast.io",
  phone: "(480) 999-9906",
  address: "Scottsdale, AZ",
};

export const lineAmount = (li: LineItem) => (li.included ? 0 : Math.max(0, (Number(li.qty) || 0) * (Number(li.rate) || 0)));
export const invoiceSubtotal = (inv: Invoice) =>
  inv.lineItems?.length ? inv.lineItems.reduce((s, li) => s + lineAmount(li), 0) : (inv.amount || 0);
export function invoiceTotal(inv: Invoice): number {
  const sub = invoiceSubtotal(inv);
  const tax = sub * ((inv.taxRate || 0) / 100);
  return Math.max(0, sub + tax - (inv.discount || 0));
}

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", tone: "bg-brand/15 text-brand-strong" },
  paid: { label: "Paid", tone: "bg-success/15 text-success" },
  overdue: { label: "Overdue", tone: "bg-destructive/15 text-destructive" },
  void: { label: "Void", tone: "bg-secondary text-secondary-foreground" },
};
export const INVOICE_STATUS_ORDER: InvoiceStatus[] = ["draft", "sent", "paid", "overdue", "void"];

export const seedInvoices: Invoice[] = [
  { id: "inv_1042", number: "CC-1042", client: "Oasis Tower Resorts", amount: 7800, status: "paid", issueDate: "2026-07-01", dueDate: "2026-07-15", description: "July subscription — 6 locations", owner: "Alex Rivera", createdAt: "2026-07-01T00:00:00.000Z" },
  { id: "inv_1043", number: "CC-1043", client: "Northwind Retail Group", amount: 12400, status: "sent", issueDate: "2026-07-05", dueDate: "2026-08-04", description: "July subscription — 12 locations + safety loop", owner: "Jordan Cole", createdAt: "2026-07-05T00:00:00.000Z" },
  { id: "inv_1044", number: "CC-1044", client: "Harbor Lights Resort", amount: 6100, status: "sent", issueDate: "2026-07-06", dueDate: "2026-08-05", description: "July subscription + Sunrise Promo", owner: "Jordan Cole", createdAt: "2026-07-06T00:00:00.000Z" },
  { id: "inv_1039", number: "CC-1039", client: "Ocean Drive Group", amount: 2600, status: "overdue", issueDate: "2026-06-10", dueDate: "2026-06-24", description: "June subscription — 3 locations", owner: "Jordan Cole", createdAt: "2026-06-10T00:00:00.000Z" },
  { id: "inv_1040", number: "CC-1040", client: "Ocean Drive Group", amount: 2600, status: "overdue", issueDate: "2026-07-10", dueDate: "2026-07-24", description: "July subscription — 3 locations", owner: "Jordan Cole", createdAt: "2026-07-10T00:00:00.000Z" },
  { id: "inv_1045", number: "CC-1045", client: "Local Brew Co", amount: 2100, status: "paid", issueDate: "2026-07-08", dueDate: "2026-07-22", description: "July subscription + BrewFest setup", owner: "Jordan Cole", createdAt: "2026-07-08T00:00:00.000Z" },
  { id: "inv_1046", number: "CC-1046", client: "City Events LLC", amount: 1900, status: "sent", issueDate: "2026-07-12", dueDate: "2026-08-11", description: "July subscription — 2 locations", owner: "Alex Rivera", createdAt: "2026-07-12T00:00:00.000Z" },
  { id: "inv_1047", number: "CC-1047", client: "Summit Outfitters", amount: 4500, status: "draft", issueDate: "2026-07-28", dueDate: "2026-08-27", description: "Pilot setup + first month", owner: "Alex Rivera", createdAt: "2026-07-28T00:00:00.000Z" },
  { id: "inv_1041", number: "CC-1041", client: "Copper Mesa Apartments", amount: 3200, status: "paid", issueDate: "2026-07-02", dueDate: "2026-07-16", description: "July subscription — 3 locations", owner: "Alex Rivera", createdAt: "2026-07-02T00:00:00.000Z" },
];
