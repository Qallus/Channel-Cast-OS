export type Channel = "email" | "sms" | "push" | "in_app";
export type TemplateStatus = "active" | "draft" | "archived";

export type CommTemplate = {
  id: string;
  name: string;
  channel: Channel;
  category: string;
  subject: string;
  body: string;
  status: TemplateStatus;
  sends: number;
  lastSent: string | null; // ISO date
  owner: string;
  createdAt: string;
};

export const CHANNEL: Record<Channel, { label: string; tone: string }> = {
  email: { label: "Email", tone: "bg-brand/15 text-brand-strong" },
  sms: { label: "SMS", tone: "bg-success/15 text-success" },
  push: { label: "Push", tone: "bg-accent text-accent-foreground" },
  in_app: { label: "In-app", tone: "bg-secondary text-secondary-foreground" },
};
export const CHANNEL_ORDER: Channel[] = ["email", "sms", "push", "in_app"];

export const TEMPLATE_STATUS: Record<TemplateStatus, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-success/15 text-success" },
  draft: { label: "Draft", tone: "bg-muted text-muted-foreground" },
  archived: { label: "Archived", tone: "bg-secondary text-secondary-foreground" },
};
export const TEMPLATE_STATUS_ORDER: TemplateStatus[] = ["active", "draft", "archived"];

export const COMM_CATEGORIES = ["Onboarding", "Billing", "Campaign", "Support", "Marketing", "System"];

export const seedCommTemplates: CommTemplate[] = [
  { id: "cm_welcome", name: "Client welcome", channel: "email", category: "Onboarding", subject: "Welcome to Channel Cast, {{client}}", body: "Hi {{contact}},\n\nWelcome aboard! Your devices are being provisioned and your first campaign can go live once creative is approved.\n\n— The Channel Cast team", status: "active", sends: 142, lastSent: "2026-07-29", owner: "Alex Rivera", createdAt: "2026-01-12T00:00:00.000Z" },
  { id: "cm_invoice", name: "Invoice reminder", channel: "email", category: "Billing", subject: "Invoice {{number}} is due {{dueDate}}", body: "Hi {{contact}},\n\nA friendly reminder that invoice {{number}} for {{amount}} is due on {{dueDate}}.\n\nThank you!", status: "active", sends: 88, lastSent: "2026-07-30", owner: "Jordan Cole", createdAt: "2026-01-20T00:00:00.000Z" },
  { id: "cm_offline", name: "Device offline alert", channel: "push", category: "System", subject: "Device offline", body: "{{device}} at {{location}} has been offline for {{minutes}} minutes.", status: "active", sends: 512, lastSent: "2026-07-30", owner: "Devon Park", createdAt: "2026-03-02T00:00:00.000Z" },
  { id: "cm_quote", name: "Quote received (internal)", channel: "in_app", category: "Support", subject: "New quote request", body: "New {{requestType}} request from {{company}} — assigned to {{owner}}. SLA due {{dueDate}}.", status: "active", sends: 63, lastSent: "2026-07-30", owner: "Maya Chen", createdAt: "2026-04-05T00:00:00.000Z" },
  { id: "cm_recap", name: "Campaign recap", channel: "email", category: "Campaign", subject: "Your {{campaign}} results", body: "Hi {{contact}},\n\n{{campaign}} wrapped with {{plays}} plays. Full recap attached.\n\nLet's plan the next flight!", status: "active", sends: 27, lastSent: "2026-07-26", owner: "Leo Martins", createdAt: "2026-05-11T00:00:00.000Z" },
  { id: "cm_sms_live", name: "Campaign live (SMS)", channel: "sms", category: "Campaign", subject: "", body: "Channel Cast: {{campaign}} is now live across {{locations}} locations. Reply STOP to opt out.", status: "draft", sends: 0, lastSent: null, owner: "Leo Martins", createdAt: "2026-07-22T00:00:00.000Z" },
  { id: "cm_promo", name: "Reseller promo (2025)", channel: "email", category: "Marketing", subject: "Partner spring promo", body: "Legacy partner promo. Do not resend.", status: "archived", sends: 340, lastSent: "2025-04-10", owner: "Alex Rivera", createdAt: "2025-03-15T00:00:00.000Z" },
];
