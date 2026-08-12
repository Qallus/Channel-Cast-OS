"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, Clock, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BOOKING_STATUS, BookingStatus, fmtTime } from "@/lib/bookings/types";
import { cn } from "@/lib/utils";

type View = { id: string; typeName: string; minutes: number; date: string; time: string; status: BookingStatus; firstName: string; lastName: string };

export function ManageAppointment({ id }: { id: string }) {
  const [b, setB] = useState<View | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${id}`).then((r) => (r.ok ? r.json() : null)).then(setB).catch(() => {}).finally(() => setLoaded(true));
  }, [id]);

  async function cancel() {
    if (!confirm("Cancel this appointment?")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      if (r.ok) setB((p) => (p ? { ...p, status: "canceled" } : p));
    } finally { setBusy(false); }
  }

  if (!loaded) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!b) return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">We couldn&apos;t find that appointment.</p>;

  const dateLabel = new Date(`${b.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-brand-strong"><CalendarClock className="h-5 w-5" /><p className="text-sm font-semibold uppercase tracking-wide">Your appointment</p></div>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{b.typeName}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" /> {dateLabel} · {fmtTime(b.time)} (Arizona time) · {b.minutes} min</p>
      <p className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium", b.status === "canceled" ? "bg-destructive/10 text-destructive" : "bg-brand/10 text-brand-strong")}>
        {b.status === "canceled" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} {BOOKING_STATUS[b.status].label}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {b.status !== "canceled" ? (
          <>
            <Button asChild variant="outline"><Link href="/book">Reschedule (book a new time)</Link></Button>
            <Button variant="outline" className="text-destructive" onClick={cancel} disabled={busy}><XCircle className="h-4 w-4" /> {busy ? "Canceling…" : "Cancel appointment"}</Button>
          </>
        ) : (
          <Button asChild><Link href="/book">Book a new appointment</Link></Button>
        )}
      </div>
    </div>
  );
}
