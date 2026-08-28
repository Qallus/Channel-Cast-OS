"use client";

// Booking an appointment from an opportunity.
//
// Uses the existing booking pipeline rather than a parallel one: the same
// /api/bookings endpoint, appointment types, confirmation email and SMS, and the
// same 24-hour reminder cron. The only addition is that the booking carries the
// opportunity and contact ids, so it lands on this deal's timeline.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, ExternalLink } from "lucide-react";

import { FormField } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Contact } from "@/lib/crm/contacts";
import { contactName } from "@/lib/crm/contacts";
import type { Deal } from "@/lib/crm/deals";
import { APPOINTMENT_TYPES, BOOKING_STATUS, type Booking } from "@/lib/bookings/types";
import { useCollection } from "@/lib/crm/store";
import { cn } from "@/lib/utils";

const LOCATIONS = [
  { value: "remote", label: "Remote / video" },
  { value: "phone", label: "Phone" },
  { value: "onsite", label: "On site" },
];

const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${period}`;
};
const fmtDay = (d: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";

export function ScheduleDialog({
  deal, contact, open, onClose, onBooked,
}: {
  deal: Deal;
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  onBooked: (msg: string) => void;
}) {
  const person = contact ? contactName(contact) : deal.client;
  const [typeId, setTypeId] = useState(APPOINTMENT_TYPES[0].id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [location, setLocation] = useState("remote");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTypeId(APPOINTMENT_TYPES[0].id);
    setDate(new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10));
    setTime("10:00");
    setLocation("remote");
    setEmail(contact?.email ?? "");
    setPhone(contact?.phone ?? "");
    setNotes("");
    setError(null);
  }, [open, contact]);

  const type = APPOINTMENT_TYPES.find((t) => t.id === typeId) ?? APPOINTMENT_TYPES[0];
  const [first, ...rest] = person.split(" ");

  async function book() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId, date, time, location, notes,
          firstName: first ?? "", lastName: rest.join(" "),
          email, phone, company: deal.client, projectName: deal.name,
          // These are what tie it back to the deal.
          contactId: deal.contactId ?? null,
          opportunityId: deal.id,
          assignedStaff: deal.owner,
          source: "dashboard",
          smsConsent: Boolean(phone),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d?.error || "The appointment couldn't be booked."); return; }
      onBooked(`${type.name} booked for ${fmtDay(date)}.`);
      onClose();
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-strong" /> Schedule an appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            With <span className="font-medium text-foreground">{person}</span>
            {deal.client && person !== deal.client ? ` · ${deal.client}` : ""}
          </p>

          <FormField label="Appointment type">
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.minutes}m</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <p className="-mt-1 text-xs text-muted-foreground">{type.description}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
            <FormField label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></FormField>
            <FormField label="Where">
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Required for the confirmation" /></FormField>
            <FormField label="Mobile"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For the reminder text" /></FormField>
          </div>

          <FormField label="Notes"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Agenda, context, what to prepare…" /></FormField>

          <p className="text-xs text-muted-foreground">
            Books through the normal flow — confirmation email now, reminder text 24 hours before
            {phone ? "" : " (add a mobile to enable the reminder)"}.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={book} disabled={busy || !date || !time || !email.trim()}>
            {busy ? "Booking…" : "Book appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Appointments already on the books for this opportunity. */
export function AppointmentsCard({ deal }: { deal: Deal }) {
  const { items } = useCollection<Booking>("bookings", []);

  const mine = useMemo(() => {
    const rows = items.filter((b) => b.opportunityId === deal.id || (deal.contactId && b.contactId === deal.contactId));
    // Soonest upcoming first; past ones fall below.
    const now = new Date().toISOString().slice(0, 10);
    return rows.sort((a, b) => {
      const aUp = a.date >= now, bUp = b.date >= now;
      if (aUp !== bUp) return aUp ? -1 : 1;
      return aUp ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });
  }, [items, deal.id, deal.contactId]);

  if (!mine.length) return <p className="text-sm text-muted-foreground">No appointments booked.</p>;

  const today = new Date().toISOString().slice(0, 10);
  return (
    <ul className="space-y-2">
      {mine.slice(0, 6).map((b) => {
        const past = b.date < today;
        const status = BOOKING_STATUS[b.status];
        return (
          <li key={b.id} className={cn("rounded-lg border border-border p-2.5", past && "opacity-60")}>
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{b.typeName}</span>
                <span className="block text-xs text-muted-foreground">
                  {fmtDay(b.date)} · {fmtTime(b.time)} · {b.minutes}m
                </span>
              </span>
              <Badge className={cn("border-transparent bg-muted text-[10px]", status?.tone)}>{status?.label ?? b.status}</Badge>
            </div>
            {b.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.notes}</p>}
          </li>
        );
      })}
      <li>
        <Link href="/app/admin/bookings" className="inline-flex items-center gap-1 text-xs text-brand-strong hover:underline">
          Open in Bookings <ExternalLink className="h-3 w-3" />
        </Link>
      </li>
    </ul>
  );
}

export const SCHEDULE_ICON = CalendarClock;
export const SCHEDULE_CHECK = Check;
