"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Ban, Bot, Briefcase, Building2, CalendarClock, Check, ChevronRight, CircleAlert,
  FileSignature, Mail, MessageSquare, Maximize2, Mic, Minimize2, Phone, Plus, Receipt, Settings2,
  Sparkles, StickyNote, Trash2, Trophy, Voicemail, Wallet,
} from "lucide-react";

import { Avatar, DetailField, EmptyState, FormField } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toast, useToast } from "@/components/ui/toast";
import { AgentPanel, DialpadPanel, EmailPanel, SmsPanel, VoiceNotePanel } from "@/components/comm/record-tools";
import { AddFieldDialog } from "@/components/crm/add-field-dialog";
import { LOG_KINDS, LogActivityDialog, type LogKind, type LogPayload } from "@/components/crm/log-activity-dialog";
import { LinkedRecords, OpportunityRecords, RECORD_ACTIONS, type RecordAction } from "@/components/crm/opportunity-records";
import { StageConfigDialog } from "@/components/crm/stage-config-dialog";
import { AppointmentsCard, ScheduleDialog } from "@/components/crm/opportunity-schedule";
import { useSidebarCollapsed } from "@/components/layout/sidebar-state";
import { WorkspaceEditorSurface } from "@/components/workspace/plate-editor";
import { CONTACT_TYPE, CONTACT_TYPE_ORDER, Contact, contactName, seedContacts } from "@/lib/crm/contacts";
import { Lead, LEAD_STATUS, seedLeads } from "@/lib/crm/leads";
import {
  DEAL_STAGE, DEAL_STAGE_ORDER, type CustomField, type CustomFieldType, Deal, DealStage, LOST_REASONS, NEXT_STEP_TYPES, type NextStep, type NextStepType, OPPORTUNITY_TYPES, PIPELINE_PATH,
  daysInStage, daysOpen, isClosed, needsNextStep, seedDeals, weightedValue,
} from "@/lib/crm/deals";
import {
  STAGE_CONFIG_ID, blockingSteps, newItemId, resolveStage, stepsFor,
  type StageConfigRecord, type StoredStage,
} from "@/lib/crm/stage-config";
import { useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtWhen = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const duration = (s?: number | null) => {
  if (!s) return null;
  const m = Math.floor(s / 60);
  return m ? `${m}m ${s % 60}s` : `${s}s`;
};

type Activity = {
  id: string; kind: string; direction?: string; from?: string; to?: string;
  subject?: string; body?: string; status?: string; disposition?: string;
  durationSeconds?: number; recordingUrl?: string; hasTranscript?: boolean; transcript?: string;
  aiSummary?: string; occurredAt: string; actor?: string; association?: string;
  aiMeta?: { amount?: number } | null;
};

const CHANNEL: Record<string, { label: string; icon: typeof Phone; tone: string }> = {
  call: { label: "Call", icon: Phone, tone: "bg-brand/15 text-brand-strong" },
  sms: { label: "SMS", icon: MessageSquare, tone: "bg-accent text-accent-foreground" },
  email: { label: "Email", icon: Mail, tone: "bg-accent text-accent-foreground" },
  ai_voice: { label: "AI Voice", icon: Sparkles, tone: "bg-brand/15 text-brand-strong" },
  voicemail: { label: "Voicemail", icon: Voicemail, tone: "bg-muted text-muted-foreground" },
  meeting: { label: "Meeting", icon: CalendarClock, tone: "bg-secondary text-secondary-foreground" },
  voice: { label: "Voice note", icon: Mic, tone: "bg-muted text-muted-foreground" },
  note: { label: "Note", icon: StickyNote, tone: "bg-muted text-muted-foreground" },
  task: { label: "Task", icon: Check, tone: "bg-secondary text-secondary-foreground" },
  // Deal milestones. They read as money and paperwork rather than messages, but
  // they belong in the same ordered stream: "what happened on this deal" is one
  // question, not four.
  invoice: { label: "Invoice", icon: Receipt, tone: "bg-accent text-accent-foreground" },
  payment: { label: "Payment", icon: Wallet, tone: "bg-success/15 text-success" },
  contract: { label: "Contract", icon: FileSignature, tone: "bg-secondary text-secondary-foreground" },
};

/**
 * Timeline tabs. `kinds` is null for All; every other tab owns the channel kinds
 * it displays, so a voicemail files under Voice notes rather than its own tab.
 */
const TIMELINE_TABS: { key: string; label: string; kinds: string[] | null; log: LogKind | null }[] = [
  { key: "all", label: "All", kinds: null, log: null },
  { key: "call", label: "Call", kinds: ["call"], log: "call" },
  { key: "email", label: "Email", kinds: ["email"], log: "email" },
  { key: "sms", label: "Text", kinds: ["sms"], log: "sms" },
  { key: "note", label: "Notes", kinds: ["note"], log: "note" },
  { key: "voice", label: "Voice notes", kinds: ["voice", "voicemail"], log: "voice" },
  { key: "ai_voice", label: "AI Agent", kinds: ["ai_voice"], log: "ai_voice" },
  { key: "meeting", label: "Appointments", kinds: ["meeting"], log: "meeting" },
  { key: "invoice", label: "Invoices", kinds: ["invoice"], log: "invoice" },
  { key: "payment", label: "Payments", kinds: ["payment"], log: "payment" },
  { key: "contract", label: "Contracts", kinds: ["contract"], log: "contract" },
];

const SEEN_KEY = (opportunityId: string) => `cc:timeline-seen:${opportunityId}`;

type SeenMap = Record<string, string>;

function readSeen(opportunityId: string): SeenMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY(opportunityId)) || "{}") as SeenMap;
  } catch {
    return {};
  }
}

/**
 * Click-to-edit field. Everything on this page describes a live deal — value,
 * close date, owner — and those move constantly, so reading and changing them
 * should be the same gesture rather than a trip to a separate edit form.
 */
