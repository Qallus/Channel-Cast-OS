"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CalendarDays, Clock, Ticket } from "lucide-react";

import { BOOKING_STATUS, Booking, EventPage, fmtTime } from "@/lib/bookings/types";
import { cn } from "@/lib/utils";

type EventLite = Pick<EventPage, "id" | "title" | "slug" | "date" | "startTime" | "endTime" | "status">;
const fmtDate = (d: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—");

export function MyAppointments() {
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/my/bookings")
      .then((r) => r.json())
      .then((d) => { setAppointments(d.appointments || []); setEvents(d.events || []); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <p className="text-sm text-muted-foreground">Loading your appointments…</p>;
  if (!appointments.length && !events.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No appointments yet. <Link href="/book" className="font-medium text-brand-strong hover:underline">Book a call</Link> and it&apos;ll show up here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {appointments.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><CalendarClock className="h-4 w-4 text-brand-strong" /> My appointments</p>
          <div className="space-y-2">
            {appointments.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.typeName}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {fmtDate(b.date)} · {b.time ? fmtTime(b.time) : "—"} · {b.minutes}m</p>
                </div>
                <span className={cn("text-xs font-medium", BOOKING_STATUS[b.status].tone)}>{BOOKING_STATUS[b.status].label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Ticket className="h-4 w-4 text-brand-strong" /> My events</p>
          <div className="space-y-2">
            {events.map((e) => (
              <Link key={e.id} href={`/events/${e.slug}`} target="_blank" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3.5 hover:border-brand-strong/40">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{e.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" /> {fmtDate(e.date)} · {e.startTime ? fmtTime(e.startTime) : ""}</p>
                </div>
                <span className="text-xs font-medium text-brand-strong">Registered</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
