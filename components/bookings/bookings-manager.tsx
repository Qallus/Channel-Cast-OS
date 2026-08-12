"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CalendarDays, CheckCircle2, ExternalLink, ListChecks, Plus, Search, Ticket, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { genId, useCollection } from "@/lib/crm/store";
import {
  APPOINTMENT_TYPES, BOOKING_STATUS, Booking, BookingStatus, EVENT_TYPES, EVENT_TYPE_LABEL, EventPage, EventType,
  AvailabilityRule, DEFAULT_AVAILABILITY, bookingName, fmtTime, slotsForDate, slugify,
} from "@/lib/bookings/types";
import { cn } from "@/lib/utils";

type Tab = "list" | "calendar" | "events" | "availability";
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—");

type ProjectRec = { id: string; name?: string };

export function BookingsManager() {
  const { items: bookings, create, update } = useCollection<Booking>("bookings", []);
  const eventsCol = useCollection<EventPage>("event_pages", []);
  const contactsCol = useCollection<{ id: string }>("contacts", []);
  const projectsCol = useCollection<ProjectRec>("projects", []);
  const settingsCol = useCollection<{ id: string; rules?: AvailabilityRule[] }>("settings", []);
  const availability = settingsCol.items.find((s) => s.id === "booking_availability")?.rules ?? DEFAULT_AVAILABILITY;
  function saveAvailability(rules: AvailabilityRule[]) {
    if (settingsCol.items.some((s) => s.id === "booking_availability")) settingsCol.update("booking_availability", { id: "booking_availability", rules });
    else settingsCol.create({ id: "booking_availability", rules });
  }

  const [tab, setTab] = useState<Tab>("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [apptOpen, setApptOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  const today = todayStr();
  const stats = useMemo(() => ({
    total: bookings.length,
    upcoming: bookings.filter((b) => b.date >= today && (b.status === "pending" || b.status === "confirmed")).length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    linked: bookings.filter((b) => b.contactId || b.projectId || b.clientId).length,
    timeline: bookings.filter((b) => b.showOnTimeline).length,
  }), [bookings, today]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...bookings]
      .filter((b) => (statusFilter === "all" ? true : b.status === statusFilter))
      .filter((b) => !q || [b.typeName, bookingName(b), b.email, b.company, b.projectName].join(" ").toLowerCase().includes(q))
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  }, [bookings, search, statusFilter]);

  const sel = bookings.find((b) => b.id === selected) || null;
  const projectName = (id?: string | null) => projectsCol.items.find((p) => p.id === id)?.name || "—";

  function setStatus(b: Booking, status: BookingStatus) {
    update(b.id, { ...b, status });
  }

  // Group for calendar view.
  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of [...bookings].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))) {
      if (!map.has(b.date)) map.set(b.date, []);
      map.get(b.date)!.push(b);
    }
    return Array.from(map.entries());
  }, [bookings]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule</p>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage appointments, connect bookings to contacts and projects, and publish event pages.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline"><Link href="/book" target="_blank"><ExternalLink className="h-4 w-4" /> Public booking</Link></Button>
          <Button variant="outline" onClick={() => setEventOpen(true)}><Ticket className="h-4 w-4" /> One-time event</Button>
          <Button onClick={() => setApptOpen(true)}><Plus className="h-4 w-4" /> Add appointment</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Total", stats.total], ["Upcoming", stats.upcoming], ["Pending", stats.pending],
          ["Confirmed", stats.confirmed], ["Linked records", stats.linked], ["Project timeline", stats.timeline],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([["list", "List"], ["calendar", "Calendar"], ["events", "Events"], ["availability", "Availability"]] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={cn("shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", tab === id ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>
        {(tab === "list" || tab === "calendar") && (
          <div className="flex items-center gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bookings…" className="h-9 w-56 pl-8" /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground">
              <option value="all">All statuses</option>
              {(Object.keys(BOOKING_STATUS) as BookingStatus[]).map((s) => <option key={s} value={s}>{BOOKING_STATUS[s].label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Views */}
      {tab === "list" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-xl border border-border bg-card">
            {filtered.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No bookings yet. Add one, or share your public booking page.</p>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((b) => (
                  <button key={b.id} onClick={() => setSelected(b.id)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50", selected === b.id && "bg-accent/60")}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{b.typeName}: {bookingName(b)}</p>
                      <p className="truncate text-xs text-muted-foreground">{b.email}{b.phone ? ` · ${b.phone}` : ""}</p>
                    </div>
                    <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">{fmtDate(b.date)}<br />{b.time ? fmtTime(b.time) : ""}</div>
                    <span className={cn("shrink-0 text-xs font-medium", BOOKING_STATUS[b.status].tone)}>{BOOKING_STATUS[b.status].label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="rounded-xl border border-border bg-card p-4 lg:sticky lg:top-24 lg:self-start">
            {!sel ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Select a booking to see details.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-base font-semibold text-foreground">{sel.typeName}</p>
                  <p className="text-sm text-muted-foreground">{fmtDate(sel.date)} · {sel.time ? fmtTime(sel.time) : "—"} · {sel.minutes}m</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{bookingName(sel)}</p>
                  <p className="text-xs text-muted-foreground">{sel.email}{sel.phone ? ` · ${sel.phone}` : ""}</p>
                  {sel.company && <p className="text-xs text-muted-foreground">{sel.company}</p>}
                </div>
                <dl className="space-y-1.5 text-sm">
                  {[["Status", BOOKING_STATUS[sel.status].label], ["Project", sel.projectName || projectName(sel.projectId)], ["Location", sel.location || "—"], ["Client visible", sel.clientVisible ? "Yes" : "No"], ["On timeline", sel.showOnTimeline ? "Yes" : "No"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium text-foreground">{v}</dd></div>
                  ))}
                </dl>
                {sel.notes && <p className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground">{sel.notes}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setStatus(sel, "confirmed")}><CheckCircle2 className="h-3.5 w-3.5" /> Confirm</Button>
                  <Button size="sm" onClick={() => setStatus(sel, "completed")}><ListChecks className="h-3.5 w-3.5" /> Complete</Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setStatus(sel, "canceled")}><XCircle className="h-3.5 w-3.5" /> Cancel</Button>
                </div>
                {sel.contactId && <Button asChild size="sm" variant="ghost" className="w-full"><Link href={`/app/admin/contacts/${sel.contactId}`}>Open contact <ExternalLink className="h-3.5 w-3.5" /></Link></Button>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "calendar" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {byDate.length === 0 ? <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No bookings scheduled.</p> : byDate.map(([date, list]) => (
            <div key={date} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{fmtDate(date)}</p>
              <div className="mt-3 space-y-2">
                {list.map((b) => (
                  <button key={b.id} onClick={() => { setTab("list"); setSelected(b.id); }} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">
                    <span className="font-medium text-foreground">{b.time ? fmtTime(b.time) : ""}</span> · {b.typeName}: {bookingName(b)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "events" && <EventsView col={eventsCol} onNew={() => setEventOpen(true)} />}

      {tab === "availability" && <AvailabilityEditor rules={availability} onSave={saveAvailability} />}

      <AppointmentSheet open={apptOpen} onClose={() => setApptOpen(false)} bookings={bookings} projects={projectsCol.items} rules={availability}
        onSave={(b, contact) => { if (contact) contactsCol.create(contact); create(b); setApptOpen(false); setTab("list"); setSelected(b.id); }} />
      <EventSheet open={eventOpen} onClose={() => setEventOpen(false)} onSave={(e) => { eventsCol.create(e); setEventOpen(false); setTab("events"); }} />
    </div>
  );
}

// ── Events view ───────────────────────────────────────────────────────────────
function EventsView({ col, onNew }: { col: ReturnType<typeof useCollection<EventPage>>; onNew: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-foreground">One-time event pages</p>
            <p className="text-sm text-muted-foreground">Public event pages can register contacts and show on the project timeline.</p>
          </div>
          <Button size="sm" onClick={onNew}><Plus className="h-4 w-4" /> New event</Button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {col.items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No event pages yet.</p> : col.items.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">{e.title} <span className="text-xs text-brand-strong">{EVENT_TYPE_LABEL[e.eventType]}</span></p>
                <p className="text-xs text-muted-foreground">/events/{e.slug} · {fmtDate(e.date)} {e.startTime ? fmtTime(e.startTime) : ""} · {e.rsvps.length} RSVP{e.rsvps.length === 1 ? "" : "s"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-medium", e.status === "published" ? "text-success" : e.status === "archived" ? "text-muted-foreground" : "text-warning")}>{e.status}</span>
                <Button asChild size="sm" variant="outline"><Link href={`/events/${e.slug}`} target="_blank">Open</Link></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => col.remove(e.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Staff calendar sync</p>
        <p className="text-sm text-muted-foreground">Connect staff Google or Outlook calendars for two-way sync. No calendars connected yet.</p>
      </div>
    </div>
  );
}

// ── Add appointment sheet ─────────────────────────────────────────────────────
function AppointmentSheet({ open, onClose, bookings, projects, rules, onSave }: {
  open: boolean; onClose: () => void; bookings: Booking[]; projects: ProjectRec[]; rules: AvailabilityRule[];
  onSave: (b: Booking, contact: { id: string } | null) => void;
}) {
  const [typeId, setTypeId] = useState(APPOINTMENT_TYPES[0].id);
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("");
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", projectName: "", notes: "", projectId: "", assignedStaff: "", createContact: true, showOnTimeline: true });
  const type = APPOINTMENT_TYPES.find((t) => t.id === typeId)!;
  const taken = bookings.filter((b) => b.date === date && b.status !== "canceled").map((b) => b.time);
  const slots = slotsForDate(date, type.minutes, taken, rules);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  function save() {
    if (!f.firstName || !f.email || !time) return;
    const id = genId("bk");
    const contactId = f.createContact ? genId("ct") : null;
    const booking: Booking = {
      id, typeId, typeName: type.name, minutes: type.minutes, date, time, status: "confirmed",
      firstName: f.firstName, lastName: f.lastName, email: f.email, phone: f.phone, company: f.company,
      projectName: f.projectName, notes: f.notes, smsConsent: false, location: "onsite", clientVisible: true,
      showOnTimeline: f.showOnTimeline, contactId, projectId: f.projectId || null, assignedStaff: f.assignedStaff || null,
      source: "dashboard", createdAt: new Date().toISOString(),
    };
    const contact = contactId ? {
      id: contactId, name: `${f.firstName} ${f.lastName}`.trim(), firstName: f.firstName, lastName: f.lastName,
      title: "", company: f.company, type: "lead", status: "active", email: f.email, phone: f.phone, sms: f.phone,
      website: "", address: "", city: "", state: "", zip: "", source: "Booking", owner: "Jeremy Waters",
      tags: [] as string[], notes: f.notes, lastContact: date, createdAt: new Date().toISOString(), details: {},
    } as unknown as { id: string } : null;
    onSave(booking, contact);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>Add appointment</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Appointment type"><select value={typeId} onChange={(e) => { setTypeId(e.target.value); setTime(""); }} className={selCls}>{APPOINTMENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
            <Field label="Date"><input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} className={selCls} /></Field>
          </div>
          <Field label="Available times">
            {slots.length === 0 ? <p className="text-xs text-muted-foreground">No open times that day.</p> : (
              <div className="grid grid-cols-3 gap-1.5">{slots.map((s) => <button key={s} onClick={() => setTime(s)} className={cn("rounded-md border py-1.5 text-xs", time === s ? "border-brand-strong bg-brand text-brand-foreground" : "border-border text-foreground hover:border-brand-strong/50")}>{fmtTime(s)}</button>)}</div>
            )}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name"><Input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
            <Field label="Last name"><Input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Company"><Input value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
            <Field label="Linked project"><select value={f.projectId} onChange={(e) => set("projectId", e.target.value)} className={selCls}><option value="">No linked project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name || "Untitled"}</option>)}</select></Field>
            <Field label="Project name"><Input value={f.projectName} onChange={(e) => set("projectName", e.target.value)} /></Field>
            <Field label="Assigned staff"><Input value={f.assignedStaff} onChange={(e) => set("assignedStaff", e.target.value)} placeholder="Unassigned" /></Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.createContact} onChange={(e) => set("createContact", e.target.checked)} /> Create / link contact</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.showOnTimeline} onChange={(e) => set("showOnTimeline", e.target.checked)} /> Show on project timeline</label>
          </div>
          <Field label="Notes"><Textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={!f.firstName || !f.email || !time}><CheckCircle2 className="h-4 w-4" /> Save appointment</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Create event sheet ────────────────────────────────────────────────────────
function EventSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (e: EventPage) => void }) {
  const [e, setE] = useState({
    title: "", slug: "", eventType: "open_house" as EventType, hostStaff: "", multiDay: false, date: todayStr(), endDate: "",
    startTime: "10:00", endTime: "11:00", status: "draft" as EventPage["status"], locationType: "in_person" as EventPage["locationType"],
    location: "", capacity: "", showOnTimeline: true, showSpots: false, summary: "", description: "", photoUrl: "", videoUrl: "",
  });
  const set = <K extends keyof typeof e>(k: K, v: (typeof e)[K]) => setE((s) => ({ ...s, [k]: v }));

  function save() {
    if (!e.title) return;
    const slug = e.slug ? slugify(e.slug) : slugify(e.title);
    onSave({
      id: genId("ev"), title: e.title, slug, eventType: e.eventType, hostStaff: e.hostStaff, multiDay: e.multiDay,
      date: e.date, endDate: e.endDate, startTime: e.startTime, endTime: e.endTime, projectId: null, status: e.status,
      locationType: e.locationType, location: e.location, capacity: e.capacity ? Number(e.capacity) : null,
      showOnTimeline: e.showOnTimeline, showSpots: e.showSpots, summary: e.summary, description: e.description,
      photoUrl: e.photoUrl, videoUrl: e.videoUrl, gallery: [], rsvps: [], createdAt: new Date().toISOString(),
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>Create event page</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title"><Input value={e.title} onChange={(ev) => set("title", ev.target.value)} /></Field>
            <Field label="Slug"><Input value={e.slug} onChange={(ev) => set("slug", ev.target.value)} placeholder="event-page-url" /></Field>
            <Field label="Event type"><select value={e.eventType} onChange={(ev) => set("eventType", ev.target.value as EventType)} className={selCls}>{EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>)}</select></Field>
            <Field label="Host staff"><Input value={e.hostStaff} onChange={(ev) => set("hostStaff", ev.target.value)} placeholder="No host selected" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={e.multiDay} onChange={(ev) => set("multiDay", ev.target.checked)} /> Multi-day event</label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date"><input type="date" value={e.date} onChange={(ev) => set("date", ev.target.value)} className={selCls} /></Field>
            <Field label="Start time"><input type="time" value={e.startTime} onChange={(ev) => set("startTime", ev.target.value)} className={selCls} /></Field>
            <Field label="End time"><input type="time" value={e.endTime} onChange={(ev) => set("endTime", ev.target.value)} className={selCls} /></Field>
          </div>
          {e.multiDay && <Field label="End date"><input type="date" value={e.endDate} onChange={(ev) => set("endDate", ev.target.value)} className={selCls} /></Field>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status"><select value={e.status} onChange={(ev) => set("status", ev.target.value as EventPage["status"])} className={selCls}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
            <Field label="Location type"><select value={e.locationType} onChange={(ev) => set("locationType", ev.target.value as EventPage["locationType"])} className={selCls}><option value="in_person">In person</option><option value="virtual">Virtual</option><option value="hybrid">Hybrid</option></select></Field>
            <Field label="Location"><Input value={e.location} onChange={(ev) => set("location", ev.target.value)} /></Field>
            <Field label="Capacity"><Input type="number" value={e.capacity} onChange={(ev) => set("capacity", ev.target.value)} /></Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={e.showOnTimeline} onChange={(ev) => set("showOnTimeline", ev.target.checked)} /> Show on project timeline</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={e.showSpots} onChange={(ev) => set("showSpots", ev.target.checked)} /> Show spots remaining</label>
          </div>
          <Field label="Summary"><Input value={e.summary} onChange={(ev) => set("summary", ev.target.value)} /></Field>
          <Field label="Description"><Textarea rows={3} value={e.description} onChange={(ev) => set("description", ev.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Photo URL"><Input value={e.photoUrl} onChange={(ev) => set("photoUrl", ev.target.value)} placeholder="https://…" /></Field>
            <Field label="Video URL"><Input value={e.videoUrl} onChange={(ev) => set("videoUrl", ev.target.value)} placeholder="https://…" /></Field>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={!e.title}><CalendarClock className="h-4 w-4" /> Create event page</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Availability editor ───────────────────────────────────────────────────────
function AvailabilityEditor({ rules, onSave }: { rules: AvailabilityRule[]; onSave: (r: AvailabilityRule[]) => void }) {
  const [draft, setDraft] = useState<AvailabilityRule[]>(rules);
  const [saved, setSaved] = useState(false);
  const setDay = (i: number, patch: Partial<AvailabilityRule>) => setDraft((d) => d.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-foreground">Availability</p>
          <p className="text-sm text-muted-foreground">Weekly hours used to offer public appointment times (Arizona time).</p>
        </div>
        <Button size="sm" onClick={() => { onSave(draft); setSaved(true); setTimeout(() => setSaved(false), 1800); }}>{saved ? "Saved" : "Save availability"}</Button>
      </div>
      <div className="mt-4 space-y-2">
        {draft.map((r, i) => (
          <div key={r.day} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <label className="flex w-32 items-center gap-2 text-sm font-medium text-foreground">
              <input type="checkbox" checked={r.available} onChange={(e) => setDay(i, { available: e.target.checked })} /> {r.day}
            </label>
            {r.available ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="time" value={r.start} onChange={(e) => setDay(i, { start: e.target.value })} className="h-9 rounded-md border border-border bg-background px-2 text-foreground" />
                <span>to</span>
                <input type="time" value={r.end} onChange={(e) => setDay(i, { end: e.target.value })} className="h-9 rounded-md border border-border bg-background px-2 text-foreground" />
              </div>
            ) : <span className="text-sm text-muted-foreground">Unavailable</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

const selCls = "h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-brand-strong";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}