function Editable({
  value, onSave, type = "text", options, placeholder = "—", align = "right", format,
}: {
  value: string | number | null | undefined;
  onSave: (next: string) => void;
  type?: "text" | "number" | "date" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  align?: "left" | "right";
  format?: (v: string | number | null | undefined) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function begin() {
    setDraft(value === null || value === undefined ? "" : String(value));
    setEditing(true);
  }
  function commit() {
    setEditing(false);
    if (draft !== String(value ?? "")) onSave(draft);
  }

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (editing && type === "select") {
    return (
      <Select
        value={draft}
        onValueChange={(v) => { setEditing(false); if (v !== String(value ?? "")) onSave(v); }}
        open
        onOpenChange={(o) => !o && setEditing(false)}
      >
        <SelectTrigger className="h-7 w-full text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>{(options ?? []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    );
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type === "number" ? "number" : type === "date" ? "date" : "text"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          // Escape must discard, not save — a mistyped deal value is worse than none.
          if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
        }}
        className={cn("h-7 text-sm", align === "right" && "text-right")}
      />
    );
  }

  const empty = value === null || value === undefined || value === "";
  return (
    <button
      type="button"
      onClick={begin}
      title="Click to edit"
      className={cn(
        "w-full rounded px-1 py-0.5 text-sm transition-colors hover:bg-muted/60",
        align === "right" ? "text-right" : "text-left",
        empty ? "text-muted-foreground/60" : "text-foreground",
      )}
    >
      {empty ? placeholder : format ? format(value) : String(value)}
    </button>
  );
}

// ── Panels ───────────────────────────────────────────────────────────────────
function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/**
 * The stage path — a tabbed segmented control on Channel Cast's own radius.
 * Salesforce's completed / current / upcoming *reading* is the useful part; its
 * chevron shape is not, so the tabs stay square-cornered to our token instead.
 */
function StagePath({ stage, onSet }: { stage: DealStage; onSet: (s: DealStage) => void }) {
  const idx = PIPELINE_PATH.indexOf(stage);
  const lost = stage === "closed_lost";

  return (
    <div className="flex w-full min-w-0 flex-nowrap gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Sales stage">
      {PIPELINE_PATH.map((s, i) => {
        const done = idx >= 0 && i < idx;
        const active = i === idx;
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSet(s)}
            title={`Move to ${DEAL_STAGE[s].label}`}
            className={cn(
              "flex min-w-[108px] flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? lost ? "bg-destructive text-destructive-foreground" : "bg-brand-strong text-background"
                : done
                  ? "bg-brand/20 text-brand-strong hover:bg-brand/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {done && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            <span className="truncate">{DEAL_STAGE[s].label}</span>
          </button>
        );
      })}
      {lost && (
        <span className="flex shrink-0 items-center rounded-md bg-destructive px-3 py-2.5 text-xs font-semibold text-destructive-foreground">
          Closed Lost
        </span>
      )}
    </div>
  );
}

function ActivityRow({ a, onOpen }: { a: Activity; onOpen: () => void }) {
  const ch = CHANNEL[a.kind] ?? CHANNEL.note;
  const Icon = ch.icon;
  const preview = a.subject || (a.body || "").replace(/<[^>]+>/g, " ").trim().slice(0, 90);
  // "Outbound call" reads well; an invoice has no direction, so it is just
  // "Invoice" rather than a sentence with a hole where the direction went.
  const dir = a.direction === "inbound" ? "Inbound" : a.direction === "outbound" ? "Outbound" : null;
  const heading = dir ? `${dir} ${ch.label.toLowerCase()}` : ch.label;
  const amount = typeof a.aiMeta?.amount === "number" ? a.aiMeta.amount : null;
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-brand/40">
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", ch.tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-foreground">{heading}</span>
          {amount !== null && <span className="text-sm font-semibold tabular-nums text-foreground">{usd.format(amount)}</span>}
          <span className="text-xs text-muted-foreground">{fmtWhen(a.occurredAt)}</span>
          {duration(a.durationSeconds) && <span className="text-xs text-muted-foreground">· {duration(a.durationSeconds)}</span>}
          {a.disposition && <span className="text-xs text-muted-foreground">· {a.disposition}</span>}
          {a.hasTranscript && <Badge className="border-transparent bg-brand/15 text-[10px] text-brand-strong">Transcript</Badge>}
          {a.association === "ambiguous" && <Badge className="border-transparent bg-warning/15 text-[10px] text-warning">Needs review</Badge>}
        </span>
        {preview && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{preview}</span>}
      </span>
      <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
    </button>
  );
}

function RecordingPlayer({ recordingUrl }: { recordingUrl?: string }) {
  const [urls, setUrls] = useState<string[] | null>(null);
  useEffect(() => {
    if (!recordingUrl) return;
    let alive = true;
    fetch(recordingUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setUrls((d?.recordings ?? []).map((r: { audioUrl: string }) => r.audioUrl)); })
      .catch(() => alive && setUrls([]));
    return () => { alive = false; };
  }, [recordingUrl]);
  if (!recordingUrl) return null;
  if (urls === null) return <p className="text-xs text-muted-foreground">Loading recording…</p>;
  if (!urls.length) return <p className="text-xs text-muted-foreground">No recording for this call.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recording</p>
      {urls.map((u) => <audio key={u} controls preload="none" src={u} className="w-full" />)}
    </div>
  );
}

