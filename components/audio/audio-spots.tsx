"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarDays, LayoutGrid, List, Map as MapIcon, SquareKanban, Table as TableIcon } from "lucide-react";

import { SpotThumb } from "@/components/audio/spot-thumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SPOT_STATUS_META, SPOT_STATUS_ORDER, mockSpots, type AudioSpot, type SpotStatus } from "@/lib/audio/spots";
import { cn } from "@/lib/utils";

type ViewId = "list" | "table" | "card" | "kanban" | "calendar" | "map";
const VIEWS: { id: ViewId; label: string; icon: typeof List }[] = [
  { id: "list", label: "List", icon: List },
  { id: "table", label: "Table", icon: TableIcon },
  { id: "card", label: "Card", icon: LayoutGrid },
  { id: "kanban", label: "Kanban", icon: SquareKanban },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "map", label: "Map", icon: MapIcon },
];

const SpotsMap = dynamic(() => import("@/components/audio/spots-map"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">Loading map…</div>,
});

const num = new Intl.NumberFormat("en-US");
const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

function StatusBadge({ status }: { status: SpotStatus }) {
  const m = SPOT_STATUS_META[status];
  return <Badge className={cn("border-transparent", m.tone)}>{m.label}</Badge>;
}

export function AudioSpots() {
  const [view, setView] = useState<ViewId>("card");
  const spots = mockSpots;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{spots.length} audio spots</p>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const active = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-brand")} /> {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "list" && <ListView spots={spots} />}
      {view === "table" && <TableView spots={spots} />}
      {view === "card" && <CardView spots={spots} />}
      {view === "kanban" && <KanbanView spots={spots} />}
      {view === "calendar" && <CalendarView spots={spots} />}
      {view === "map" && <MapView spots={spots} />}
    </div>
  );
}

function ListView({ spots }: { spots: AudioSpot[] }) {
  return (
    <div className="space-y-2">
      {spots.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{s.name}</span>
                <SpotThumb image={s.image} alt={s.name} size="sm" />
                <StatusBadge status={s.status} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.advertiser} · {s.durationSec}s · {s.city}, {s.state}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{fmtDate(s.start)} – {fmtDate(s.end)}</span>
              <span>{num.format(s.plays)} plays</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableView({ spots }: { spots: AudioSpot[] }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Spot</TableHead>
              <TableHead>Advertiser</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Length</TableHead>
              <TableHead>Flight</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Plays</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {spots.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span>{s.name}</span>
                    <SpotThumb image={s.image} alt={s.name} size="sm" />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.advertiser}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell className="text-muted-foreground">{s.durationSec}s</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(s.start)} – {fmtDate(s.end)}</TableCell>
                <TableCell className="text-muted-foreground">{s.city}, {s.state}</TableCell>
                <TableCell className="text-right text-foreground">{num.format(s.plays)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CardView({ spots }: { spots: AudioSpot[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {spots.map((s) => (
        <Card key={s.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{s.name}</span>
                <SpotThumb image={s.image} alt={s.name} size="sm" />
              </div>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-xs text-muted-foreground">{s.advertiser}</p>
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{s.durationSec}s spot</span>
              <span className="font-medium text-foreground">{num.format(s.plays)} plays</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{s.city}, {s.state}</span>
              <span>{fmtDate(s.start)} – {fmtDate(s.end)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({ spots }: { spots: AudioSpot[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {SPOT_STATUS_ORDER.map((status) => {
        const items = spots.filter((s) => s.status === status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((s) => (
                <div key={s.id} className="rounded-md border border-border bg-background p-2.5">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">{s.name}</p>
                    <SpotThumb image={s.image} alt={s.name} size="sm" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.advertiser}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{s.durationSec}s · {s.city}</p>
                </div>
              ))}
              {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground/60">Empty</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ spots }: { spots: AudioSpot[] }) {
  // Default to the month with the most spot starts.
  const initial = useMemo(() => {
    const counts = new Map<string, number>();
    spots.forEach((s) => {
      const k = s.start.slice(0, 7);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? spots[0]?.start.slice(0, 7);
    const [y, m] = (top ?? "2026-07").split("-").map(Number);
    return { year: y, month: m - 1 };
  }, [spots]);

  const [cursor, setCursor] = useState(initial);
  const first = new Date(cursor.year, cursor.month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const byDay = useMemo(() => {
    const map = new Map<number, AudioSpot[]>();
    spots.forEach((s) => {
      const d = new Date(s.start + "T00:00:00");
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), s]);
      }
    });
    return map;
  }, [spots, cursor]);

  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground hover:text-foreground">‹</button>
          <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
          <button onClick={() => shift(1)} className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground hover:text-foreground">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => (
            <div key={i} className={cn("min-h-[76px] rounded-md border p-1", day ? "border-border" : "border-transparent")}>
              {day && (
                <>
                  <span className="text-xs text-muted-foreground">{day}</span>
                  <div className="mt-1 space-y-1">
                    {(byDay.get(day) ?? []).map((s) => (
                      <div key={s.id} className="truncate rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium text-brand" title={`${s.name} — ${s.advertiser}`}>
                        {s.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MapView({ spots }: { spots: AudioSpot[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <SpotsMap spots={spots} />
        <p className="mt-2 text-xs text-muted-foreground">{spots.length} spots plotted by location. Click a marker for details.</p>
      </CardContent>
    </Card>
  );
}
