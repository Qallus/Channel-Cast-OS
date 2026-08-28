"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Ban, Bot, Briefcase, Building2, CalendarClock, Check, ChevronRight, CircleAlert,
  Mail, MessageSquare, Maximize2, Mic, Minimize2, Phone, Sparkles, StickyNote, Trophy, Voicemail,
} from "lucide-react";

import { Avatar, DetailField, EmptyState, FormField } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AgentPanel, DialpadPanel, EmailPanel, SmsPanel, VoiceNotePanel } from "@/components/comm/record-tools";
import { WorkspaceEditorSurface } from "@/components/workspace/plate-editor";
import { Contact, contactName, seedContacts } from "@/lib/crm/contacts";
import { Lead, LEAD_STATUS, seedLeads } from "@/lib/crm/leads";
import {
  DEAL_STAGE, Deal, DealStage, LOST_REASONS, PIPELINE_PATH,
  daysInStage, daysOpen, isClosed, needsNextStep, seedDeals, weightedValue,
} from "@/lib/crm/deals";
import { STAGE_GUIDE, blockingItems, checklistFor } from "@/lib/crm/pipeline-guidance";
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
};

const CHANNEL: Record<string, { label: string; icon: typeof Phone; tone: string }> = {
  call: { label: "Call", icon: Phone, tone: "bg-brand/15 text-brand-strong" },
  sms: { label: "SMS", icon: MessageSquare, tone: "bg-accent text-accent-foreground" },
  email: { label: "Email", icon: Mail, tone: "bg-accent text-accent-foreground" },
  ai_voice: { label: "AI Voice", icon: Sparkles, tone: "bg-brand/15 text-brand-strong" },
  voicemail: { label: "Voicemail", icon: Voicemail, tone: "bg-muted text-muted-foreground" },
  meeting: { label: "Meeting", icon: CalendarClock, tone: "bg-secondary text-secondary-foreground" },
  note: { label: "Note", icon: StickyNote, tone: "bg-muted text-muted-foreground" },
  task: { label: "Task", icon: Check, tone: "bg-secondary text-secondary-foreground" },
};

const FILTERS = [
  { key: "all", label: "All" }, { key: "call", label: "Calls" }, { key: "sms", label: "SMS" },
  { key: "email", label: "Email" }, { key: "ai_voice", label: "AI Voice" }, { key: "meeting", label: "Meetings" },
  { key: "note", label: "Notes" },
];

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
    <div className="flex w-full min-w-0 gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Sales stage">
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
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-brand/40">
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", ch.tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-foreground">
            {a.direction === "inbound" ? "Inbound" : a.direction === "outbound" ? "Outbound" : ""} {ch.label.toLowerCase()}
          </span>
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

type ToolId = "call" | "email" | "sms" | "note" | "voice" | "agent";

