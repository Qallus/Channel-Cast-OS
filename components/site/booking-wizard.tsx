"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarClock, CalendarDays, CheckCircle2, Clock, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { APPOINTMENT_TYPES, fmtTime, type AppointmentType } from "@/lib/bookings/types";
import { cn } from "@/lib/utils";

type Slot = { value: string; label: string };
const todayStr = () => new Date().toISOString().slice(0, 10);

export function BookingWizard() {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<AppointmentType>(APPOINTMENT_TYPES[0]);
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState<string>("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", projectName: "", notes: "", smsConsent: true });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function checkAvailability() {
    setLoadingSlots(true); setTime(""); setSlots(null);
    try {
      const res = await fetch(`/api/bookings?date=${encodeURIComponent(date)}&type=${encodeURIComponent(type.id)}`);
      const d = await res.json();
      setSlots(d.slots || []);
    } catch { setSlots([]); }
    finally { setLoadingSlots(false); }
  }

  async function submit() {
    if (!form.firstName || !form.email) { setError("Name and email are required."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeId: type.id, date, time, ...form }),
      });
      const d = await res.json();
      if (res.ok) setDone(true);
      else setError(d.error || "Couldn't submit the request.");
    } catch { setError("Couldn't submit the request."); }
    finally { setSubmitting(false); }
  }

  const contactName = [form.firstName, form.lastName].filter(Boolean).join(" ");
  const STEPS = [
    { n: 1, label: "Appointment", sub: type.name, icon: CalendarClock },
    { n: 2, label: "Date & Time", sub: time ? fmtTime(time) : "Pick availability", icon: Clock },
    { n: 3, label: "Your Details", sub: contactName || "Contact info", icon: User },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong">Book appointment</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Schedule with Channel Cast</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">Choose an appointment type, pick a time, and share a little context so our team can connect it to your account.</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm">
          <p className="font-medium text-foreground">Arizona time</p>
          <p className="text-xs text-muted-foreground">Advertiser, partner, and host friendly</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* Stepper */}
          <div className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((s) => (
              <button key={s.n} onClick={() => { if (s.n < step || done) return; }} disabled={done}
                className={cn("rounded-xl border p-4 text-left transition", s.n === step && !done ? "border-brand-strong bg-brand/5" : "border-border bg-card")}>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><s.icon className="h-3.5 w-3.5" /> Step {s.n}</div>
                <p className="mt-1 text-base font-semibold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </button>
            ))}
          </div>

          {/* Step body */}
          <div className="mt-5 rounded-2xl border border-border bg-card p-5">
            {done ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <h2 className="mt-4 text-2xl font-semibold text-foreground">Appointment Request Received</h2>
                <p className="mt-1 max-w-md text-muted-foreground">Channel Cast will confirm your {type.name.toLowerCase()} and connect it to your account. You&apos;ll get a confirmation by email{form.smsConsent ? " and text" : ""}.</p>
              </div>
            ) : step === 1 ? (
              <>
                <h2 className="text-lg font-semibold text-foreground">Choose appointment type</h2>
                <p className="text-sm text-muted-foreground">Select the meeting that best matches what you need.</p>
                <div className="mt-4 space-y-2.5">
                  {APPOINTMENT_TYPES.map((t) => (
                    <button key={t.id} onClick={() => setType(t)} className={cn("flex w-full items-start justify-between gap-3 rounded-xl border p-4 text-left transition", type.id === t.id ? "border-brand-strong bg-brand/5" : "border-border hover:border-brand-strong/40")}>
                      <span>
                        <span className="block font-semibold text-foreground">{t.name}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{t.description}</span>
                        <span className="mt-2 block text-xs text-muted-foreground">{t.minutes} minutes</span>
                      </span>
                      {type.id === t.id && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-strong" />}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={() => { setStep(2); setSlots(null); setTime(""); }}>Continue <ArrowRight className="h-4 w-4" /></Button>
                </div>
              </>
            ) : step === 2 ? (
              <>
                <h2 className="text-lg font-semibold text-foreground">Select date &amp; time</h2>
                <p className="text-sm text-muted-foreground">Available times are shown in Arizona time.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input type="date" value={date} min={todayStr()} onChange={(e) => { setDate(e.target.value); setSlots(null); setTime(""); }}
                    className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-strong sm:w-56" />
                  <Button variant="outline" onClick={checkAvailability} className="h-11 flex-1"><CalendarDays className="h-4 w-4" /> Check availability</Button>
                </div>
                <div className="mt-4">
                  {loadingSlots ? (
                    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Finding open times…</p>
                  ) : slots == null ? (
                    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Pick a date and check availability to see open appointment times.</p>
                  ) : slots.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No open times that day. Try another date.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {slots.map((sl) => (
                        <button key={sl.value} onClick={() => setTime(sl.value)} className={cn("rounded-lg border py-2.5 text-sm font-medium transition", time === sl.value ? "border-brand-strong bg-brand text-brand-foreground" : "border-border text-foreground hover:border-brand-strong/50")}>{sl.label}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-5 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!time}>Continue <ArrowRight className="h-4 w-4" /></Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-foreground">Your details</h2>
                <p className="text-sm text-muted-foreground">This creates or updates your contact so we can follow up.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input placeholder="First name *" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                  <Input placeholder="Last name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                  <Input placeholder="Email *" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  <Input placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  <Input placeholder="Company" value={form.company} onChange={(e) => set("company", e.target.value)} />
                  <Input placeholder="Project / campaign name" value={form.projectName} onChange={(e) => set("projectName", e.target.value)} />
                </div>
                <Textarea className="mt-3" rows={4} placeholder="Anything we should know before the meeting?" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                <label className="mt-3 flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground">
                  <input type="checkbox" checked={form.smsConsent} onChange={(e) => set("smsConsent", e.target.checked)} />
                  I agree to receive SMS updates for this appointment.
                </label>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                <div className="mt-5 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                  <Button onClick={submit} disabled={submitting}><CheckCircle2 className="h-4 w-4" /> {submitting ? "Sending…" : "Request appointment"}</Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Booking summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-base font-semibold text-foreground">Booking Summary</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Review your appointment request before sending it.</p>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Appointment", type.name],
                ["Duration", `${type.minutes} minutes`],
                ["Date", new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })],
                ["Time", time ? fmtTime(time) : "Not selected"],
                ["Contact", contactName || "Add contact details"],
                ["Project", form.projectName || "Can be added later"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-3 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">Requests create a booking record and can connect to your contact, campaigns, and project timeline.</p>
        </aside>
      </div>
    </div>
  );
}
