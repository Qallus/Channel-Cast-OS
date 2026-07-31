export type TriggerType =
  | "device_offline"
  | "playback_complete"
  | "quote_received"
  | "invoice_overdue"
  | "campaign_ends"
  | "schedule_daily";

export type ActionType = "send_email" | "notify_team" | "create_task" | "webhook" | "assign_owner";

export type Automation = {
  id: string;
  name: string;
  trigger: TriggerType;
  condition: string;
  action: ActionType;
  target: string;
  enabled: boolean;
  runs: number;
  lastRun: string | null; // ISO date
  notes: string;
  createdAt: string;
};

export const TRIGGER: Record<TriggerType, { label: string; tone: string }> = {
  device_offline: { label: "Device goes offline", tone: "bg-destructive/15 text-destructive" },
  playback_complete: { label: "Playback completes", tone: "bg-success/15 text-success" },
  quote_received: { label: "Quote request received", tone: "bg-brand/15 text-brand" },
  invoice_overdue: { label: "Invoice overdue", tone: "bg-warning/15 text-warning" },
  campaign_ends: { label: "Campaign ends", tone: "bg-accent text-accent-foreground" },
  schedule_daily: { label: "Daily schedule", tone: "bg-secondary text-secondary-foreground" },
};
export const TRIGGER_ORDER: TriggerType[] = ["device_offline", "playback_complete", "quote_received", "invoice_overdue", "campaign_ends", "schedule_daily"];

export const ACTION: Record<ActionType, { label: string }> = {
  send_email: { label: "Send email" },
  notify_team: { label: "Notify team" },
  create_task: { label: "Create task" },
  webhook: { label: "Call webhook" },
  assign_owner: { label: "Assign owner" },
};
export const ACTION_ORDER: ActionType[] = ["send_email", "notify_team", "create_task", "webhook", "assign_owner"];

export const seedAutomations: Automation[] = [
  { id: "au_offline", name: "Alert on device offline", trigger: "device_offline", condition: "Offline > 5 minutes", action: "notify_team", target: "Ops channel", enabled: true, runs: 34, lastRun: "2026-07-30", notes: "Pages the on-call ops engineer.", createdAt: "2026-03-01T00:00:00.000Z" },
  { id: "au_overdue", name: "Dunning on overdue invoice", trigger: "invoice_overdue", condition: "Past due > 3 days", action: "send_email", target: "Billing contact", enabled: true, runs: 12, lastRun: "2026-07-29", notes: "Sends the reminder sequence.", createdAt: "2026-03-15T00:00:00.000Z" },
  { id: "au_quote", name: "Route new quote requests", trigger: "quote_received", condition: "Any new request", action: "assign_owner", target: "Deal desk round-robin", enabled: true, runs: 28, lastRun: "2026-07-30", notes: "Assigns to the next rep and starts the SLA timer.", createdAt: "2026-04-02T00:00:00.000Z" },
  { id: "au_campaign", name: "Campaign wrap-up recap", trigger: "campaign_ends", condition: "Status → completed", action: "create_task", target: "Account owner", enabled: true, runs: 9, lastRun: "2026-07-26", notes: "Creates a recap task for the AE.", createdAt: "2026-05-10T00:00:00.000Z" },
  { id: "au_digest", name: "Weekly performance digest", trigger: "schedule_daily", condition: "Mondays 8am", action: "send_email", target: "Leadership", enabled: false, runs: 3, lastRun: "2026-07-13", notes: "Paused while report format is revised.", createdAt: "2026-06-01T00:00:00.000Z" },
  { id: "au_playback", name: "Sync playback to webhook", trigger: "playback_complete", condition: "Motion-triggered plays", action: "webhook", target: "https://hooks.example.com/plays", enabled: true, runs: 1840, lastRun: "2026-07-30", notes: "Feeds the advertiser analytics pipeline.", createdAt: "2026-04-20T00:00:00.000Z" },
];