const TOOL_META: Record<ToolId, { label: string; title: string; icon: typeof Phone; wide?: boolean }> = {
  call: { label: "Call", title: "Dialpad", icon: Phone },
  email: { label: "Email", title: "Send an email", icon: Mail, wide: true },
  sms: { label: "Text", title: "Send a text", icon: MessageSquare },
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

// ── Workspace ────────────────────────────────────────────────────────────────
export function OpportunityDetail({ id }: { id: string }) {
  const { items, update } = useCollection<Deal>("deals", seedDeals);
  const contactsCol = useCollection<Contact>("contacts", seedContacts);
  const leadsCol = useCollection<Lead>("leads", seedLeads);

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
  const [openActivity, setOpenActivity] = useState<Activity | null>(null);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [toolFull, setToolFull] = useState(false);
  const [closing, setClosing] = useState<"won" | "lost" | null>(null);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

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

  const shown = useMemo(
    () => (filter === "all" ? activities : activities.filter((a) => a.kind === filter)),
    [activities, filter],
  );

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
  const guide = STAGE_GUIDE[deal.stage];
  const checklist = checklistFor(deal);
  const nextStage = stageIdx >= 0 && stageIdx < PIPELINE_PATH.length - 1 ? PIPELINE_PATH[stageIdx + 1] : null;
  const lastActivity = activities[0]?.occurredAt ?? null;

  function setStage(next: DealStage) {
    const forward = PIPELINE_PATH.indexOf(next) > stageIdx;
    if (forward && !isClosed(next)) {
      const missing = blockingItems(deal!, deal!.stage);
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
            {/* Reaching the client is the most common action on this page, so the
                channels sit in the header rather than buried in the timeline. */}
            {(Object.keys(TOOL_META) as ToolId[]).map((t) => {
              const m = TOOL_META[t];
              return (
                <Button key={t} size="sm" variant="outline" onClick={() => setTool(t)}>
                  <m.icon className="h-3.5 w-3.5" /> {m.label}
                </Button>
              );
            })}
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
            {needsNextStep(deal) && <Badge className="border-transparent bg-warning/15 text-warning"><CircleAlert className="mr-1 h-3 w-3" />No next step</Badge>}
            {!closed && <Button size="sm" variant="outline" onClick={() => setClosing("won")}><Trophy className="h-3.5 w-3.5" /> Closed Won</Button>}
            {!closed && <Button size="sm" variant="outline" onClick={() => setClosing("lost")}><Ban className="h-3.5 w-3.5" /> Closed Lost</Button>}
          </div>
        </div>

        {/* Compact field strip, as on the Salesforce record header */}
        <div className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-5">
          <DetailField label="Account name">{deal.client || "—"}</DetailField>
          <DetailField label="Close date">{fmtDate(deal.closeDate)}</DetailField>
          <DetailField label="Amount">{usd.format(deal.value)}</DetailField>
          <DetailField label="Opportunity owner">
            {deal.owner ? <span className="inline-flex items-center gap-1.5"><Avatar name={deal.owner} className="h-5 w-5 text-[10px]" />{deal.owner}</span> : <span className="text-warning">Unassigned</span>}
          </DetailField>
          <DetailField label="Stage"><Badge className={cn("border-transparent", DEAL_STAGE[deal.stage].tone)}>{DEAL_STAGE[deal.stage].label}</Badge></DetailField>
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
          {toast && <span className="text-sm text-brand-strong">{toast}</span>}
        </div>
      </div>

      {/* Three-column record layout */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,300px)]">
        {/* Left rail — who this is */}
        <div className="space-y-4">
          <Panel title="Lead / contact details">
            {contact ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={contactName(contact)} className="h-9 w-9" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{contactName(contact)}</p>
                    <p className="truncate text-xs text-muted-foreground">{contact.title || "—"}</p>
                  </div>
                </div>
                <div>
                  <DetailField label="Account">{contact.company || deal.client || "—"}</DetailField>
                  <DetailField label="Email">
                    {contact.email
                      ? <button type="button" onClick={() => setTool("email")} className="text-left text-brand-strong hover:underline">{contact.email}</button>
                      : "—"}
                  </DetailField>
                  <DetailField label="Phone">
                    {contact.phone
                      ? <button type="button" onClick={() => setTool("call")} className="text-left text-brand-strong hover:underline">{contact.phone}</button>
                      : "—"}
                  </DetailField>
                  <DetailField label="Role">
                    <Badge className="border-transparent bg-secondary text-secondary-foreground">{contact.type}</Badge>
                  </DetailField>
                  {contact.tags?.length ? (
                    <DetailField label="Tags">
                      <span className="flex flex-wrap gap-1">{contact.tags.map((t) => <Badge key={t} className="border-transparent bg-muted text-[10px] text-muted-foreground">{t}</Badge>)}</span>
                    </DetailField>
                  ) : null}
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
              <DetailField label="Type">{deal.opportunityType || "—"}</DetailField>
              <DetailField label="Probability">{deal.probability}%</DetailField>
              <DetailField label="Weighted value">{usd.format(weightedValue(deal))}</DetailField>
              <DetailField label="Lead source">{deal.source || "—"}</DetailField>
              <DetailField label="Days open">{daysOpen(deal)}</DetailField>
              <DetailField label="Days in stage">{daysInStage(deal)}</DetailField>
              {deal.lostReason ? <DetailField label="Lost reason">{deal.lostReason}</DetailField> : null}
            </div>
          </Panel>
        </div>

        {/* Centre — key fields, guidance, activity */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Key fields">
              <div>
                <DetailField label="Opportunity owner">{deal.owner || <span className="text-warning">Unassigned</span>}</DetailField>
                <DetailField label="Amount">{usd.format(deal.value)}</DetailField>
                <DetailField label="Expected close">{fmtDate(deal.closeDate)}</DetailField>
                <DetailField label="Next step">
                  {deal.nextStep?.action ? `${deal.nextStep.action} · ${fmtDate(deal.nextStep.dueDate)}` : <span className="text-warning">Not set</span>}
                </DetailField>
                <DetailField label="Last activity">{lastActivity ? fmtWhen(lastActivity) : "None yet"}</DetailField>
                <DetailField label="Products">{deal.products?.length ? deal.products.join(", ") : "—"}</DetailField>
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
            title={`Completion items · ${checklist.filter((c) => c.done).length}/${checklist.length}`}
            action={!closed && nextStage ? <Button size="sm" variant="outline" onClick={() => setStage(nextStage)}><Check className="h-3.5 w-3.5" /> Mark complete</Button> : undefined}
          >
            <div className="space-y-1.5">
              {checklist.map(({ item, done, automatic }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !automatic && toggleCheck(item.id)}
                  disabled={automatic}
                  title={automatic ? "Satisfied automatically from the record" : undefined}
                  className={cn("flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-sm transition-colors", automatic ? "cursor-default" : "hover:bg-muted/50")}
                >
                  <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", done ? "border-brand-strong bg-brand/15 text-brand-strong" : "border-border")}>
                    {done && <Check className="h-3 w-3" />}
                  </span>
                  <span className={done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  {item.required && !done && <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-warning">Required</span>}
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            title="Activity timeline"
            action={
              <div className="flex flex-wrap gap-1">
                {FILTERS.map((f) => {
                  const n = f.key === "all" ? activities.length : counts[f.key] ?? 0;
                  if (f.key !== "all" && !n) return null;
                  return (
                    <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                      className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                        filter === f.key ? "border-brand-strong bg-brand/10 text-brand-strong" : "border-border text-muted-foreground hover:text-foreground")}>
                      {f.label}{n ? <span className="ml-1 opacity-60">{n}</span> : null}
                    </button>
                  );
                })}
              </div>
            }
          >
            {shown.length === 0 ? (
              <EmptyState message="No activity yet. Calls, texts and emails attach here automatically." />
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
              {[["Calls", counts.call], ["Texts", counts.sms], ["Emails", counts.email], ["AI voice", counts.ai_voice], ["Notes", counts.note]].map(([label, n]) => (
                <div key={String(label)} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{Number(n ?? 0)}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

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
          full
            ? "min-h-0 flex-1 [&_[data-slate-editor]]:!min-h-[60vh]"
            : "h-[340px] [&_[data-slate-editor]]:!min-h-[220px]",
        )}
      >
        <WorkspaceEditorSurface initialValue={EMPTY_DOC} onChange={(v) => setValue(v as unknown[])} autoFocus />
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
