"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Eye,
  Globe,
  Link2,
  Map,
  Pencil,
  Plus,
  Rocket,
  Search,
  Trash2,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import { AddLocationWizard } from "@/components/advertising/add-location-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  INVENTORY_TYPES,
  getInventoryType,
  type InventoryLocation,
  type InventoryTypeId,
} from "@/lib/advertising/inventory";
import { mockLocations } from "@/lib/advertising/mock-data";
import { cn } from "@/lib/utils";

const numberFmt = new Intl.NumberFormat("en-US");
const moneyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const statusStyles: Record<InventoryLocation["status"], string> = {
  available: "border-transparent bg-success/15 text-success",
  active: "border-transparent bg-brand/15 text-brand",
  booked: "border-transparent bg-secondary text-secondary-foreground",
  maintenance: "border-transparent bg-warning/15 text-warning",
};

const bannerActions = [
  { label: "Devices", icon: Wifi },
  { label: "Media Library", icon: BarChart3 },
  { label: "Campaigns", icon: Rocket },
];

export function AdvertisingInventory() {
  const [activeType, setActiveType] = useState<InventoryTypeId>("standard_audio");
  const [locations, setLocations] = useState<InventoryLocation[]>(mockLocations);
  const [query, setQuery] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  const type = getInventoryType(activeType);

  const inType = useMemo(
    () => locations.filter((l) => l.type === activeType),
    [locations, activeType],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inType;
    return inType.filter(
      (l) => l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q) || l.locationCode.toLowerCase().includes(q),
    );
  }, [inType, query]);

  const stats = useMemo(() => {
    const total = inType.length;
    const available = inType.filter((l) => l.status === "available").length;
    const revenue = inType.reduce((sum, l) => sum + l.monthlyRate, 0);
    const avgImpressions = total ? Math.round(inType.reduce((sum, l) => sum + l.monthlyImpressions, 0) / total) : 0;
    return { total, available, revenue, avgImpressions };
  }, [inType]);

  function handleCreate(location: InventoryLocation) {
    setLocations((prev) => [location, ...prev]);
    setWizardOpen(false);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Advertising Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your advertising locations and availability</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline">
            <Globe className="h-4 w-4" />
            View Public Listing
          </Button>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
        {INVENTORY_TYPES.map((t) => {
          const Icon = t.icon;
          const active = t.id === activeType;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveType(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-brand")} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Locations" value={numberFmt.format(stats.total)} />
        <StatCard label="Available" value={numberFmt.format(stats.available)} accent />
        <StatCard label="Monthly Revenue Potential" value={moneyFmt.format(stats.revenue)} />
        <StatCard label="Avg Monthly Impressions" value={numberFmt.format(stats.avgImpressions)} />
      </div>

      {/* Management banner */}
      <Card className="border-brand/20 bg-gradient-to-r from-brand/10 via-card to-card">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{type.bannerTitle}</p>
            <p className="text-sm text-muted-foreground">{type.bannerSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {bannerActions.map((action) => (
              <Button key={action.label} variant="outline" size="sm">
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
            <Button size="sm">
              <Rocket className="h-4 w-4" />
              Deploy
            </Button>
            <Button variant="ghost" size="sm">
              <BarChart3 className="h-4 w-4" />
              Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${type.label.toLowerCase()}…`}
          className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Location list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <type.icon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No {type.label.toLowerCase()} locations yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add your first {type.noun} location to start building inventory and availability.
              </p>
              <Button className="mt-2" onClick={() => setWizardOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          filtered.map((loc) => <LocationRow key={loc.id} loc={loc} icon={type.icon} unit={type.audienceUnit} />)
        )}
      </div>

      <AddLocationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        type={type}
        onCreate={handleCreate}
      />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold tracking-tight", accent ? "text-brand" : "text-foreground")}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function LocationRow({
  loc,
  icon: Icon,
  unit,
}: {
  loc: InventoryLocation;
  icon: LucideIcon;
  unit: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{loc.name}</h3>
            <span className="whitespace-nowrap text-xs text-muted-foreground">#{loc.locationCode}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{loc.address || "No address set"}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Badge className={cn("capitalize", statusStyles[loc.status])}>{loc.status}</Badge>
            <span>{loc.monthlyRate > 0 ? `${moneyFmt.format(loc.monthlyRate)}/mo` : "$—/mo"}</span>
            <span>{numberFmt.format(loc.dailyTraffic)} daily traffic</span>
            <span>{numberFmt.format(loc.monthlyImpressions)} {unit}/mo</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {loc.linkedDevice ? (
              <Badge variant="secondary" className="gap-1 font-normal text-success">
                <Wifi className="h-3 w-3" /> {loc.linkedDevice}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">No devices linked</span>
            )}
            <Button variant="secondary" size="sm" className="h-7">
              <Link2 className="h-3.5 w-3.5" /> Link Device
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-brand">
              <Map className="h-3.5 w-3.5" /> Site Map
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 self-start">
          <Button variant="ghost" size="icon" aria-label="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
