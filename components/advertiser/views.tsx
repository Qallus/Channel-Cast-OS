"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarCheck, Loader2, Megaphone, MonitorSpeaker, Music, Plus, Store, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { money, type Listing } from "@/lib/marketing/marketplace";
import { cn } from "@/lib/utils";

type Campaign = {
  id: string; source?: string; name: string; status?: string;
  spaceSlug?: string; spaceName?: string; weeks?: number; total?: number;
  startDate?: string | null; window?: string; createdAt?: string;
  audioId?: string; audioName?: string; pricePerWeek?: number;
};
type LibAudio = { id: string; name: string };

function useCampaigns() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    fetch("/api/crm/campaigns", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setItems(d.filter((x: Campaign) => x.source === "advertiser")); }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  return { items, loading, reload: load };
}

const statusTone = (s?: string) => (s === "live" ? "bg-success/15 text-success" : s === "pending" ? "bg-warning/15 text-warning" : s === "ended" ? "bg-muted text-muted-foreground" : "bg-brand/15 text-brand-strong");

/* ── Overview ────────────────────────────────────────────────────────── */

export function AdvertiserOverview() {
  const { items } = useCampaigns();
  const spend = items.reduce((s, c) => s + (c.total ?? 0), 0);
  const spaces = new Set(items.map((c) => c.spaceSlug).filter(Boolean)).size;
  const active = items.filter((c) => c.status !== "ended").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plan campaigns, book ad space, and track your reach.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/marketplace">Browse marketplace</Link></Button>
          <Button asChild><Link href="/app/advertiser/campaigns/new"><Plus className="h-4 w-4" /> New campaign</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active campaigns" value={String(active)} icon={Megaphone} />
        <Stat label="Spaces booked" value={String(spaces)} icon={Store} />
        <Stat label="Total budget" value={money(spend)} icon={Wallet} />
        <Stat label="All campaigns" value={String(items.length)} icon={CalendarCheck} />
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-foreground">Get started</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href="/marketplace" className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/40"><Store className="h-5 w-5 text-brand-strong" /><p className="mt-2 text-sm font-medium text-foreground">Find ad space</p><p className="text-xs text-muted-foreground">Browse spaces near your audience.</p></Link>
            <Link href="/app/advertiser/campaigns/new" className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/40"><Megaphone className="h-5 w-5 text-brand-strong" /><p className="mt-2 text-sm font-medium text-foreground">Launch a campaign</p><p className="text-xs text-muted-foreground">Pick a space, set a schedule, go.</p></Link>
            <Link href="/app/advertiser/reports" className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/40"><CalendarCheck className="h-5 w-5 text-brand-strong" /><p className="mt-2 text-sm font-medium text-foreground">Track results</p><p className="text-xs text-muted-foreground">See plays and reach as they happen.</p></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Megaphone }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-5 w-5" /></span>
        <div><p className="text-xl font-semibold tracking-tight text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
      </CardContent>
    </Card>
  );
}

/* ── Campaigns list ──────────────────────────────────────────────────── */

