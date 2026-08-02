"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, MonitorSpeaker, Store, Wallet, Wifi } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/marketing/marketplace";
import { cn } from "@/lib/utils";

type Group = { id: string; name: string; listed?: boolean; slug?: string | null; spaceType?: string | null; city?: string | null; state?: string | null; pricePerWeek?: number | null };
type Device = { id: string; groupId: string | null; status: string };
type Campaign = { id: string; source?: string; name: string; spaceSlug?: string; spaceName?: string; weeks?: number; total?: number; status?: string };

function useOwnerData() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/device-groups", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/devices", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/crm/campaigns", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([g, d, c]) => {
      if (Array.isArray(g)) setGroups(g);
      if (Array.isArray(d)) setDevices(d);
      if (Array.isArray(c)) setCampaigns(c.filter((x: Campaign) => x.source === "advertiser"));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return { groups, devices, campaigns, loading };
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wallet }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-brand-strong"><Icon className="h-5 w-5" /></span>
        <div><p className="text-xl font-semibold tracking-tight text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
      </CardContent>
    </Card>
  );
}

function useEarnings(groups: Group[], campaigns: Campaign[]) {
  return useMemo(() => {
    const mySlugs = new Set(groups.filter((g) => g.listed && g.slug).map((g) => g.slug));
    const booked = campaigns.filter((c) => c.spaceSlug && mySlugs.has(c.spaceSlug));
    const total = booked.reduce((s, c) => s + (c.total ?? 0), 0);
    return { booked, total };
  }, [groups, campaigns]);
}

export function OwnerOverview() {
  const { groups, devices, campaigns } = useOwnerData();
  const online = devices.filter((d) => d.status === "online").length;
  const published = groups.filter((g) => g.listed).length;
  const { total } = useEarnings(groups, campaigns);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your business</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monetize your spaces and track earnings from campaigns that run in them.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/app/owner/locations">My locations</Link></Button>
          <Button asChild><Link href="/app/admin/devices/new">Add a device</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Locations" value={String(groups.length)} icon={MapPin} />
        <Stat label="Devices online" value={String(online)} icon={Wifi} />
        <Stat label="Published spaces" value={String(published)} icon={Store} />
        <Stat label="Est. earnings" value={money(total)} icon={Wallet} />
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-foreground">Get earning</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href="/app/admin/devices" className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/40"><MonitorSpeaker className="h-5 w-5 text-brand-strong" /><p className="mt-2 text-sm font-medium text-foreground">Set up devices</p><p className="text-xs text-muted-foreground">Add players and group them by location.</p></Link>
            <Link href="/app/owner/locations" className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/40"><Store className="h-5 w-5 text-brand-strong" /><p className="mt-2 text-sm font-medium text-foreground">Publish a location</p><p className="text-xs text-muted-foreground">List a space so advertisers can book it.</p></Link>
            <Link href="/app/owner/earnings" className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/40"><Wallet className="h-5 w-5 text-brand-strong" /><p className="mt-2 text-sm font-medium text-foreground">Track earnings</p><p className="text-xs text-muted-foreground">See campaigns booked in your spaces.</p></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LocationsView() {
  const { groups, devices, loading } = useOwnerData();
  const count = (gid: string) => devices.filter((d) => d.groupId === gid).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My locations</h1>
        <Button asChild variant="outline"><Link href="/app/admin/devices">Manage devices</Link></Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center"><MapPin className="h-8 w-8 text-muted-foreground" /><p className="text-sm font-medium text-foreground">No locations yet</p><p className="text-xs text-muted-foreground">Create a device group (a location) in the fleet, then publish it here.</p><Button asChild className="mt-2"><Link href="/app/admin/devices">Go to devices</Link></Button></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-strong"><Store className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{g.name}</p>
                    {g.listed ? <Badge className="border-transparent bg-success/15 text-success">Published</Badge> : <Badge className="border-transparent bg-muted text-muted-foreground">Unlisted</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{[g.spaceType, [g.city, g.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "No details yet"} · {count(g.id)} device{count(g.id) === 1 ? "" : "s"}</p>
                </div>
                {g.pricePerWeek != null && <span className="text-sm font-semibold text-foreground">{money(g.pricePerWeek)}/wk</span>}
                <Button size="sm" variant="outline" asChild><Link href={`/app/admin/device-groups/${g.id}`}>{g.listed ? "Manage" : "Publish"}</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function EarningsView() {
  const { groups, campaigns, loading } = useOwnerData();
  const { booked, total } = useEarnings(groups, campaigns);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Earnings</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Booked campaigns" value={String(booked.length)} icon={Store} />
        <Stat label="Total booked" value={money(total)} icon={Wallet} />
        <Stat label="Spaces earning" value={String(new Set(booked.map((c) => c.spaceSlug)).size)} icon={MapPin} />
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : booked.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No bookings in your spaces yet. Publish a location on the <Link href="/app/owner/locations" className="font-medium text-brand-strong hover:underline">My locations</Link> page so advertisers can book it.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Space</TableHead><TableHead>Campaign</TableHead><TableHead>Weeks</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {booked.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-foreground">{c.spaceName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.weeks ?? 0}</TableCell>
                      <TableCell><Badge className={cn("border-transparent capitalize", c.status === "live" ? "bg-success/15 text-success" : c.status === "pending" ? "bg-warning/15 text-warning" : "bg-brand/15 text-brand-strong")}>{c.status ?? "draft"}</Badge></TableCell>
                      <TableCell className="text-right font-medium text-foreground">{money(c.total ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">Payouts and settlement are handled by Channel Cast; amounts shown reflect booked campaign value.</p>
    </div>
  );
}