function ActivityDetail({ a, onClose }: { a: Activity | null; onClose: () => void }) {
  const ch = a ? CHANNEL[a.kind] ?? CHANNEL.note : null;
  return (
    <Dialog open={Boolean(a)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{ch?.label} · {a ? fmtWhen(a.occurredAt) : ""}</DialogTitle></DialogHeader>
        {a && (
          <div className="space-y-4">
            <div className="grid gap-x-6 sm:grid-cols-2">
              <DetailField label="Direction">{a.direction ?? "—"}</DetailField>
              <DetailField label="Status">{a.status ?? "—"}</DetailField>
              <DetailField label="From">{a.from ?? "—"}</DetailField>
              <DetailField label="To">{a.to ?? "—"}</DetailField>
              {a.durationSeconds ? <DetailField label="Duration">{duration(a.durationSeconds)}</DetailField> : null}
              {a.disposition ? <DetailField label="Outcome">{a.disposition}</DetailField> : null}
            </div>
            {a.aiSummary && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI summary</p>
                <p className="text-sm text-foreground">{a.aiSummary}</p>
              </div>
            )}
            {(a.kind === "call" || a.kind === "ai_voice") && <RecordingPlayer recordingUrl={a.recordingUrl} />}
            {a.transcript && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transcript</p>
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border p-3 text-sm text-foreground">{a.transcript}</p>
              </div>
            )}
            {a.body && a.kind !== "call" && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</p>
                {a.kind === "email"
                  ? <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-white p-3 text-sm text-[#14241a]" dangerouslySetInnerHTML={{ __html: a.body }} />
                  : <p className="whitespace-pre-wrap rounded-lg border border-border p-3 text-sm text-foreground">{a.body}</p>}
              </div>
            )}
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ToolId = "call" | "email" | "sms" | "schedule" | "note" | "voice" | "agent";

const TOOL_META: Record<ToolId, { label: string; title: string; icon: typeof Phone; wide?: boolean }> = {
  call: { label: "Call", title: "Dialpad", icon: Phone },
  email: { label: "Email", title: "Send an email", icon: Mail, wide: true },
  sms: { label: "Text", title: "Send a text", icon: MessageSquare },
  schedule: { label: "Schedule", title: "Schedule an appointment", icon: CalendarClock },
  note: { label: "Note", title: "Add a note", icon: StickyNote, wide: true },
  voice: { label: "Voice note", title: "Record a voice note", icon: Mic },
  agent: { label: "AI Agent", title: "Nicole — AI voice agent", icon: Bot, wide: true },
};

/**
 * Shell for the record tools. Everything opened here already carries the
 * opportunity, contact and lead ids, so whatever the user does attaches to this
 * record without a manual log step.
 */
function ToolModal({
  tool, onClose, full, setFull, children,
}: { tool: ToolId | null; onClose: () => void; full: boolean; setFull: (v: boolean) => void; children: React.ReactNode }) {
  useEffect(() => { if (!tool) setFull(false); }, [tool, setFull]);
  const meta = tool ? TOOL_META[tool] : null;
  return (
    <Dialog open={Boolean(tool)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          full
            ? "flex h-[96vh] w-[96vw] max-w-none flex-col gap-3 overflow-hidden"
            : cn("max-h-[90vh] overflow-y-auto", meta?.wide ? "max-w-3xl" : "max-w-md"),
        )}
      >
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <DialogTitle className="flex items-center gap-2">
            {meta ? <meta.icon className="h-4 w-4 text-brand-strong" /> : null}
            {meta?.title}
          </DialogTitle>
          {/* Sits clear of DialogContent's own close button. */}
          <button type="button" onClick={() => setFull(!full)}
            aria-label={full ? "Exit full screen" : "Expand to full screen"}
            className="mr-7 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </DialogHeader>
        <div className={cn(full ? "flex min-h-0 flex-1 flex-col overflow-hidden" : undefined)}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}

type RailItem = { key: string; label: string; icon: typeof Phone; run: () => void };

/**
 * The opportunity's actions. Horizontal in the header normally; a vertical rail
 * beside the content when the main sidebar is collapsed, which is the only time
 * there's width to spare for one. Either way it's the same list in the same
 * order, so muscle memory survives the switch.
 */
function ActionRail({ items, vertical }: { items: RailItem[]; vertical: boolean }) {
  if (vertical) {
    return (
      <nav aria-label="Opportunity actions" className="sticky top-4 flex flex-col gap-1 rounded-xl border border-border bg-card p-2">
        {items.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={a.run}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <a.icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{a.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  // Never wraps: on a narrow screen the row scrolls sideways rather than
  // stacking into three ragged lines and pushing the record off the fold.
  return (
    <div className="-mx-1 flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((a) => (
        <Button key={a.key} size="sm" variant="outline" onClick={a.run} className="shrink-0">
          <a.icon className="h-3.5 w-3.5" /> {a.label}
        </Button>
      ))}
    </div>
  );
}

// ── Workspace ────────────────────────────────────────────────────────────────
export function OpportunityDetail({ id }: { id: string }) {
  const { items, update } = useCollection<Deal>("deals", seedDeals);
  const contactsCol = useCollection<Contact>("contacts", seedContacts);
  const leadsCol = useCollection<Lead>("leads", seedLeads);
  // Stage guidance and Next Steps are configuration, shared by every deal.
  const settingsCol = useCollection<StageConfigRecord>("settings", []);
  const stageConfig = settingsCol.items.find((r) => r.id === STAGE_CONFIG_ID) ?? null;

  const deal = items.find((d) => d.id === id) ?? null;
  const contact = deal?.contactId ? contactsCol.items.find((c) => c.id === deal.contactId) ?? null : null;
  // The originating lead, found by explicit link or by shared contact.
  const lead = deal
    ? leadsCol.items.find((l) => l.id === deal.leadId) ??
      leadsCol.items.find((l) => l.opportunityId === deal.id) ??
      (deal.contactId ? leadsCol.items.find((l) => l.contactId === deal.contactId) : undefined) ?? null
    : null;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("all");
  // Which tabs have been looked at, so a count can read as "new" or just "how many".
  // Read after mount — localStorage isn't available during server render.
  const [seen, setSeen] = useState<SeenMap>({});
  useEffect(() => { if (deal?.id) setSeen(readSeen(deal.id)); }, [deal?.id]);
  const [openActivity, setOpenActivity] = useState<Activity | null>(null);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [toolFull, setToolFull] = useState(false);
  const [closing, setClosing] = useState<"won" | "lost" | null>(null);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [nextStepOpen, setNextStepOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [stageConfigOpen, setStageConfigOpen] = useState(false);
  const [savingStages, setSavingStages] = useState(false);
  const [addStepLabel, setAddStepLabel] = useState("");
  const [logKind, setLogKind] = useState<LogKind | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  const [recordAction, setRecordAction] = useState<RecordAction | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const sidebarCollapsed = useSidebarCollapsed();
  const { toast, flash } = useToast();

  const dealId = deal?.id;
  const dealContactId = deal?.contactId;
  const dealLeadId = deal?.leadId;
  const loadTimeline = useCallback(async () => {
    if (!dealId) return;
    const params = new URLSearchParams({ opportunityId: dealId, limit: "100" });
    if (dealContactId) params.set("contactId", dealContactId);
    if (dealLeadId) params.set("leadId", dealLeadId);
    try {
      const res = await fetch(`/api/comm/timeline?${params}`);
      const data = await res.json();
      setActivities(data.activities ?? []);
      setCounts(data.counts ?? {});
    } catch { /* the workspace still works without the timeline */ }
  }, [dealId, dealContactId, dealLeadId]);
  useEffect(() => { void loadTimeline(); }, [loadTimeline]);

  const activeTab = TIMELINE_TABS.find((t) => t.key === filter) ?? null;
  const tabKinds = activeTab?.kinds ?? null;
  const shown = useMemo(
    () => (tabKinds ? activities.filter((a) => tabKinds.includes(a.kind)) : activities),
    [activities, tabKinds],
  );

  /** Total and unseen counts per tab. Unseen drives the highlighted badge. */
  const tabCounts = useMemo(() => {
    const out: Record<string, { total: number; unseen: number }> = {};
    for (const tab of TIMELINE_TABS) {
      const rows = tab.kinds ? activities.filter((a) => tab.kinds!.includes(a.kind)) : activities;
      const mark = seen[tab.key];
      out[tab.key] = {
        total: rows.length,
        // Never viewed => everything is new; otherwise anything since the visit.
        unseen: mark ? rows.filter((a) => new Date(a.occurredAt).getTime() > new Date(mark).getTime()).length : rows.length,
      };
    }
    return out;
  }, [activities, seen]);

  function openTab(key: string) {
    setFilter(key);
    if (!dealId) return;
    // Viewing a tab clears its "new" state, and All clears everything.
    const now = new Date().toISOString();
    const next: SeenMap = { ...seen, [key]: now };
    if (key === "all") for (const t of TIMELINE_TABS) next[t.key] = now;
    setSeen(next);
    try { window.localStorage.setItem(SEEN_KEY(dealId), JSON.stringify(next)); } catch { /* private mode */ }
  }

  if (!deal) {
    return (
      <div className="space-y-4">
        <Link href="/app/admin/pipeline" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to pipeline</Link>
        <EmptyState message="That opportunity no longer exists." />
      </div>
    );
  }

  const stageIdx = PIPELINE_PATH.indexOf(deal.stage);
  const closed = isClosed(deal.stage);
  const guide = resolveStage(deal.stage, stageConfig, deal);
  const checklist = stepsFor(deal, stageConfig);
  const nextStage = stageIdx >= 0 && stageIdx < PIPELINE_PATH.length - 1 ? PIPELINE_PATH[stageIdx + 1] : null;
  const lastActivity = activities[0]?.occurredAt ?? null;

  /** Patch the opportunity. Every inline edit funnels through here. */
  function save(patch: Partial<Deal>) {
    update(deal!.id, patch);
  }

  /** Owner changes are tracked, since who owns a deal is auditable. */
  function changeOwner(owner: string) {
    if (owner === deal!.owner) return;
    save({
      owner,
      ownerHistory: [...(deal!.ownerHistory ?? []), { owner, at: new Date().toISOString(), by: deal!.owner || "You" }],
    });
    flash(owner ? `Owner set to ${owner}.` : "Owner cleared.");
  }

  function setStage(next: DealStage) {
    const forward = PIPELINE_PATH.indexOf(next) > stageIdx;
    if (forward && !isClosed(next)) {
      const missing = blockingSteps(deal!, stageConfig, deal!.stage);
      if (missing.length) { setBlocked(missing.map((m) => m.label)); return; }
    }
    const now = new Date().toISOString();
    update(deal!.id, {
      stage: next,
      probability: DEAL_STAGE[next].defaultProb,
      stageEnteredAt: now,
      stageHistory: [...(deal!.stageHistory ?? []), { stage: next, at: now, by: deal!.owner || "You" }],
      ...(isClosed(next) ? { closedAt: now } : { closedAt: null }),
    });
    flash(`Moved to ${DEAL_STAGE[next].label}.`);

    // Let the email automations react. Fire-and-forget: a rule failing must
    // never block the stage change the user just made.
    const triggers = ["stage_changed"];
    if (next === "proposal") triggers.push("proposal_sent");
    if (next === "closed_won") triggers.push("closed_won");
    if (next === "closed_lost") triggers.push("closed_lost");
    for (const trigger of triggers) {
      void fetch("/api/email/trigger", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger, opportunityId: deal!.id, contactId: deal!.contactId, leadId: lead?.id ?? null, attributes: { stage: next } }),
      }).catch(() => {});
    }
  }

  function toggleCheck(itemId: string) {
    const key = `${deal!.stage}:${itemId}`;
    update(deal!.id, { checklist: { ...(deal!.checklist ?? {}), [key]: !deal!.checklist?.[key] } });
  }

  /* ── Lead / contact details ─────────────────────────────────────────── */

  /** Edit the person, not the deal — the contact record is the source of truth. */
  function saveContact(patch: Partial<Contact>) {
    if (!contact) return;
    contactsCol.update(contact.id, patch);
  }

  /* ── Key fields ─────────────────────────────────────────────────────── */

  function addCustomField(field: { label: string; type: CustomFieldType }) {
    const next: CustomField = { id: newItemId("fld"), label: field.label, type: field.type, value: "" };
    save({ customFields: [...(deal!.customFields ?? []), next] });
    setAddFieldOpen(false);
    flash(`Added “${field.label}”.`);
  }

  function setCustomField(id: string, value: string) {
    save({ customFields: (deal!.customFields ?? []).map((f) => (f.id === id ? { ...f, value } : f)) });
  }

  function removeCustomField(id: string) {
    const gone = (deal!.customFields ?? []).find((f) => f.id === id);
    save({ customFields: (deal!.customFields ?? []).filter((f) => f.id !== id) });
    if (gone) flash(`Removed “${gone.label}”.`);
  }

  /* ── Next Steps ─────────────────────────────────────────────────────── */

  /** An item for this deal alone. The stage template is edited separately. */
  function addStep() {
    const label = addStepLabel.trim();
    if (!label) return;
    save({ extraItems: [...(deal!.extraItems ?? []), { id: newItemId("step"), label, stage: deal!.stage }] });
    setAddStepLabel("");
  }

  function removeStep(itemId: string) {
    const key = `${deal!.stage}:${itemId}`;
    const checklistRest = { ...(deal!.checklist ?? {}) };
    delete checklistRest[key];
    save({ extraItems: (deal!.extraItems ?? []).filter((e) => e.id !== itemId), checklist: checklistRest });
  }

  async function saveStages(stages: Record<DealStage, StoredStage>) {
    setSavingStages(true);
    const record: StageConfigRecord = { id: STAGE_CONFIG_ID, stages };
    // The settings collection holds one document per concern; create doubles as
    // an upsert server-side, so a first run and an edit take the same path.
    const ok = stageConfig
      ? await settingsCol.update(STAGE_CONFIG_ID, record)
      : await settingsCol.create(record);
    setSavingStages(false);
    if (!ok) { flash("Couldn't save the stage setup. Try again.", "error"); return; }
    setStageConfigOpen(false);
    flash("Pipeline stages updated.");
  }

  /* ── Timeline ───────────────────────────────────────────────────────── */

  /** Log something that happened outside Channel Cast. */
  async function logActivity(payload: LogPayload) {
    setLogging(true);
    try {
      const res = await fetch("/api/comm/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          opportunityId: deal!.id,
          contactId: deal!.contactId ?? null,
          leadId: lead?.id ?? null,
          owner: deal!.owner || null,
          actor: deal!.owner || "You",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { flash(data?.error || "Couldn't save that entry.", "error"); return; }
      setLogOpen(false);
      await loadTimeline();
      flash(`${LOG_KINDS[payload.kind].label} logged.`);
    } catch {
      flash("Couldn't reach the server. Try again.", "error");
    } finally {
      setLogging(false);
    }
  }

  function confirmClose() {
    const now = new Date().toISOString();
    const stage: DealStage = closing === "won" ? "closed_won" : "closed_lost";
    update(deal!.id, {
      stage, probability: closing === "won" ? 100 : 0, closedAt: now, stageEnteredAt: now,
      stageHistory: [...(deal!.stageHistory ?? []), { stage, at: now, by: deal!.owner || "You" }],
      ...(closing === "won" ? { wonSummary: outcomeNotes } : { lostReason, lostNotes: outcomeNotes }),
    });
    setClosing(null); setOutcomeNotes("");
    flash(closing === "won" ? "Marked Closed Won." : "Marked Closed Lost.");
  }

  // Comms first, then the records an opportunity spawns — the order you'd work in.
  const railItems: RailItem[] = [
    ...(Object.keys(TOOL_META) as ToolId[]).map((t) => ({
      key: t,
      label: TOOL_META[t].label,
      icon: TOOL_META[t].icon,
      run: () => (t === "schedule" ? setScheduleOpen(true) : setTool(t)),
    })),
    ...RECORD_ACTIONS.map((a) => ({ key: a.key, label: a.label, icon: a.icon, run: () => setRecordAction(a.key) })),
  ];

  const ctx = {
    opportunityId: deal.id,
    contactId: deal.contactId ?? null,
    leadId: lead?.id ?? null,
    owner: deal.owner,
    personName: contact ? contactName(contact) : deal.client,
  };
  const tel = contact?.phone?.replace(/[^\d+]/g, "");

  return (
    <div className="space-y-4">
      <Link href="/app/admin/pipeline" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to pipeline</Link>

      {/* Record header */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-strong"><Briefcase className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Opportunity</p>
              <h1 className="truncate text-xl font-semibold text-foreground">{deal.name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {needsNextStep(deal) && <Badge className="border-transparent bg-warning/15 text-warning"><CircleAlert className="mr-1 h-3 w-3" />No next step</Badge>}
            {!closed && <Button size="sm" variant="outline" onClick={() => setClosing("won")}><Trophy className="h-3.5 w-3.5" /> Closed Won</Button>}
            {!closed && <Button size="sm" variant="outline" onClick={() => setClosing("lost")}><Ban className="h-3.5 w-3.5" /> Closed Lost</Button>}
          </div>
        </div>

        {/* Actions live here while the sidebar is expanded; collapsed, they move
            to the vertical rail beside the content. */}
        {!sidebarCollapsed && <div className="mt-3"><ActionRail items={railItems} vertical={false} /></div>}

        {/* Compact field strip, as on the Salesforce record header */}
        <div className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-5">
          <DetailField label="Account name">
            <Editable value={deal.client} align="left" onSave={(v) => save({ client: v })} placeholder="Add an account" />
          </DetailField>
          <DetailField label="Close date">
            <Editable value={deal.closeDate} type="date" align="left" onSave={(v) => save({ closeDate: v })} format={(v) => fmtDate(String(v))} />
          </DetailField>
          <DetailField label="Amount">
            <Editable value={deal.value} type="number" align="left" onSave={(v) => save({ value: Number(v) || 0 })} format={(v) => usd.format(Number(v) || 0)} />
          </DetailField>
          <DetailField label="Opportunity owner">
            <Editable value={deal.owner} align="left" placeholder="Unassigned" onSave={(v) => changeOwner(v)}
              format={(v) => <span className="inline-flex items-center gap-1.5"><Avatar name={String(v)} className="h-5 w-5 text-[10px]" />{String(v)}</span>} />
          </DetailField>
          <DetailField label="Stage">
            <Editable value={deal.stage} type="select" align="left"
              options={DEAL_STAGE_ORDER.map((sKey) => ({ value: sKey, label: DEAL_STAGE[sKey].label }))}
              onSave={(v) => setStage(v as DealStage)}
              format={(v) => <Badge className={cn("border-transparent", DEAL_STAGE[v as DealStage].tone)}>{DEAL_STAGE[v as DealStage].label}</Badge>} />
          </DetailField>
        </div>
      </div>

      {/* Stage path */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1"><StagePath stage={deal.stage} onSet={setStage} /></div>
          {!closed && nextStage && (
            <Button size="sm" onClick={() => setStage(nextStage)} className="shrink-0">
              <Check className="h-3.5 w-3.5" /> Mark stage complete
            </Button>
          )}
          <Toast toast={toast} />
        </div>
      </div>

      {/* Three-column record layout */}
      <div className={cn(
        "grid gap-4",
        sidebarCollapsed
          ? "xl:grid-cols-[minmax(0,170px)_minmax(0,290px)_minmax(0,1fr)_minmax(0,290px)]"
          : "xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,300px)]",
      )}>
        {sidebarCollapsed && <ActionRail items={railItems} vertical />}
        {/* Left rail — who this is */}
        <div className="space-y-4">
          <Panel title="Lead / contact details">
            {contact ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={contactName(contact)} src={contact.photoUrl} className="h-9 w-9" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{contactName(contact)}</p>
                    <p className="truncate text-xs text-muted-foreground">{contact.title || "—"}</p>
                  </div>
                </div>
                <div>
                  <DetailField label="Name">
                    <Editable value={contact.name} placeholder="Add a name" onSave={(v) => saveContact({ name: v })} />
                  </DetailField>
                  <DetailField label="Title">
                    <Editable value={contact.title} placeholder="Add a title" onSave={(v) => saveContact({ title: v })} />
                  </DetailField>
                  <DetailField label="Account">
                    <Editable value={contact.company} placeholder={deal.client || "Add an account"} onSave={(v) => saveContact({ company: v })} />
                  </DetailField>
                  {/* Editing and acting are different intents, so the channel
                      button sits beside the value rather than on top of it. */}
                  <DetailField label="Email">
                    <span className="flex items-center justify-end gap-1">
                      <Editable value={contact.email} placeholder="Add an email" onSave={(v) => saveContact({ email: v })} />
                      {contact.email && (
                        <button type="button" onClick={() => setTool("email")} title="Send an email"
                          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-brand-strong">
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </DetailField>
                  <DetailField label="Phone">
                    <span className="flex items-center justify-end gap-1">
                      <Editable value={contact.phone} placeholder="Add a phone" onSave={(v) => saveContact({ phone: v })} />
                      {contact.phone && (
                        <button type="button" onClick={() => setTool("call")} title="Call"
                          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-brand-strong">
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </DetailField>
                  <DetailField label="Website">
                    <Editable value={contact.website} placeholder="Add a website" onSave={(v) => saveContact({ website: v })} />
                  </DetailField>
                  <DetailField label="City">
                    <Editable value={contact.city} placeholder="Add a city" onSave={(v) => saveContact({ city: v })} />
                  </DetailField>
                  <DetailField label="State">
                    <Editable value={contact.state} placeholder="Add a state" onSave={(v) => saveContact({ state: v })} />
                  </DetailField>
                  <DetailField label="Role">
                    <Editable
                      value={contact.type}
                      type="select"
                      options={CONTACT_TYPE_ORDER.map((t) => ({ value: t, label: CONTACT_TYPE[t].label }))}
                      onSave={(v) => saveContact({ type: v as Contact["type"] })}
                      format={(v) => (
                        <Badge className="border-transparent bg-secondary text-secondary-foreground">
                          {CONTACT_TYPE[v as Contact["type"]]?.label ?? String(v)}
                        </Badge>
                      )}
                    />
                  </DetailField>
                  <DetailField label="Tags">
                    <Editable
                      value={contact.tags?.join(", ")}
                      placeholder="Add tags"
                      onSave={(v) => saveContact({ tags: v.split(",").map((t) => t.trim()).filter(Boolean) })}
                      format={(v) => (
                        <span className="flex flex-wrap justify-end gap-1">
                          {String(v).split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                            <Badge key={t} className="border-transparent bg-muted text-[10px] text-muted-foreground">{t}</Badge>
                          ))}
                        </span>
                      )}
                    />
                  </DetailField>
                </div>
                <Link href="/app/admin/contacts" className="inline-flex items-center gap-1 text-xs text-brand-strong hover:underline">
                  Open contact <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No contact linked to this opportunity yet.</p>
            )}
          </Panel>

          {lead && (
            <Panel title="Originating lead">
              <div>
                <DetailField label="Lead status">
                  <Badge className={cn("border-transparent", (LEAD_STATUS[lead.status] ?? LEAD_STATUS.new).tone)}>
                    {(LEAD_STATUS[lead.status] ?? LEAD_STATUS.new).label}
                  </Badge>
                </DetailField>
                <DetailField label="Source">{lead.source || "—"}</DetailField>
                {lead.interest ? <DetailField label="Interest">{lead.interest}</DetailField> : null}
                <DetailField label="Captured">{fmtDate(lead.createdAt)}</DetailField>
                {lead.message ? <DetailField label="Inquiry"><span className="whitespace-pre-wrap text-xs">{lead.message}</span></DetailField> : null}
              </div>
              {lead.meta && Object.keys(lead.meta).length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Enrichment</p>
                  <dl className="space-y-1">
                    {Object.entries(lead.meta).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 text-xs">
                        <dt className="capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</dt>
                        <dd className="text-right text-foreground">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </Panel>
          )}

          <Panel title="Opportunity information">
            <div>
              <DetailField label="Type">
                <Editable value={deal.opportunityType} type="select" placeholder="Pick a type"
                  options={OPPORTUNITY_TYPES.map((t) => ({ value: t, label: t }))}
                  onSave={(v) => save({ opportunityType: v })} />
              </DetailField>
              <DetailField label="Probability">
                <Editable value={deal.probability} type="number" onSave={(v) => save({ probability: Math.max(0, Math.min(100, Number(v) || 0)) })} format={(v) => `${v}%`} />
              </DetailField>
              <DetailField label="Weighted value">{usd.format(weightedValue(deal))}</DetailField>
              <DetailField label="Lead source">
                <Editable value={deal.source} placeholder="Add a source" onSave={(v) => save({ source: v })} />
              </DetailField>
              <DetailField label="Days open">{daysOpen(deal)}</DetailField>
              <DetailField label="Days in stage">{daysInStage(deal)}</DetailField>
              {deal.lostReason ? <DetailField label="Lost reason">{deal.lostReason}</DetailField> : null}
            </div>
          </Panel>
        </div>

        {/* Centre — key fields, guidance, activity */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel
              title="Key fields"
              action={
                <Button size="sm" variant="ghost" onClick={() => setAddFieldOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add field
                </Button>
              }
            >
              <div>
                <DetailField label="Opportunity owner">
                  <Editable value={deal.owner} placeholder="Unassigned" onSave={(v) => changeOwner(v)} />
                </DetailField>
                <DetailField label="Amount">
                  <Editable value={deal.value} type="number" onSave={(v) => save({ value: Number(v) || 0 })} format={(v) => usd.format(Number(v) || 0)} />
                </DetailField>
                <DetailField label="Expected close">
                  <Editable value={deal.closeDate} type="date" onSave={(v) => save({ closeDate: v })} format={(v) => fmtDate(String(v))} />
                </DetailField>
                <DetailField label="Next step">
                  <button type="button" onClick={() => setNextStepOpen(true)}
                    className={cn("w-full rounded px-1 py-0.5 text-right text-sm transition-colors hover:bg-muted/60",
                      deal.nextStep?.action ? "text-foreground" : "text-warning")}>
                    {deal.nextStep?.action ? `${deal.nextStep.action} · ${fmtDate(deal.nextStep.dueDate)}` : "Set a next step"}
                  </button>
                </DetailField>
                <DetailField label="Last activity">{lastActivity ? fmtWhen(lastActivity) : "None yet"}</DetailField>
                <DetailField label="Products">
                  <Editable value={deal.products?.join(", ")} placeholder="Add products"
                    onSave={(v) => save({ products: v.split(",").map((p) => p.trim()).filter(Boolean) })} />
                </DetailField>
                {(deal.customFields ?? []).map((f) => (
                  <DetailField key={f.id} label={f.label}>
                    <span className="group flex items-center justify-end gap-1">
                      <Editable
                        value={f.value}
                        type={f.type}
                        placeholder={`Add ${f.label.toLowerCase()}`}
                        onSave={(v) => setCustomField(f.id, v)}
                        format={f.type === "date" ? (v) => fmtDate(String(v)) : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(f.id)}
                        title={`Remove ${f.label}`}
                        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </DetailField>
                ))}
              </div>
            </Panel>

            <Panel title="Guidance for success">
              {guide ? (
                <>
                  <p className="text-sm font-medium text-foreground">{guide.goal}</p>
                  <ul className="mt-2 space-y-1.5">
                    {guide.actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{a}
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p className="text-sm text-muted-foreground">No guidance for this stage.</p>}
            </Panel>
          </div>

          <Panel
            title={`Next Steps · ${checklist.filter((c) => c.done).length}/${checklist.length}`}
            action={
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setStageConfigOpen(true)} title="Set up the steps for every stage">
                  <Settings2 className="h-3.5 w-3.5" /> Configure stages
                </Button>
                {!closed && nextStage && (
                  <Button size="sm" variant="outline" onClick={() => setStage(nextStage)}><Check className="h-3.5 w-3.5" /> Mark complete</Button>
                )}
              </div>
            }
          >
            <div className="space-y-1.5">
              {checklist.length === 0 && (
                <p className="text-sm text-muted-foreground">No steps for this stage yet. Add one below, or set up the stage.</p>
              )}
              {checklist.map(({ item, done, automatic, custom }) => (
                <div key={item.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => !automatic && toggleCheck(item.id)}
                    disabled={automatic}
                    title={automatic ? "Satisfied automatically from the record" : undefined}
                    className={cn("flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-sm transition-colors", automatic ? "cursor-default" : "hover:bg-muted/50")}
                  >
                    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", done ? "border-brand-strong bg-brand/15 text-brand-strong" : "border-border")}>
                      {done && <Check className="h-3 w-3" />}
                    </span>
                    <span className={cn("min-w-0", done ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                    {item.required && !done && <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-warning">Required</span>}
                  </button>
                  {/* Only this deal's own additions are removable here; template
                      steps belong to the stage and are edited in Configure stages. */}
                  {custom && (
                    <button
                      type="button"
                      onClick={() => removeStep(item.id)}
                      title="Remove this step"
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-1.5 pt-1.5">
                <Input
                  value={addStepLabel}
                  onChange={(e) => setAddStepLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStep(); } }}
                  placeholder={`Add a step for ${DEAL_STAGE[deal.stage].label}…`}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={addStep} disabled={!addStepLabel.trim()}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            </div>
          </Panel>

          <Panel
            title="Activity timeline"
            action={
              <div className="flex min-w-0 items-center gap-2">
              {/* min-w-0 so the strip scrolls within what is left rather than
                  running under the Add button. */}
              <div className="-mb-px flex min-w-0 flex-nowrap items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Activity channels">
                {TIMELINE_TABS.map((t) => {
                  const c = tabCounts[t.key] ?? { total: 0, unseen: 0 };
                  const active = filter === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => openTab(t.key)}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-t-md border-b-2 px-2.5 py-1.5 text-xs font-medium transition-colors",
                        active ? "border-brand-strong text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.label}
                      {c.total > 0 && (
                        <span
                          className={cn(
                            "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                            // Unread reads as a highlighted count; already-seen is just a number.
                            c.unseen > 0 ? "bg-brand text-brand-foreground" : "text-muted-foreground",
                          )}
                        >
                          {c.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Adds an entry of whatever channel is in view; All lets you pick. */}
              <Button size="sm" variant="outline" className="shrink-0"
                onClick={() => { setLogKind(activeTab?.log ?? null); setLogOpen(true); }}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
              </div>
            }
          >
            {shown.length === 0 ? (
              <EmptyState message={filter === "all" ? "No activity yet. Calls, texts and emails attach here automatically — anything else, add it." : `Nothing under ${activeTab?.label ?? "this channel"} yet. Add the first entry.`} />
            ) : (
              <div className="space-y-2">{shown.map((a) => <ActivityRow key={a.id} a={a} onOpen={() => setOpenActivity(a)} />)}</div>
            )}
          </Panel>
        </div>

        {/* Right rail — related */}
        <div className="space-y-4">
          <Panel title={`Products (${deal.products?.length ?? 0})`}>
            {deal.products?.length ? (
              <ul className="space-y-1.5">
                {deal.products.map((p) => (
                  <li key={p} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm text-foreground">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{p}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No products or services yet.</p>}
          </Panel>

          <Panel title="Appointments">
            <AppointmentsCard deal={deal} />
          </Panel>

          <Panel title="Connected records">
            <LinkedRecords deal={deal} />
          </Panel>

          <Panel title="Stage history">
            {deal.stageHistory?.length ? (
              <ol className="space-y-2">
                {[...deal.stageHistory].reverse().map((h, i) => (
                  <li key={`${h.at}-${i}`} className="flex items-start gap-2 text-xs">
                    <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", i === 0 ? "bg-brand" : "bg-muted-foreground/40")} />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{DEAL_STAGE[h.stage]?.label ?? h.stage}</span>
                      <span className="block text-muted-foreground">{fmtWhen(h.at)}{h.by ? ` · ${h.by}` : ""}</span>
                      {h.note && <span className="block text-muted-foreground/80">{h.note}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">No stage changes recorded.</p>}
          </Panel>

          <Panel title="Activity summary">
            <dl className="space-y-1.5 text-sm">
              {[["Calls", counts.call], ["Texts", counts.sms], ["Emails", counts.email], ["Notes", counts.note], ["Voice notes", (counts.voice ?? 0) + (counts.voicemail ?? 0)], ["AI voice", counts.ai_voice], ["Appointments", counts.meeting]].map(([label, n]) => (
                <div key={String(label)} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{Number(n ?? 0)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      {recordAction && (
        <OpportunityRecords
          deal={deal}
          contact={contact}
          action={recordAction}
          onClose={() => setRecordAction(null)}
          onDone={flash}
        />
      )}

      <ScheduleDialog
        deal={deal}
        contact={contact}
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onBooked={(m) => { flash(m); void loadTimeline(); }}
      />

      <AddFieldDialog
        open={addFieldOpen}
        existingLabels={[
          "Opportunity owner", "Amount", "Expected close", "Next step", "Last activity", "Products",
          ...(deal.customFields ?? []).map((f) => f.label),
        ]}
        onClose={() => setAddFieldOpen(false)}
        onAdd={addCustomField}
      />

      <StageConfigDialog
        open={stageConfigOpen}
        initial={stageConfig?.stages ?? null}
        startStage={deal.stage}
        saving={savingStages}
        onClose={() => setStageConfigOpen(false)}
        onSave={(stages) => { void saveStages(stages); }}
      />

      <LogActivityDialog
        open={logOpen}
        kind={logKind}
        saving={logging}
        onClose={() => setLogOpen(false)}
        onSave={(payload) => { void logActivity(payload); }}
      />

      <NextStepDialog
        open={nextStepOpen}
        current={deal.nextStep ?? null}
        owner={deal.owner}
        onClose={() => setNextStepOpen(false)}
        onSave={(step) => { save({ nextStep: step }); setNextStepOpen(false); flash(step ? "Next step set." : "Next step cleared."); }}
      />

      <ToolModal tool={tool} onClose={() => setTool(null)} full={toolFull} setFull={setToolFull}>
        {tool === "call" && <DialpadPanel seed={tel} context={ctx} onPlaced={() => { flash("Call logged."); void loadTimeline(); }} />}
        {tool === "sms" && <SmsPanel to={contact?.phone ?? ""} context={ctx} onSent={() => { flash("Text sent."); void loadTimeline(); }} />}
        {tool === "email" && <EmailPanel to={contact?.email ?? ""} context={ctx} onSent={() => { flash("Email sent."); void loadTimeline(); }} />}
        {tool === "agent" && <AgentPanel context={ctx} phone={contact?.phone ?? ""} onDialed={() => { flash("Nicole is dialling."); void loadTimeline(); }} />}
        {tool === "voice" && <VoiceNotePanel context={ctx} onSaved={() => { setTool(null); flash("Voice note saved."); void loadTimeline(); }} />}
        {tool === "note" && <NotePanel context={ctx} full={toolFull} onSaved={() => { setTool(null); flash("Note added."); void loadTimeline(); }} />}
      </ToolModal>

      <ActivityDetail a={openActivity} onClose={() => setOpenActivity(null)} />

      <Dialog open={Boolean(blocked)} onOpenChange={(o) => !o && setBlocked(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Finish this stage first</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">These items are required before advancing:</p>
          <ul className="space-y-1.5">
            {(blocked ?? []).map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-foreground"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{b}</li>
            ))}
          </ul>
          <DialogFooter><Button onClick={() => setBlocked(null)}>Got it</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(closing)} onOpenChange={(o) => !o && setClosing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{closing === "won" ? "Mark Closed Won" : "Mark Closed Lost"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {closing === "lost" && (
              <FormField label="Lost reason">
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOST_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            )}
            <FormField label={closing === "won" ? "Won summary" : "Notes"}>
              <Textarea rows={3} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder={closing === "won" ? "What sealed it?" : "What happened?"} />
            </FormField>
            <p className="text-xs text-muted-foreground">The opportunity and its full history are preserved either way.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosing(null)}>Cancel</Button>
            <Button onClick={confirmClose} disabled={closing === "lost" && !lostReason}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Note ─────────────────────────────────────────────────────────────────────

/** Flatten a Plate document to text for the timeline preview and search. */
function plateToText(nodes: unknown): string {
  if (!Array.isArray(nodes)) return "";
  return nodes
    .map((node) => {
      const n = node as { text?: string; children?: unknown };
      if (typeof n.text === "string") return n.text;
      return plateToText(n.children);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const EMPTY_DOC = [{ type: "p", children: [{ text: "" }] }];

function NotePanel({
  context, full, onSaved,
}: {
  context: { opportunityId: string; contactId: string | null; leadId: string | null; owner: string };
  full: boolean;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const editorWrap = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<unknown[]>(EMPTY_DOC);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = plateToText(value);

  /**
   * An empty Plate document has one zero-length paragraph, so a click on the
   * surrounding padding maps to no text node and never sets a selection — which
   * is why typing only worked after inserting a block. Put the caret at the end
   * of the editable ourselves whenever the click didn't land on real content.
   */
  function focusEditor(event: React.MouseEvent) {
    const editable = editorWrap.current?.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!editable) return;
    const target = event.target as HTMLElement | null;
    if (target && editable.contains(target) && target.closest("[data-slate-node]")) return;

    event.preventDefault();
    editable.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editable);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function save() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/comm/note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // The flattened text drives the timeline; the Plate document is kept
        // alongside it so formatting survives a round trip.
        body: JSON.stringify({ subject: title.trim() || null, body: text, doc: value, ...context, actor: context.owner }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d?.error || "The note didn't save.");
        return;
      }
      setValue(EMPTY_DOC);
      setTitle("");
      onSaved();
    } finally { setBusy(false); }
  }

  return (
    <div className={cn("flex flex-col gap-3", full && "min-h-0 flex-1")}>
      <FormField label="Note title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Discovery call recap" />
      </FormField>
      {/*
        The Workspace editor sets min-h-[62vh] for its own full-page layout. In a
        modal that pushes the writing area below the fold, so it reads as having
        nowhere to type. Override the editable's min-height here and let the
        container scroll instead of clipping.
      */}
      <div
        ref={editorWrap}
        onMouseDown={focusEditor}
        className={cn(
          "cursor-text overflow-y-auto rounded-lg border border-border",
          full ? "min-h-0 flex-1" : "h-[340px]",
        )}
      >
        <WorkspaceEditorSurface initialValue={EMPTY_DOC} onChange={(v) => setValue(v as unknown[])} autoFocus embedded />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href="/app/admin/workspace" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-brand-strong hover:underline">
          Open Workspace for a full document <ChevronRight className="h-3 w-3" />
        </a>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-destructive">{error}</span>}
          <Button onClick={save} disabled={busy || !text}>{busy ? "Saving…" : "Save note"}</Button>
        </div>
      </div>
    </div>
  );
}


// ── Next step ────────────────────────────────────────────────────────────────
function NextStepDialog({
  open, current, owner, onClose, onSave,
}: {
  open: boolean;
  current: NextStep | null;
  owner: string;
  onClose: () => void;
  onSave: (step: NextStep | null) => void;
}) {
  const [action, setAction] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState<NextStepType>("call");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");

  // Refill from the record each time it opens, so a cancelled edit leaves nothing behind.
  useEffect(() => {
    if (!open) return;
    setAction(current?.action ?? "");
    setDueDate(current?.dueDate ?? new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10));
    setType(current?.type ?? "call");
    setPriority(current?.priority ?? "normal");
  }, [open, current]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Next step</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <FormField label="What happens next">
            <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Send the media plan" autoFocus />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Due"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></FormField>
            <FormField label="Type">
              <Select value={type} onValueChange={(v) => setType(v as NextStepType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{NEXT_STEP_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Priority">
            <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "normal" | "high")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <p className="text-xs text-muted-foreground">
            An opportunity with no future next step is flagged in the header and on the board.
          </p>
        </div>
        <DialogFooter>
          {current && <Button variant="outline" onClick={() => onSave(null)}>Clear</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ action: action.trim(), dueDate, assignee: owner, type, priority })} disabled={!action.trim() || !dueDate}>
            Save next step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