export function CampaignsList() {
  const { items, loading, reload } = useCampaigns();
  const [deployFor, setDeployFor] = useState<Campaign | null>(null);
  const [library, setLibrary] = useState<LibAudio[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function openDeploy(c: Campaign) {
    setDeployFor(c);
    setMsg(null);
    if (!library) fetch("/api/admin/audio", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setLibrary(d.map((a: LibAudio) => ({ id: a.id, name: a.name }))); }).catch(() => setLibrary([]));
  }
  async function deploy(a: LibAudio) {
    const c = deployFor;
    if (!c || !c.spaceSlug) return;
    setBusyId(a.id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/spaces/deploy-audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceSlug: c.spaceSlug, audioId: a.id }) });
      const j = await res.json();
      if (res.ok) {
        await fetch("/api/crm/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...c, audioId: a.id, audioName: a.name, status: "live" }) }).catch(() => {});
        setMsg(`Deployed “${a.name}” to ${j.devices} device${j.devices === 1 ? "" : "s"}. Campaign is live.`);
        reload();
        setTimeout(() => setDeployFor(null), 1400);
      } else {
        setMsg(j.error || "Couldn't deploy.");
      }
    } catch {
      setMsg("Couldn't deploy.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1>
        <Button asChild><Link href="/app/advertiser/campaigns/new"><Plus className="h-4 w-4" /> New campaign</Link></Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center"><Megaphone className="h-8 w-8 text-muted-foreground" /><p className="text-sm font-medium text-foreground">No campaigns yet</p><Button asChild className="mt-2"><Link href="/app/advertiser/campaigns/new"><Plus className="h-4 w-4" /> New campaign</Link></Button></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.spaceName ?? "—"} · {c.weeks ?? 0} wk · {c.window ?? "All day"}{c.audioName ? ` · ♪ ${c.audioName}` : ""}</p>
                </div>
                <Badge className={cn("border-transparent capitalize", statusTone(c.status))}>{c.status ?? "draft"}</Badge>
                <span className="text-sm font-semibold text-foreground">{money(c.total ?? 0)}</span>
                {c.spaceSlug && (
                  <Button size="sm" variant={c.audioId ? "outline" : "default"} onClick={() => openDeploy(c)}>
                    <Music className="h-3.5 w-3.5" /> {c.audioId ? "Change audio" : "Deploy audio"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deployFor !== null} onOpenChange={(o) => !o && setDeployFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Deploy audio to {deployFor?.spaceName}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Pick a spot to play on every device at this space. The campaign goes live immediately.</p>
          <div className="mt-2 max-h-[50vh] space-y-2 overflow-y-auto">
            {library === null ? (
              <p className="text-sm text-muted-foreground">Loading your audio…</p>
            ) : library.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audio yet. Upload spots in <Link href="/app/admin/audio" className="font-medium text-brand-strong hover:underline">Audio Management</Link> first.</p>
            ) : (
              library.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                  <MonitorSpeaker className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.name}</span>
                  <Button size="sm" onClick={() => deploy(a)} disabled={busyId !== null}>{busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Deploy</Button>
                </div>
              ))
            )}
          </div>
          {msg && <p className="mt-2 text-sm text-brand-strong">{msg}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Bookings ────────────────────────────────────────────────────────── */

export function BookingsList() {
  const { items, loading } = useCampaigns();
  const booked = items.filter((c) => c.spaceSlug);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bookings</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : booked.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No bookings yet. <Link href="/marketplace" className="font-medium text-brand-strong hover:underline">Browse the marketplace</Link> to book a space.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Space</TableHead><TableHead>Campaign</TableHead><TableHead>Duration</TableHead><TableHead>Window</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {booked.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-foreground">{c.spaceName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.weeks ?? 0} wk</TableCell>
                      <TableCell className="text-muted-foreground">{c.window ?? "All day"}</TableCell>
                      <TableCell><Badge className={cn("border-transparent capitalize", statusTone(c.status))}>{c.status ?? "draft"}</Badge></TableCell>
                      <TableCell className="text-right font-medium text-foreground">{money(c.total ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── Reports ─────────────────────────────────────────────────────────── */

export function ReportsView() {
  const { items } = useCampaigns();
  const spend = items.reduce((s, c) => s + (c.total ?? 0), 0);
  const weeks = items.reduce((s, c) => s + (c.weeks ?? 0), 0);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Campaigns" value={String(items.length)} icon={Megaphone} />
        <Stat label="Booked weeks" value={String(weeks)} icon={CalendarCheck} />
        <Stat label="Total spend" value={money(spend)} icon={Wallet} />
        <Stat label="Spaces" value={String(new Set(items.map((c) => c.spaceSlug).filter(Boolean)).size)} icon={Store} />
      </div>
      <Card><CardContent className="p-6 text-sm text-muted-foreground">Play-level analytics (motion vs scheduled, by audience) appear here once your campaigns are running on live devices.</CardContent></Card>
    </div>
  );
}

/* ── Campaign builder ────────────────────────────────────────────────── */

const WINDOWS = ["All day", "Business hours", "Mornings", "Evenings", "Weekends"];

export function CampaignBuilder({ presetSlug }: { presetSlug?: string }) {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState(presetSlug ?? "");
  const [weeks, setWeeks] = useState("4");
  const [start, setStart] = useState("");
  const [win, setWin] = useState("All day");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/marketplace", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setListings(d); }).catch(() => {});
  }, []);

  const space = useMemo(() => listings.find((l) => l.slug === slug), [listings, slug]);
  const w = Math.max(1, Number(weeks) || 1);
  const total = space ? space.pricePerWeek * w : 0;

  async function launch() {
    if (!name.trim() || !space) return;
    setBusy(true);
    const rec = {
      id: crypto.randomUUID(),
      source: "advertiser",
      name: name.trim(),
      status: "pending",
      spaceSlug: space.slug,
      spaceName: space.name,
      weeks: w,
      window: win,
      startDate: start || null,
      pricePerWeek: space.pricePerWeek,
      total,
      createdAt: new Date().toISOString(),
    };
    try {
      await fetch("/api/crm/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rec) });
    } catch {
      /* best-effort */
    }
    router.push("/app/advertiser/campaigns");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">New campaign</h1>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Campaign name</span><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Sale 2026" /></label>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Ad space</span>
              <Select value={slug} onValueChange={setSlug}>
                <SelectTrigger><SelectValue placeholder="Choose a space" /></SelectTrigger>
                <SelectContent>{listings.map((l) => <SelectItem key={l.slug} value={l.slug}>{l.name} — {money(l.pricePerWeek)}/wk</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Not sure? <Link href="/marketplace" className="text-brand-strong hover:underline">Browse the marketplace</Link>.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Weeks</span><Input type="number" min={1} value={weeks} onChange={(e) => setWeeks(e.target.value)} /></label>
              <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">Start date</span><DatePicker value={start} onChange={setStart} placeholder="Pick a date" /></label>
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Play window</span>
              <Select value={win} onValueChange={setWin}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WINDOWS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
            </div>
            <p className="text-xs text-muted-foreground">You&apos;ll attach or record your audio spot after the campaign is created.</p>
          </CardContent>
        </Card>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-foreground">Summary</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Space</dt><dd className="max-w-[60%] truncate text-right font-medium text-foreground">{space?.name ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Rate</dt><dd className="font-medium text-foreground">{space ? `${money(space.pricePerWeek)}/wk` : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Weeks</dt><dd className="font-medium text-foreground">{w}</dd></div>
              </dl>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold text-foreground"><span>Total</span><span>{money(total)}</span></div>
              <Button className="mt-5 w-full" onClick={launch} disabled={busy || !name.trim() || !space}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create campaign <ArrowRight className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
