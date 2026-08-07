"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CreditCard, Loader2, Mic, ShoppingBag, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { money } from "@/lib/marketing/marketplace";
import { cn } from "@/lib/utils";
import { itemTotal, useCart, weeksBetween } from "@/components/cart/cart";

const STEPS = ["Review", "Your details", "Deposit", "Ad spot"];
const AD_OPTIONS = [
  { id: "dashboard", icon: Mic, title: "Create it in my dashboard", note: "Upload or record your spot after booking." },
  { id: "upload", icon: Upload, title: "Upload an audio file now", note: "Attach a WAV/MP3 you already have." },
  { id: "produce", icon: Mic, title: "Have Channel Cast produce it", note: "Our team writes, voices, and delivers your spot." },
];

export function CheckoutWizard() {
  const { items, update, remove, clear } = useCart();
  const [step, setStep] = useState(0);
  const [campaign, setCampaign] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", phone: "" });
  const [adChoice, setAdChoice] = useState("dashboard");
  const [adNotes, setAdNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const total = useMemo(() => items.reduce((s, i) => s + itemTotal(i), 0), [items]);
  const deposit = Math.round(total * 0.25);
  const allDated = items.length > 0 && items.every((i) => weeksBetween(i.start, i.end) > 0);

  const canNext = [allDated, form.firstName && form.lastName && form.email, true, true][step];

  async function complete() {
    setBusy(true);
    const spaces = items.map((i) => ({ slug: i.slug, name: i.name, start: i.start, end: i.end, weeks: weeksBetween(i.start, i.end), total: itemTotal(i) }));
    const summary = [
      campaign || "Untitled campaign",
      ...spaces.map((s) => `• ${s.name} — ${s.start || "?"} → ${s.end || "?"} (${s.weeks} wk, ${money(s.total)})`),
      `Ad spot: ${AD_OPTIONS.find((o) => o.id === adChoice)?.title}${fileName ? ` (${fileName})` : ""}${adNotes ? ` — ${adNotes}` : ""}`,
      `Total ${money(total)} · deposit ${money(deposit)}`,
    ].join("\n");
    try {
      await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "booking",
          name: `${form.firstName} ${form.lastName}`.trim(), firstName: form.firstName, lastName: form.lastName,
          email: form.email, phone: form.phone, company: form.company,
          interest: "Ad space booking",
          subject: `Booking · ${items.length} space${items.length > 1 ? "s" : ""} · ${money(total)}`,
          message: summary,
          meta: { kind: "booking", campaign, spaces, total, deposit, adSpot: { choice: adChoice, notes: adNotes, fileName } },
        }),
      });
    } catch { /* still confirm */ }
    setBusy(false);
    setDone(true);
    clear();
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"><CheckCircle2 className="h-8 w-8" /></span>
        <h1 className="mt-5 text-2xl font-semibold text-foreground">Your campaign is reserved.</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">We&apos;ve got your booking and will confirm availability and send your deposit invoice within one business day. Next, create your ad spot in the dashboard.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/register">Go to your dashboard <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild variant="outline"><Link href="/marketplace">Browse more spaces</Link></Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">Your campaign is empty</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add ad spaces from the marketplace to get started.</p>
        <Button asChild className="mt-5"><Link href="/marketplace">Browse the marketplace</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Marketplace</Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Book your campaign</h1>

      {/* Stepper */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold", i < step ? "bg-brand-strong text-background" : i === step ? "bg-brand-strong text-background ring-4 ring-brand-strong/20" : "bg-muted text-muted-foreground")}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className={cn("text-sm font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-6 bg-border sm:block" />}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Campaign name</span><Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Summer Sale — West Coast" /></label>
              <p className="text-sm font-medium text-foreground">{items.length} space{items.length > 1 ? "s" : ""} in this campaign</p>
              <div className="space-y-3">
                {items.map((i) => {
                  const w = weeksBetween(i.start, i.end);
                  return (
                    <div key={i.slug} className="rounded-xl border border-border p-3">
                      <div className="flex items-start gap-3">
                        {i.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                        ) : <div className="h-14 w-14 shrink-0 rounded-lg bg-muted" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{i.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{i.type}{i.city ? ` · ${i.city}, ${i.state}` : ""} · {money(i.pricePerWeek)}/wk</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{w > 0 ? money(itemTotal(i)) : "—"}</p>
                          <button onClick={() => remove(i.slug)} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /> Remove</button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="block"><span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Start</span><DatePicker value={i.start || ""} onChange={(v) => update(i.slug, { start: v })} placeholder="Add date" /></label>
                        <label className="block"><span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">End</span><DatePicker value={i.end || ""} onChange={(v) => update(i.slug, { end: v })} placeholder="Add date" /></label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" asChild><Link href="/marketplace">+ Add another location</Link></Button>
              {!allDated && <p className="text-xs text-warning">Add start and end dates to every space to continue.</p>}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">First name</span><Input value={form.firstName} onChange={setF("firstName")} placeholder="John" /></label>
              <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Last name</span><Input value={form.lastName} onChange={setF("lastName")} placeholder="Smith" /></label>
              <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Email</span><Input type="email" value={form.email} onChange={setF("email")} placeholder="john@company.com" /></label>
              <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Company</span><Input value={form.company} onChange={setF("company")} placeholder="Company" /></label>
              <label className="block space-y-1.5 sm:col-span-2"><span className="text-sm font-medium text-foreground">Phone <span className="text-muted-foreground">(optional)</span></span><Input value={form.phone} onChange={setF("phone")} placeholder="(555) 000-0000" /></label>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-brand-strong"><CreditCard className="h-5 w-5" /></span>
                <div>
                  <p className="text-base font-semibold text-foreground">Reserve with a deposit</p>
                  <p className="text-sm text-muted-foreground">A 25% refundable deposit holds your spaces while we confirm availability.</p>
                </div>
              </div>
              <dl className="mt-5 space-y-2 rounded-xl border border-border bg-background p-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Campaign total</dt><dd className="font-medium text-foreground">{money(total)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Deposit due (25%)</dt><dd className="font-semibold text-foreground">{money(deposit)}</dd></div>
                <div className="flex justify-between border-t border-border pt-2"><dt className="text-muted-foreground">Balance after confirmation</dt><dd className="font-medium text-foreground">{money(total - deposit)}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">You won&apos;t be charged today. We&apos;ll confirm availability and email a secure deposit invoice — nothing is committed until you pay it.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">How do you want to create your ad spot?</p>
              <div className="space-y-2">
                {AD_OPTIONS.map((o) => {
                  const Icon = o.icon;
                  const on = adChoice === o.id;
                  return (
                    <button key={o.id} onClick={() => setAdChoice(o.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors", on ? "border-brand-strong bg-brand/5" : "border-border hover:border-brand-strong/40")}>
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", on ? "bg-brand-strong text-background" : "bg-accent text-brand-strong")}><Icon className="h-4 w-4" /></span>
                      <span className="flex-1"><span className="block text-sm font-semibold text-foreground">{o.title}</span><span className="block text-xs text-muted-foreground">{o.note}</span></span>
                      {on && <Check className="h-4 w-4 text-brand-strong" />}
                    </button>
                  );
                })}
              </div>
              {adChoice === "upload" && (
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-border p-3 text-sm">
                  <span className="text-muted-foreground">{fileName || "Choose an audio file (WAV/MP3)…"}</span>
                  <span className="rounded-md border border-border px-3 py-1.5 font-medium text-foreground">Browse</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
                </label>
              )}
              <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Notes for our team <span className="text-muted-foreground">(optional)</span></span><Textarea rows={3} value={adNotes} onChange={(e) => setAdNotes(e.target.value)} placeholder="Tell us about your offer, tone, or script ideas…" /></label>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} className={step === 0 ? "invisible" : ""}><ArrowLeft className="h-4 w-4" /> Back</Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Continue <ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button onClick={complete} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Complete booking <ArrowRight className="h-4 w-4" /></Button>
            )}
          </div>
        </div>

        {/* Summary sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Campaign summary</p>
            <div className="mt-3 space-y-2 text-sm">
              {items.map((i) => (
                <div key={i.slug} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">{i.name}</span>
                  <span className="shrink-0 text-foreground">{weeksBetween(i.start, i.end) > 0 ? money(itemTotal(i)) : "—"}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold text-foreground"><span>Total</span><span>{total > 0 ? money(total) : "—"}</span></div>
            <div className="mt-1 flex justify-between text-sm text-muted-foreground"><span>Deposit (25%)</span><span>{deposit > 0 ? money(deposit) : "—"}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
