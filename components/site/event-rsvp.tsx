"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EventRsvp({ slug }: { slug: string }) {
  const [f, setF] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!f.email) { setError("Email is required."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/events/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, ...f }) });
      const d = await res.json();
      if (res.ok) setDone(true);
      else setError(d.error || "Couldn't register.");
    } catch { setError("Couldn't register."); }
    finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="mt-3 text-lg font-semibold text-foreground">You&apos;re registered</p>
        <p className="text-sm text-muted-foreground">We&apos;ll email you the details and any updates.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-base font-semibold text-foreground">Register</p>
      <div className="mt-3 space-y-2.5">
        <Input placeholder="Your name" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} />
        <Input placeholder="Email *" type="email" value={f.email} onChange={(e) => setF((s) => ({ ...s, email: e.target.value }))} />
        <Input placeholder="Phone" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Registering…" : "RSVP"}</Button>
      </div>
    </div>
  );
}
