"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CheckoutConfirm({ summary }: { summary: { slug: string; listing: string; campaign: string; weeks: number; windowLabel: string; start: string; total: number } }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "booking",
          name,
          email,
          interest: "Advertise",
          message: `Booking request: ${summary.campaign} — ${summary.listing} · ${summary.weeks} wk · ${summary.windowLabel}${summary.start ? ` from ${summary.start}` : ""} · $${summary.total}`,
        }),
      });
    } catch {
      /* best-effort */
    }
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand-strong"><CheckCircle2 className="h-6 w-6" /></span>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Booking requested!</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">We&apos;ve received your request for <b className="text-foreground">{summary.listing}</b>. Our team will confirm availability and next steps by email.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild variant="outline"><Link href="/marketplace">Browse more spaces</Link></Button>
          <Button asChild><Link href="/register">Create an account</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <p className="text-sm font-semibold text-foreground">Your details</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Name</span><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Email</span><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" /></label>
      </div>
      <p className="text-xs text-muted-foreground">No payment is taken now — we&apos;ll confirm availability and send a secure invoice.</p>
      <Button type="submit" disabled={busy} className="w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Request booking</Button>
    </form>
  );
}
