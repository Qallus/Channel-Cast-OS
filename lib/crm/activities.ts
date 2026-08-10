// Activity / communications history — the timeline that stays with a contact (and
// optionally a deal). Calls (Twilio Voice), SMS, emails, notes, and stage changes.

export type ActivityKind = "note" | "call" | "sms" | "email" | "meeting" | "task" | "stage";

export type Activity = {
  id: string;
  contactId?: string | null;
  dealId?: string | null;
  kind: ActivityKind;
  body: string;
  actor: string;
  createdAt: string; // ISO datetime
};

export const ACTIVITY_KIND: Record<ActivityKind, { label: string; icon: string; tone: string }> = {
  note: { label: "Note", icon: "StickyNote", tone: "bg-muted text-muted-foreground" },
  call: { label: "Call", icon: "Phone", tone: "bg-brand/15 text-brand-strong" },
  sms: { label: "SMS", icon: "MessageSquare", tone: "bg-accent text-accent-foreground" },
  email: { label: "Email", icon: "Mail", tone: "bg-accent text-accent-foreground" },
  meeting: { label: "Meeting", icon: "CalendarClock", tone: "bg-secondary text-secondary-foreground" },
  task: { label: "Task", icon: "ListChecks", tone: "bg-secondary text-secondary-foreground" },
  stage: { label: "Stage change", icon: "Shuffle", tone: "bg-warning/15 text-warning" },
};

export const seedActivities: Activity[] = [
  { id: "ac_1", contactId: "ct_dana", kind: "call", body: "Call: walked through the two-tower expansion timeline. Verbal yes.", actor: "Jeremy Waters", createdAt: "2026-07-24T16:10:00.000Z" },
  { id: "ac_2", contactId: "ct_dana", kind: "email", body: "Email: sent the redlined contract to legal.", actor: "Jeremy Waters", createdAt: "2026-07-25T14:02:00.000Z" },
  { id: "ac_3", contactId: "ct_priya", kind: "email", body: "Email: ROI one-pager sent for the AI-vision upgrade.", actor: "Jordan Cole", createdAt: "2026-07-27T18:20:00.000Z" },
  { id: "ac_4", contactId: "ct_tony", kind: "note", body: "Wants revenue-share terms before committing — draft a custom quote.", actor: "Jordan Cole", createdAt: "2026-07-26T21:00:00.000Z" },
  { id: "ac_5", contactId: "ct_wes", kind: "sms", body: "SMS: confirmed intro call for the affiliate deal on Thursday.", actor: "Jeremy Waters", createdAt: "2026-07-21T15:30:00.000Z" },
];
