"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlarmClock, ArrowLeft, ArrowRight, BellRing, Check, CheckCircle2, ListChecks, Mail, MessageSquare,
  Phone, Plus, Save, Shuffle, Sparkles, StickyNote, Trash2, Users, X, XCircle,
} from "lucide-react";

import { Avatar, initialsOf } from "@/components/crm/crm-ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTACT_STATUS, CONTACT_STATUS_ORDER, CONTACT_TAGS, CONTACT_TYPE, CONTACT_TYPE_ORDER,
  Contact, ContactStatus, ContactType, DETAIL_CATEGORIES, categorizeDetail, contactName, seedContacts,
} from "@/lib/crm/contacts";
import { ACTIVITY_KIND, Activity, ActivityKind, seedActivities } from "@/lib/crm/activities";
import { DEAL_STAGE, Deal, seedDeals } from "@/lib/crm/deals";
import {
  FollowUp, NEXT_STEP_METHODS, REMIND_CHANNELS, REMIND_LEAD_TIMES, REPEAT_OPTIONS, WORKFLOW_NODES,
  WorkflowStage, defaultStageForType, nodeIndexForStage, stageForNodeAdvance,
} from "@/lib/crm/workflow";
import { genId, useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

type Tab = "details" | "workflow" | "next";
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function WorkLead({ contactId }: { contactId: string }) {
  const { items, update } = useCollection<Contact>("contacts", seedContacts);
  const activitiesCol = useCollection<Activity>("activities", seedActivities);
  const dealsCol = useCollection<Deal>("deals", seedDeals);
  const followupsCol = useCollection<FollowUp>("followups", []);
  const [tab, setTab] = useState<Tab>("workflow");
  const [toast, setToast] = useState<string | null>(null);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  const contact = items.find((c) => c.id === contactId) || null;
  const activities = useMemo(() => activitiesCol.items.filter((a) => a.contactId === contactId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [activitiesCol.items, contactId]);
  const deals = dealsCol.items.filter((d) => d.contactId === contactId);
  const followups = followupsCol.items.filter((f) => f.contactId === contactId);

  if (!contact) {
    return (
      <div className="space-y-4">
        <Link href="/app/admin/contacts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Contacts</Link>
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">Contact not found. It may have been deleted.</div>
      </div>
    );
  }

  const stage = (contact.workflowStage as WorkflowStage) || defaultStageForType(contact.type);
  function setStage(s: WorkflowStage) {
    update(contact!.id, { ...contact!, workflowStage: s, ...(s === "won" ? { type: "client" as ContactType } : {}) });
    activitiesCol.create({ id: genId("ac"), contactId: contact!.id, kind: "stage", body: `Workflow moved to ${WORKFLOW_NODES[nodeIndexForStage(s)].label}`, actor: contact!.owner || "You", createdAt: new Date().toISOString() });
    flash("Workflow updated.");
  }
  function logActivity(kind: ActivityKind, body: string) {
    activitiesCol.create({ id: genId("ac"), contactId: contact!.id, kind, body, actor: contact!.owner || "You", createdAt: new Date().toISOString() });
  }

  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "details", label: "Details", icon: Users },
    { id: "workflow", label: "Workflow", icon: Shuffle },
    { id: "next", label: "Next Steps", icon: AlarmClock },
  ];

  const count = (k: ActivityKind) => activities.filter((a) => a.kind === k).length;
  const statTiles: { label: string; icon: typeof Phone; value: number }[] = [
    { label: "Calls", icon: Phone, value: count("call") }, { label: "Emails", icon: Mail, value: count("email") },
    { label: "Texts", icon: MessageSquare, value: count("sms") }, { label: "Meetings", icon: Users, value: count("meeting") },
    { label: "Notes", icon: StickyNote, value: count("note") }, { label: "Tasks", icon: ListChecks, value: count("task") },
  ];

  return (
    <div className="space-y-5">
      <Link href="/app/admin/contacts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to contacts</Link>

      {/* Activity stat tiles */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {statTiles.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between"><span className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</span><s.icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={contactName(contact)} className="h-12 w-12 text-sm" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{contactName(contact)}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge className={cn("border-transparent", CONTACT_TYPE[contact.type]?.tone)}>{CONTACT_TYPE[contact.type]?.label ?? contact.type}</Badge>
              <Badge className={cn("border-transparent", CONTACT_STATUS[contact.status]?.tone)}>{CONTACT_STATUS[contact.status]?.label ?? contact.status}</Badge>
              {contact.company ? <span className="text-sm text-muted-foreground">{contact.company}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {toast && <span className="text-sm text-brand-strong">{toast}</span>}
          {contact.phone && <Button asChild variant="outline" size="sm"><a href={`tel:${contact.phone}`} onClick={() => logActivity("call", `Call to ${contact.phone}`)}><Phone className="h-3.5 w-3.5" /> Call</a></Button>}
          {contact.email && <Button asChild variant="outline" size="sm"><a href={`mailto:${contact.email}`} onClick={() => logActivity("email", `Email to ${contact.email}`)}><Mail className="h-3.5 w-3.5" /> Email</a></Button>}
        </div>
      </div>

      {/* Tabs — slide horizontally when they exceed the viewport width */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition", tab === t.id ? "border-brand-strong text-brand-strong" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <DetailsTab contact={contact} onSave={(patch) => { update(contact.id, { ...contact, ...patch }); flash("Saved."); }} />
      ) : tab === "workflow" ? (
        <WorkflowTab contact={contact} stage={stage} onSet={setStage} activities={activities} deals={deals} onLog={logActivity} />
      ) : (
        <NextStepsTab
          followups={followups}
          onAdd={(f) => followupsCol.create(f)}
          onComplete={(id) => { const f = followupsCol.items.find((x) => x.id === id); if (f) followupsCol.update(id, { ...f, status: "done", completedAt: new Date().toISOString() }); }}
          onDelete={(id) => followupsCol.remove(id)}
          contactId={contact.id}
        />
      )}
    </div>
  );
}

/* ── Workflow & funnel tab ──────────────────────────────────────────────────── */

function WorkflowTab({ contact, stage, onSet, activities, deals, onLog }: {
  contact: Contact; stage: WorkflowStage; onSet: (s: WorkflowStage) => void;
  activities: Activity[]; deals: Deal[]; onLog: (k: ActivityKind, b: string) => void;
}) {
  const idx = nodeIndexForStage(stage);
  const isLost = stage === "lost";
  const closedIdx = WORKFLOW_NODES.findIndex((n) => n.key === "closed");
  const current = WORKFLOW_NODES[idx];
  const next = idx < WORKFLOW_NODES.length - 1 ? WORKFLOW_NODES[idx + 1] : null;

  return (
    <div className="space-y-5">
      {/* Workflow card */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Lead servicing workflow</p>
            <p className="text-xs text-muted-foreground">Every lead is worked through this consistent path. Click any stage to move it there.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Step backwards */}
            {idx > 0 && !isLost && (
              <Button size="sm" variant="outline" onClick={() => onSet(stageForNodeAdvance(WORKFLOW_NODES[idx - 1].key))}><ArrowLeft className="h-4 w-4" /> Back a stage</Button>
            )}
            {/* Stage action */}
            {current.key === "closed" ? (
              isLost ? <Button size="sm" variant="outline" onClick={() => onSet("opportunity")}>Reopen opportunity</Button>
                : <Button size="sm" onClick={() => onSet("onboarding")}>Begin onboarding <ArrowRight className="h-4 w-4" /></Button>
            ) : current.key === "proposal" ? (
              <>
                <Button size="sm" onClick={() => onSet("won")}><CheckCircle2 className="h-4 w-4" /> Closed Won</Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => onSet("lost")}><XCircle className="h-4 w-4" /> Closed Lost</Button>
              </>
            ) : next ? (
              <Button size="sm" onClick={() => onSet(stageForNodeAdvance(next.key))}><Check className="h-4 w-4" /> Mark complete</Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Active client</span>
            )}
          </div>
        </div>

        {/* Progress bar — Channel Cast style; each stage is clickable (forward or back) */}
        <div className="flex gap-1">
          {WORKFLOW_NODES.map((n, i) => {
            const done = i < idx, active = i === idx, lostHere = isLost && i === closedIdx;
            return (
              <button key={n.key} type="button" onClick={() => onSet(stageForNodeAdvance(n.key))} className="group flex-1 text-left" title={`Move to ${n.label}`}>
                <div className={cn("h-1.5 rounded-full transition-colors", lostHere ? "bg-destructive" : active ? "bg-brand" : done ? "bg-brand/40" : "bg-muted group-hover:bg-brand/30")} />
                <p className={cn("mt-1.5 truncate text-center text-[11px]", active ? "font-semibold text-brand-strong" : "text-muted-foreground group-hover:text-foreground")}>{n.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Linked opportunities */}
      {deals.length ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opportunities</p>
          <div className="space-y-2">
            {deals.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                <Badge className={cn("border-transparent", DEAL_STAGE[d.stage]?.tone)}>{DEAL_STAGE[d.stage]?.label ?? d.stage}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm">{d.name}</span>
                <span className="shrink-0 text-sm font-semibold">{usd.format(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Activity timeline */}
      <ActivityBlock activities={activities} onLog={onLog} owner={contact.owner} />

      {/* Guidance for success (moved to the bottom) */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-strong"><Sparkles className="h-3.5 w-3.5" /> Guidance for success</p>
        <p className="font-medium">{current.guidance.title}</p>
        <ul className="mt-2 space-y-1.5">
          {current.guidance.items.map((it, k) => <li key={k} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{it}</li>)}
        </ul>
      </div>
    </div>
  );
}

const ACT_ICON: Record<ActivityKind, typeof Phone> = { note: StickyNote, call: Phone, sms: MessageSquare, email: Mail, meeting: Users, task: ListChecks, stage: Shuffle };
function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
function ActivityBlock({ activities, onLog }: { activities: Activity[]; onLog: (k: ActivityKind, b: string) => void; owner: string }) {
  const [kind, setKind] = useState<ActivityKind>("note");
  const [body, setBody] = useState("");
  function submit() { if (body.trim()) { onLog(kind, body.trim()); setBody(""); } }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity timeline</p>
      <div className="mb-3 flex gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as ActivityKind)}>
          <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{(["note", "call", "sms", "email", "meeting", "task"] as ActivityKind[]).map((k) => <SelectItem key={k} value={k}>{ACTIVITY_KIND[k].label}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder="Log a call, note, or message…" className="flex-1" />
        <Button size="sm" onClick={submit} disabled={!body.trim()}>Log</Button>
      </div>
      {activities.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">No activity yet. Log the first touchpoint above.</p>
      ) : (
        <ol className="space-y-2">
          {activities.map((a) => { const Icon = ACT_ICON[a.kind] ?? StickyNote; return (
            <li key={a.id} className="flex gap-3 rounded-lg border border-border p-3">
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", ACTIVITY_KIND[a.kind]?.tone ?? "bg-muted text-muted-foreground")}><Icon className="h-3.5 w-3.5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{ACTIVITY_KIND[a.kind]?.label ?? a.kind}</span><span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</span></div>
                <p className="mt-0.5 text-sm">{a.body}</p>
              </div>
            </li>
          ); })}
        </ol>
      )}
    </div>
  );
}

/* ── Next steps tab ─────────────────────────────────────────────────────────── */

function NextStepsTab({ followups, onAdd, onComplete, onDelete, contactId }: {
  followups: FollowUp[]; onAdd: (f: FollowUp) => void; onComplete: (id: string) => void; onDelete: (id: string) => void; contactId: string;
}) {
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [f, setF] = useState({ date: "", time: "09:00", method: "call", subject: "", remindChannel: "email", remindBeforeMinutes: 1440, repeat: "once", notes: "" });

  function schedule() {
    if (!f.date) return;
    const [hh, mi] = (f.time || "09:00").split(":").map(Number);
    const [y, mo, d] = f.date.split("-").map(Number);
    const dueAt = new Date(y, mo - 1, d, hh || 0, mi || 0).toISOString();
    onAdd({ id: genId("fu"), contactId, dueAt, method: f.method, subject: f.subject, notes: f.notes, remindChannel: f.remindChannel, remindBeforeMinutes: f.remindBeforeMinutes, repeat: f.repeat, status: "open", completedAt: null, createdAt: new Date().toISOString() });
    setF({ date: "", time: "09:00", method: "call", subject: "", remindChannel: "email", remindBeforeMinutes: 1440, repeat: "once", notes: "" });
    setAdding(false);
  }

  const open = followups.filter((x) => x.status === "open").sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const done = followups.filter((x) => x.status !== "open");
  const visible = showDone ? done : open;
  const methodLabel = (k: string) => NEXT_STEP_METHODS.find((m) => m.key === k)?.label ?? k;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-sm font-semibold">Next steps</p><p className="text-xs text-muted-foreground">What happens next with this contact, and who owes it.</p></div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setShowDone((v) => !v)}>{showDone ? `Open (${open.length})` : `Completed (${done.length})`}</Button>
          <Button size="sm" onClick={() => setAdding((v) => !v)}><Plus className="h-4 w-4" /> Schedule</Button>
        </div>
      </div>

      {adding && (
        <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Next contact date"><DatePicker value={f.date} onChange={(v) => setF((s) => ({ ...s, date: v }))} /></Field>
            <Field label="Time"><Input type="time" value={f.time} onChange={(e) => setF((s) => ({ ...s, time: e.target.value }))} /></Field>
            <Field label="How"><Sel value={f.method} onChange={(v) => setF((s) => ({ ...s, method: v }))} options={NEXT_STEP_METHODS.map((m) => [m.key, m.label])} /></Field>
          </div>
          <Field label="What for"><Input value={f.subject} onChange={(e) => setF((s) => ({ ...s, subject: e.target.value }))} placeholder="e.g. Send the proposal, confirm the contract" /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Remind me"><Sel value={f.remindChannel} onChange={(v) => setF((s) => ({ ...s, remindChannel: v }))} options={REMIND_CHANNELS.map((c) => [c.key, c.label])} /></Field>
            <Field label="When"><Sel value={String(f.remindBeforeMinutes)} onChange={(v) => setF((s) => ({ ...s, remindBeforeMinutes: Number(v) }))} options={REMIND_LEAD_TIMES.map((l) => [String(l.minutes), l.label])} /></Field>
            <Field label="Repeat"><Sel value={f.repeat} onChange={(v) => setF((s) => ({ ...s, repeat: v }))} options={REPEAT_OPTIONS.map((r) => [r.key, r.label])} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => setF((s) => ({ ...s, notes: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button size="sm" onClick={schedule} disabled={!f.date}>Schedule</Button></div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <AlarmClock className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{showDone ? "Nothing completed yet" : "No next step scheduled"}</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{showDone ? "Completed follow-ups collect here." : "Schedule the next call, email or meeting so this contact doesn't go quiet."}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {visible.map((x) => {
            const overdue = x.status === "open" && new Date(x.dueAt).getTime() < Date.now();
            return (
              <li key={x.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><AlarmClock className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn("font-medium", x.status !== "open" && "line-through opacity-60")}>{x.subject || methodLabel(x.method)}</span>
                    {x.status === "open" && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", overdue ? "bg-destructive/15 text-destructive" : "bg-accent text-brand-strong")}>{overdue ? "Overdue" : "Scheduled"}</span>}
                    {x.repeat !== "once" && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{REPEAT_OPTIONS.find((r) => r.key === x.repeat)?.label}</span>}
                    {x.remindChannel !== "none" && x.status === "open" && <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><BellRing className="h-3 w-3" />{REMIND_CHANNELS.find((c) => c.key === x.remindChannel)?.label}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{methodLabel(x.method)} · {new Date(x.dueAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                  {x.notes && <p className="mt-0.5 text-sm text-muted-foreground">{x.notes}</p>}
                </div>
                {x.status === "open" && <button onClick={() => onComplete(x.id)} title="Mark done" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-success"><Check className="h-4 w-4" /></button>}
                <button onClick={() => onDelete(x.id)} title="Delete" className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── Contact details tab ────────────────────────────────────────────────────── */

function DetailsTab({ contact, onSave }: { contact: Contact; onSave: (patch: Partial<Contact>) => void }) {
  const [d, setD] = useState<Contact>({ ...contact, tags: [...(contact.tags ?? [])] });
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setD((x) => ({ ...x, [k]: v }));
  const toggleTag = (t: string) => set("tags", d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t]);
  const details = contact.details ?? {};
  const byCat = DETAIL_CATEGORIES.map((cat) => ({ cat, entries: Object.entries(details).filter(([k]) => categorizeDetail(k) === cat) })).filter((g) => g.entries.length);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div><p className="text-sm font-semibold">Contact information</p><p className="text-xs text-muted-foreground">Everything on this contact. Changes save when you press Save.</p></div>
        <Button size="sm" onClick={() => onSave(d)}><Save className="h-4 w-4" /> Save</Button>
      </div>
      <Accordion type="multiple" defaultValue={["primary", "contact"]} className="space-y-2">
        <Acc value="primary" label="Primary contact">
          <Grid>
            <Field label="Full name"><Input value={d.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="First name"><Input value={d.firstName ?? ""} onChange={(e) => set("firstName", e.target.value)} /></Field>
            <Field label="Last name"><Input value={d.lastName ?? ""} onChange={(e) => set("lastName", e.target.value)} /></Field>
            <Field label="Title"><Input value={d.title} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="Type"><Sel value={d.type} onChange={(v) => set("type", v as ContactType)} options={CONTACT_TYPE_ORDER.map((t) => [t, CONTACT_TYPE[t].label])} /></Field>
            <Field label="Status"><Sel value={d.status} onChange={(v) => set("status", v as ContactStatus)} options={CONTACT_STATUS_ORDER.map((s) => [s, CONTACT_STATUS[s].label])} /></Field>
          </Grid>
        </Acc>
        <Acc value="contact" label="Contact information">
          <Grid>
            <Field label="Email"><Input type="email" value={d.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone"><Input value={d.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="SMS"><Input value={d.sms ?? ""} onChange={(e) => set("sms", e.target.value)} /></Field>
            <Field label="Website"><Input value={d.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
          </Grid>
        </Acc>
        <Acc value="company" label="Company & source">
          <Grid>
            <Field label="Company"><Input value={d.company} onChange={(e) => set("company", e.target.value)} /></Field>
            <Field label="Source"><Input value={d.source ?? ""} onChange={(e) => set("source", e.target.value)} /></Field>
            <Field label="Owner"><Input value={d.owner} onChange={(e) => set("owner", e.target.value)} /></Field>
          </Grid>
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {CONTACT_TAGS.map((t) => <button key={t} type="button" onClick={() => toggleTag(t)} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition", d.tags.includes(t) ? "border-brand-strong bg-accent text-brand-strong" : "border-border text-muted-foreground hover:bg-accent/40")}>{t}</button>)}
            </div>
          </Field>
        </Acc>
        <Acc value="address" label="Address">
          <Grid>
            <Field label="Address"><Input value={d.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
            <Field label="City"><Input value={d.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="State"><Input value={d.state} onChange={(e) => set("state", e.target.value)} /></Field>
            <Field label="Zip"><Input value={d.zip ?? ""} onChange={(e) => set("zip", e.target.value)} /></Field>
          </Grid>
        </Acc>
        <Acc value="media" label="Media">
          <Grid>
            <Field label="Profile photo URL"><Input value={d.photoUrl ?? ""} onChange={(e) => set("photoUrl", e.target.value)} /></Field>
            <Field label="Company logo URL"><Input value={d.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} /></Field>
          </Grid>
        </Acc>
        <Acc value="notes" label="Notes"><Textarea rows={3} value={d.notes} onChange={(e) => set("notes", e.target.value)} /></Acc>
        {byCat.length ? (
          <Acc value="imported" label="Imported details">
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {byCat.flatMap(({ entries }) => entries).map(([k, v]) => (
                <div key={k} className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p><p className="mt-0.5 truncate text-sm">{v || "—"}</p></div>
              ))}
            </div>
          </Acc>
        ) : null}
      </Accordion>
    </div>
  );
}

/* ── Small helpers ──────────────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
function Acc({ value, label, children }: { value: string; label: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={value} className="rounded-lg border border-border px-3">
      <AccordionTrigger className="py-2.5 text-sm hover:no-underline">{label}</AccordionTrigger>
      <AccordionContent><div className="space-y-3 pb-2">{children}</div></AccordionContent>
    </AccordionItem>
  );
}
