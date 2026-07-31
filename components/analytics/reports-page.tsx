"use client";

import { useMemo, useState } from "react";
import { Download, FileBarChart, LayoutGrid, Play, Table as TableIcon } from "lucide-react";

import { EmptyState, PageHeader, SearchBox, StatRow, StatTile, ViewSwitcher } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORY_TONE, REPORT_CATEGORIES, Report, ReportCategory, seedReports } from "@/lib/analytics/reports";
import { cn } from "@/lib/utils";

type View = "cards" | "table";
const VIEWS = [
  { id: "cards" as const, label: "Cards", icon: LayoutGrid },
  { id: "table" as const, label: "Table", icon: TableIcon },
];

const fmtDate = (iso: string | null) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never run");

function CategoryBadge({ category }: { category: ReportCategory }) {
  return <Badge className={cn("border-transparent", CATEGORY_TONE[category])}>{category}</Badge>;
}

// Build a CSV string and trigger a client-side download.
function exportCsv(report: Report) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [report.headers, ...report.rows].map((row) => row.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(seedReports);
  const [view, setView] = useState<View>("cards");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<ReportCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (catFilter !== "all" && r.category !== catFilter) return false;
      if (!q) return true;
      return [r.name, r.description, r.category].join(" ").toLowerCase().includes(q);
    });
  }, [reports, search, catFilter]);

  const open = reports.find((r) => r.id === openId) || null;

  function runNow(r: Report) {
    // No scheduler backend yet — stamp "last run" so the catalog reflects the action.
    const today = new Date().toISOString().slice(0, 10);
    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, lastRun: today } : x)));
    flash(`“${r.name}” generated.`);
  }

  const stats = useMemo(() => {
    const run = reports.filter((r) => r.lastRun).length;
    const cats = new Set(reports.map((r) => r.category)).size;
    return { total: reports.length, run, scheduled: reports.length - run, cats };
  }, [reports]);

  return (
    <div className="space-y-6">
      <PageHeader icon={FileBarChart} title="Reports" description="Delivery, revenue, and operational reporting." />

      <StatRow>
        <StatTile label="Reports" value={stats.total} />
        <StatTile label="Generated" value={stats.run} accent />
        <StatTile label="Never run" value={stats.scheduled} />
        <StatTile label="Categories" value={stats.cats} />
      </StatRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="Search reports…" />
          <Select value={catFilter} onValueChange={(v) => setCatFilter(v as ReportCategory | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {REPORT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {toast && <span className="text-sm text-brand">{toast}</span>}
        </div>
        <ViewSwitcher views={VIEWS} value={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No reports match your filters." />
      ) : view === "cards" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="cursor-pointer transition-colors hover:border-brand/40" onClick={() => setOpenId(r.id)}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{r.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{r.format}</Badge>
                </div>
                <CategoryBadge category={r.category} />
                <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>Last run {fmtDate(r.lastRun)}</span>
                  <span className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); runNow(r); }} className="inline-flex items-center gap-1 text-foreground hover:text-brand"><Play className="h-3 w-3" /> Run</button>
                    <button onClick={(e) => { e.stopPropagation(); exportCsv(r); }} className="inline-flex items-center gap-1 text-foreground hover:text-brand"><Download className="h-3 w-3" /> CSV</button>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                    <TableCell className="font-medium text-foreground">{r.name}</TableCell>
                    <TableCell><CategoryBadge category={r.category} /></TableCell>
                    <TableCell className="text-muted-foreground">{r.format}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.lastRun)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => runNow(r)}><Play className="h-3.5 w-3.5" /> Run</Button>
                        <Button size="sm" variant="outline" onClick={() => exportCsv(r)}><Download className="h-3.5 w-3.5" /> CSV</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Report preview drawer */}
      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          {open && (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle>{open.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{open.description}</p>
              </SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={open.category} />
                <Badge variant="outline">{open.format}</Badge>
                <span className="text-xs text-muted-foreground">Last run {fmtDate(open.lastRun)}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => runNow(open)} className="flex-1"><Play className="h-4 w-4" /> Run now</Button>
                <Button variant="outline" onClick={() => exportCsv(open)}><Download className="h-4 w-4" /> Export CSV</Button>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Preview</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {open.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {open.rows.map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j} className={cn(j === 0 ? "font-medium text-foreground" : "text-muted-foreground", "whitespace-nowrap")}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Sample rows shown. Export for the full dataset.</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
