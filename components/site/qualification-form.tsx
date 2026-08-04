"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* Scored options — points feed the free/paid qualification.
   (Numbers are a sensible starting point; easy to tune.) */
const VENUE = [
  "Café / Restaurant", "Retail store", "Gym / Fitness", "Bar / Nightlife", "Hotel / Hospitality",
  "Parking garage", "Medical / Waiting room", "Convenience / Gas", "Salon / Spa", "Office / Coworking", "Other",
];
const HIGH_TRAFFIC_VENUES = new Set(["Café / Restaurant", "Retail store", "Gym / Fitness", "Bar / Nightlife", "Hotel / Hospitality", "Parking garage", "Medical / Waiting room", "Convenience / Gas"]);

const VISITORS: { label: string; pts: number }[] = [
  { label: "Under 100 / day", pts: 0 },
  { label: "100–250 / day", pts: 1 },
  { label: "250–500 / day", pts: 2 },
  { label: "500–1,000 / day", pts: 3 },
  { label: "1,000+ / day", pts: 4 },
];
const DWELL: { label: string; pts: number }[] = [
  { label: "Under 5 min", pts: 0 },
  { label: "5–15 min", pts: 1 },
  { label: "15–45 min", pts: 2 },
  { label: "45+ min", pts: 3 },
];
const DAYS: { label: string; pts: number }[] = [
  { label: "1–3 days / week", pts: 0 },
  { label: "4–5 days / week", pts: 1 },
  { label: "6–7 days / week", pts: 2 },
];
const LOCATIONS: { label: string; pts: number }[] = [
  { label: "1 location", pts: 0 },
  { label: "2–5 locations", pts: 1 },
  { label: "6–20 locations", pts: 2 },
  { label: "20+ locations", pts: 3 },
];

type Form = {
  businessName: string; venueType: string; city: string; state: string;
  visitors: string; dwell: string; days: string; locations: string;
  firstName: string; lastName: string; email: string; phone: string;
};
const EMPTY: Form = { businessName: "", venueType: "", city: "", state: "", visitors: "", dwell: "", days: "", locations: "", firstName: "", lastName: "", email: "", phone: "" };

function pts(list: { label: string; pts: number }[], label: string) {
  return list.find((o) => o.label === label)?.pts ?? 0;
}

export function QualificationForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const onInput = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => set(k)(e.target.value);

  const result = useMemo(() => {
    const vpts = pts(VISITORS, form.visitors);
    const score = vpts + pts(DWELL, form.dwell) + pts(DAYS, form.days) + pts(LOCATIONS, form.locations) + (HIGH_TRAFFIC_VENUES.has(form.venueType) ? 1 : 0);
    const free = vpts >= 3 || score >= 5;
    return { score, free };
  }, [form]);

  const stepValid = [
    form.businessName && form.venueType && form.city && form.state,
    form.visitors && form.dwell && form.days && form.locations,
    form.firstName && form.lastName && form.email,
  ];

  async function submit() {
    setBusy(true);
    const tier = result.free ? "free" : "paid";
    const summary = [
      `Qualification: ${tier.toUpperCase()} (score ${result.score})`,
      `Venue: ${form.venueType} · ${form.city}, ${form.state}`,
      `Foot traffic: ${form.visitors} · Dwell: ${form.dwell} · Open: ${form.days} · Locations: ${form.locations}`,
    ].join("\n");
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "placement",
          name: `${form.firstName} ${form.lastName}`.trim(),
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, phone: form.phone, company: form.businessName,
          interest: `Placement — ${tier === "free" ? "Free" : "Paid"}`,
          subject: result.free ? "Qualifies for FREE placement" : "Paid placement fit",
          message: summary,
          meta: { tier, score: result.score, venueType: form.venueType, city: form.city, state: form.state, visitors: form.visitors, dwell: form.dwell, days: form.days, locations: form.locations },
        }),
      });
    } catch {
      /* best-effort — we still show the result */
    }
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full", result.free ? "bg-success/15 text-success" : "bg-brand/15 text-brand-strong")}>
          {result.free ? <CheckCircle2 className="h-7 w-7" /> : <TrendingUp className="h-7 w-7" />}
        </span>
        <h3 className="mt-4 text-2xl font-semibold text-foreground">
          {result.free ? "You qualify for FREE placement." : "You're a great fit for Paid placement."}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {result.free
            ? `Based on your foot traffic at ${form.businessName}, we can place a Channel Cast device at your location at no cost — hardware and software included.`
            : `A small monthly fee gets ${form.businessName} the device, the software, and the ability to sell your own ad space and keep the revenue.`}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-brand/5 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          Fit score: <span className="text-brand-strong">{result.score}</span> · We&apos;ll be in touch within one business day
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/register">Create your account <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild variant="outline"><Link href="/contact">Talk to us</Link></Button>
        </div>
      </div>
    );
  }

  const labels = ["Your business", "Your traffic", "Your details"];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      {/* progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Step {step + 1} of 3 · {labels[step]}</span>
          <span>{Math.round(((step + 1) / 3) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-brand-strong transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
      </div>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" full><Input value={form.businessName} onChange={onInput("businessName")} placeholder="Corner Café" /></Field>
          <Field label="Venue type"><Picker value={form.venueType} onChange={set("venueType")} placeholder="Choose a type" options={VENUE} /></Field>
          <Field label="City"><Input value={form.city} onChange={onInput("city")} placeholder="Chandler" /></Field>
          <Field label="State"><Input value={form.state} onChange={onInput("state")} placeholder="AZ" /></Field>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Daily foot traffic"><Picker value={form.visitors} onChange={set("visitors")} placeholder="Visitors per day" options={VISITORS.map((o) => o.label)} /></Field>
          <Field label="Average time on-site"><Picker value={form.dwell} onChange={set("dwell")} placeholder="How long people stay" options={DWELL.map((o) => o.label)} /></Field>
          <Field label="Days open"><Picker value={form.days} onChange={set("days")} placeholder="Days per week" options={DAYS.map((o) => o.label)} /></Field>
          <Field label="Locations"><Picker value={form.locations} onChange={set("locations")} placeholder="How many" options={LOCATIONS.map((o) => o.label)} /></Field>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name"><Input value={form.firstName} onChange={onInput("firstName")} placeholder="John" /></Field>
          <Field label="Last name"><Input value={form.lastName} onChange={onInput("lastName")} placeholder="Smith" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={onInput("email")} placeholder="john@business.com" /></Field>
          <Field label="Phone (optional)"><Input value={form.phone} onChange={onInput("phone")} placeholder="(480) 555-0100" /></Field>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={step === 0 ? "invisible" : ""}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid[step]}>Continue <ArrowRight className="h-4 w-4" /></Button>
        ) : (
          <Button onClick={submit} disabled={!stepValid[2] || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} See my result <ArrowRight className="h-4 w-4" /></Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("block space-y-1.5", full && "sm:col-span-2")}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Picker({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}
