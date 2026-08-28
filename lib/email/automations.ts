// Email automations — Channel Cast pipeline and lifecycle events firing a
// template. Shared by the Automations UI and the server-side dispatcher.

export type EmailTrigger = {
  key: string;
  label: string;
  group: "Lead" | "Opportunity" | "Outcome" | "Billing";
  hint: string;
  /** Fields the rule can narrow on, offered as condition inputs. */
  conditions?: { key: string; label: string }[];
};

export const EMAIL_TRIGGERS: EmailTrigger[] = [
  { key: "lead_created", label: "Lead created", group: "Lead", hint: "A new enquiry lands in the Leads inbox." },
  { key: "lead_assigned", label: "Lead assigned", group: "Lead", hint: "A lead gets an owner." },
  { key: "lead_qualified", label: "Lead qualified", group: "Lead", hint: "A lead is marked Qualified." },
  { key: "added_to_pipeline", label: "Added to pipeline", group: "Lead", hint: "A lead becomes an active opportunity." },

  { key: "stage_changed", label: "Stage changed", group: "Opportunity", hint: "An opportunity moves stage.", conditions: [{ key: "stage", label: "Only this stage" }] },
  { key: "proposal_sent", label: "Proposal sent", group: "Opportunity", hint: "The opportunity reaches Proposal." },
  { key: "owner_changed", label: "Owner changed", group: "Opportunity", hint: "An opportunity is reassigned." },
  { key: "next_step_overdue", label: "Next step overdue", group: "Opportunity", hint: "The next step's due date has passed." },
  { key: "opportunity_stalled", label: "Opportunity stalled", group: "Opportunity", hint: "No activity for the configured window." },
  { key: "close_date_approaching", label: "Close date approaching", group: "Opportunity", hint: "Expected close is near." },

  { key: "closed_won", label: "Closed Won", group: "Outcome", hint: "Kick off onboarding." },
  { key: "closed_lost", label: "Closed Lost", group: "Outcome", hint: "Send a graceful close, or start nurture." },
  { key: "opportunity_reopened", label: "Opportunity reopened", group: "Outcome", hint: "A closed opportunity is reopened." },

  { key: "invoice_sent", label: "Invoice sent", group: "Billing", hint: "An invoice goes out." },
  { key: "invoice_overdue", label: "Invoice overdue", group: "Billing", hint: "An invoice passes its due date." },
];

export const TRIGGER_BY_KEY = Object.fromEntries(EMAIL_TRIGGERS.map((t) => [t.key, t])) as Record<string, EmailTrigger>;

export const TRIGGER_GROUPS = ["Lead", "Opportunity", "Outcome", "Billing"] as const;

export type EmailAutomation = {
  id: string;
  name: string;
  trigger_key: string;
  template_id: string | null;
  enabled: boolean;
  conditions: Record<string, string>;
  delay_minutes: number;
  recipient: "contact" | "owner" | "custom";
  custom_email: string | null;
  runs: number;
  last_run_at: string | null;
  owner: string | null;
};

export const RECIPIENT_OPTIONS = [
  { key: "contact", label: "The record's primary contact" },
  { key: "owner", label: "The assigned owner" },
  { key: "custom", label: "A fixed address" },
];

/** Minimum gap before the same rule may fire again for the same record. */
export const DEDUPE_WINDOW_MINUTES = 60;
