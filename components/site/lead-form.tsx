"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INTERESTS = ["Advertise", "Host a device", "Reseller / agency", "Radio station", "Voice talent", "Other"];

export function LeadForm({ kind }: { kind: "contact" | "demo" }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", interest: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, kind }) });
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
        <h2 className="mt-4 text-xl font-semibold text-foreground">Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}!</h2>
        <p className="mt-1 text-sm text-muted-foreground">We&apos;ve got your {kind === "demo" ? "demo request" : "message"} and will be in touch shortly.</p>
        <Button asChild variant="outline" className="mt-5"><Link href="/">Back to home</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Name</span><Input value={form.name} onChange={set("name")} required placeholder="Your name" /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Email</span><Input type="email" value={form.email} onChange={set("email")} required placeholder="you@company.com" /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Company <span className="text-muted-foreground">(optional)</span></span><Input value={form.company} onChange={set("company")} placeholder="Company" /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Phone <span className="text-muted-foreground">(optional)</span></span><Input value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" /></label>
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">I&apos;m interested in</span>
        <Select value={form.interest} onValueChange={(v) => setForm((f) => ({ ...f, interest: v }))}>
          <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
          <SelectContent>{INTERESTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">{kind === "demo" ? "What would you like to see?" : "Message"}</span><Textarea rows={4} value={form.message} onChange={set("message")} placeholder={kind === "demo" ? "Tell us about your spaces or campaigns…" : "How can we help?"} /></label>
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {kind === "demo" ? "Request demo" : "Send message"}</Button>
    </form>
  );
}
