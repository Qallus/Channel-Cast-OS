// Leads — the pre-opportunity capture record.
//
// A Lead is NOT a person. The person lives once in `contacts`; a Lead points at
// that contact via `contactId` and holds only what's true about the *inquiry*:
// where it came from, what they asked about, enrichment captured at the time,
// and where it sits in the lead lifecycle. That split is what keeps a Riley Chen
// in Leads and a Riley Chen in Contacts from being two different people.
//
// Two shapes fed this collection historically — seeded CRM leads carrying
// `stage`, and live website/RSVP submissions carrying `status` + `kind`.
// `normalizeLead` folds both into the model below, so callers never branch.

export type LeadStatus =
  | "new"
  | "unassigned"
  | "assigned"
  | "attempting"
  | "contacted"
  | "nurture"
  | "qualified"
  | "disqualified"
  | "in_pipeline"
  | "converted";

export type Lead = {
  id: string;
  /** The person record. Every lead resolves its identity through this. */
  contactId: string | null;
  status: LeadStatus;
  source: string;
  campaign?: string;
  /** What the inquiry was about — "Placement — Paid", "Advertise", etc. */
  interest?: string;
  /** Inbound submission type: contact | placement | booking | rsvp | card. */
  kind?: string;
  subject?: string;
  message?: string;
  /** Enrichment captured with the inquiry (venue qualification, traffic, etc). */
  meta?: Record<string, unknown>;
  value: number;
  owner: string;
  notes: string;
  /** Set once the lead is worked in the pipeline. Never cleared on role change. */
  opportunityId?: string | null;
  createdAt: string;

  // Snapshot of the inquiry as submitted. Kept for provenance only — never read
  // for display, since the contact is the source of truth for identity.
  capturedName?: string;
  capturedEmail?: string;
  capturedPhone?: string;
  capturedCompany?: string;
};

export const LEAD_STATUS: Record<LeadStatus, { label: string; tone: string; open: boolean }> = {
  new: { label: "New", tone: "bg-brand/15 text-brand-strong", open: true },
  unassigned: { label: "Unassigned", tone: "bg-warning/15 text-warning", open: true },
  assigned: { label: "Assigned", tone: "bg-accent text-accent-foreground", open: true },
  attempting: { label: "Attempting contact", tone: "bg-accent text-accent-foreground", open: true },
  contacted: { label: "Contacted", tone: "bg-accent text-accent-foreground", open: true },
  nurture: { label: "Nurture", tone: "bg-secondary text-secondary-foreground", open: true },
  qualified: { label: "Qualified", tone: "bg-success/15 text-success", open: true },
  disqualified: { label: "Disqualified", tone: "bg-muted text-muted-foreground", open: false },
  in_pipeline: { label: "In pipeline", tone: "bg-brand/15 text-brand-strong", open: false },
  converted: { label: "Converted", tone: "bg-success/15 text-success", open: false },
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new", "unassigned", "assigned", "attempting", "contacted", "nurture", "qualified", "disqualified", "in_pipeline", "converted",
];

/** Statuses still worth working — drives the Leads board and "open leads" counts. */
export const OPEN_LEAD_STATUSES: LeadStatus[] = ["new", "unassigned", "assigned", "attempting", "contacted", "nurture", "qualified"];

export const LEAD_SOURCES = [
  "Manual entry", "Lead generation", "Data enrichment", "Website", "Advertising inquiry",
  "Venue inquiry", "Partner inquiry", "Referral", "Phone", "SMS", "Email", "Event",
  "Campaign", "CSV import", "API / integration", "Existing contact", "Business card", "Other",
];

// Legacy `stage` values (seeded CRM leads) and inbound `status` values (website
// forms, RSVPs) both land on a LeadStatus.
const LEGACY_STAGE_TO_STATUS: Record<string, LeadStatus> = {
  new: "new",
  contacted: "contacted",
  qualified: "qualified",
  unqualified: "disqualified",
};
const INBOUND_STATUS_TO_STATUS: Record<string, LeadStatus> = {
  new: "new",
  unread: "new",
  read: "new", // "read" only means someone opened it — not that it was worked.
  archived: "disqualified",
};

type RawLead = Partial<Lead> & Record<string, unknown>;

/** Fold any historical lead shape into the current model. Safe to call twice. */
export function normalizeLead(raw: RawLead): Lead {
  const legacyStage = typeof raw.stage === "string" ? raw.stage : "";
  const rawStatus = typeof raw.status === "string" ? raw.status : "";
  const status: LeadStatus =
    (LEAD_STATUS[rawStatus as LeadStatus] ? (rawStatus as LeadStatus) : undefined) ??
    LEGACY_STAGE_TO_STATUS[legacyStage] ??
    INBOUND_STATUS_TO_STATUS[rawStatus] ??
    "new";

  const name = String(raw.capturedName ?? raw.name ?? [raw.firstName, raw.lastName].filter(Boolean).join(" ") ?? "").trim();

  return {
    id: String(raw.id ?? ""),
    contactId: (raw.contactId as string | null) ?? null,
    status,
    source: String(raw.source ?? "Other"),
    campaign: raw.campaign as string | undefined,
    interest: raw.interest as string | undefined,
    kind: raw.kind as string | undefined,
    subject: raw.subject as string | undefined,
    message: raw.message as string | undefined,
    meta: (raw.meta as Record<string, unknown>) ?? undefined,
    value: Number(raw.value ?? 0) || 0,
    owner: String(raw.owner ?? ""),
    notes: String(raw.notes ?? ""),
    opportunityId: (raw.opportunityId as string | null) ?? null,
    createdAt: String(raw.createdAt ?? new Date(0).toISOString()),
    capturedName: name || undefined,
    capturedEmail: String(raw.capturedEmail ?? raw.email ?? "").trim().toLowerCase() || undefined,
    capturedPhone: String(raw.capturedPhone ?? raw.phone ?? "").trim() || undefined,
    capturedCompany: String(raw.capturedCompany ?? raw.company ?? "").trim() || undefined,
  };
}

/** Digits-only phone key used to match a lead to an existing contact. */
export const phoneKey = (v: string | undefined | null) => (v || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

/** True once the lead has been handed to the pipeline. */
export const leadIsInPipeline = (l: Lead) => Boolean(l.opportunityId);

// ── Display view ──────────────────────────────────────────────────────────────
// Identity is resolved from the linked contact at read time, never copied onto
// the lead. Captured values are the fallback for a lead not yet linked.

export type LeadPerson = { id: string; name?: string; company?: string; title?: string; email?: string; phone?: string };

export type LeadView = Lead & {
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  linked: boolean;
};

export function toLeadView(lead: Lead, contact?: LeadPerson | null): LeadView {
  return {
    ...lead,
    name: contact?.name || lead.capturedName || "Unnamed lead",
    company: contact?.company || lead.capturedCompany || "",
    title: contact?.title || "",
    email: contact?.email || lead.capturedEmail || "",
    phone: contact?.phone || lead.capturedPhone || "",
    linked: Boolean(contact),
  };
}

/**
 * Leads are captured from live inbound traffic, never seeded — a demo person
 * here would become a real duplicate contact the moment someone worked it.
 */
export const seedLeads: Lead[] = [];
