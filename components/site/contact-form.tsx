"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const INTERESTS = [
  "Advertising",
  "System placement (host a device)",
  "Partner — Radio station",
  "Reseller / Agency",
  "Voice talent",
  "Other",
];

export function ContactForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    businessName: "",
    website: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleInterest = (i: string) => setInterests((xs) => (xs.includes(i) ? xs.filter((x) => x !== i) : [...xs, i]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "contact",
          name: `${form.firstName} ${form.lastName}`.trim(),
          company: form.businessName,
          interest: interests.join(", "),
          interests,
          ...form,
        }),
      });
    } catch {
      /* best-effort — we still confirm to the user */
    }
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand-strong"><CheckCircle2 className="h-6 w-6" /></span>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Thanks{form.firstName ? `, ${form.firstName}` : ""}!</h2>
        <p className="mt-1 text-sm text-muted-foreground">We&apos;ve got your message and will be in touch within one business day.</p>
        <Button asChild variant="outline" className="mt-5"><Link href="/">Back to home</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First Name" required><Input value={form.firstName} onChange={set("firstName")} required placeholder="John" /></Field>
        <Field label="Last Name" required><Input value={form.lastName} onChange={set("lastName")} required placeholder="Smith" /></Field>
        <Field label="Business Name"><Input value={form.businessName} onChange={set("businessName")} placeholder="Company" /></Field>
        <Field label="Website"><Input value={form.website} onChange={set("website")} placeholder="yourbusiness.com" /></Field>
        <Field label="Email" required><Input type="email" value={form.email} onChange={set("email")} required placeholder="john@example.com" /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={set("phone")} placeholder="(480) 555-0100" /></Field>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground">What are you interested in? <span className="text-muted-foreground">(select all that apply)</span></span>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = interests.includes(i);
            return (
              <button
                type="button"
                key={i}
                onClick={() => toggleInterest(i)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  on ? "border-brand-strong bg-brand-strong text-background" : "border-border bg-card text-muted-foreground hover:border-brand-strong/40 hover:text-foreground",
                )}
              >
                {i}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Subject" required><Input value={form.subject} onChange={set("subject")} required placeholder="e.g. Advertising near my location" /></Field>

      <Field label="Message" required>
        <Textarea rows={6} value={form.message} onChange={set("message")} required placeholder="Tell us about your goals — your area, budget, timeline, or anything else we should know." />
      </Field>

      <p className="text-xs text-muted-foreground">
        By submitting this form you agree to be contacted by Channel Cast regarding your inquiry. We do not share your information with third parties.
      </p>
      <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send Message <ArrowRight className="h-4 w-4" /></Button>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}{required && <span className="text-brand-strong"> *</span>}</span>
      {children}
    </label>
  );
}
