"use client";

// Screens: which loop each display is playing, and when.
//
// A schedule is device + loop + daypart. Several can stack on one screen —
// highest priority whose window covers "now" wins — so a shop can run a morning
// loop and an evening loop without editing anything at changeover.

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Monitor, Plus, Trash2 } from "lucide-react";

import { EmptyState, FormField } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DisplayLoop } from "@/lib/displays/types";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 0, label: "Sun" },
];

type Schedule = {
  id: string; device_id: string; loop_id: string | null; days: number[];
  start_time: string; end_time: string; priority: number; enabled: boolean;
};

type Screen = {
  id: string; name: string; deviceCode: string | null; location: string | null;
  status: string; lastHeartbeatAt: string | null; playerUrl: string; schedules: Schedule[];
};

const hhmm = (v: string) => String(v).slice(0, 5);

/** "Mon–Fri" when contiguous, otherwise the individual days. */
function describeDays(days: number[]): string {
  if (days.length === 7) return "Every day";
  const order = DAYS.map((d) => d.value);
  const picked = order.filter((d) => days.includes(d));
  if (picked.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "Mon–Fri";
  if (picked.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
  return picked.map((d) => DAYS.find((x) => x.value === d)!.label).join(", ");
}

const blank = (deviceId: string): Partial<Schedule> => ({
  device_id: deviceId, loop_id: null, days: [1, 2, 3, 4, 5, 6, 0],
  start_time: "08:00", end_time: "20:00", priority: 0, enabled: true,
});

export function ScreensTab({ loops, flash }: { loops: DisplayLoop[]; flash: (m: string) => void }) {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<Schedule> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/displays/deployments");
      const d = await res.json();
      setScreens(d.screens ?? []);
    } catch { /* empty state covers it */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!draft) return;
    setError(null);
    const res = await fetch("/api/admin/displays/deployments", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.error || "Save failed."); return; }
    setDraft(null); void load(); flash("Schedule saved.");
  }

  async function remove(s: Schedule) {
    if (!confirm("Remove this schedule? The screen will go dark during that window.")) return;
    await fetch(`/api/admin/displays/deployments?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
    void load();
  }

  const toggleDay = (d: number) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const days = prev.days ?? [];
      return { ...prev, days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] };
    });

  if (loading) {
    return <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading screens…</div>;
  }

  if (screens.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState message="No screens registered yet. Provision one below, then assign it a loop." />
        <SetupCard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Point each screen at its player URL, then schedule which loop it runs. Several schedules can stack —
        the highest priority whose window covers the moment wins.
      </p>

      <SetupCard />

      {screens.map((screen) => (
        <div key={screen.id} className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{screen.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {screen.deviceCode ?? "—"}{screen.location ? ` · ${screen.location}` : ""}
              </p>
            </div>
            <Badge className={cn("border-transparent text-[10px] uppercase",
              screen.status === "online" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {screen.status}
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline"
                onClick={() => { navigator.clipboard?.writeText(screen.playerUrl); setCopied(screen.id); setTimeout(() => setCopied(null), 1600); }}>
                {copied === screen.id ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Player URL</>}
              </Button>
              <Button size="sm" onClick={() => { setDraft(blank(screen.id)); setError(null); }}>
                <Plus className="h-3.5 w-3.5" /> Schedule
              </Button>
            </div>
          </div>

          <div className="p-3">
            {screen.schedules.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Nothing scheduled — this screen is dark. Add a schedule to give it a loop.
              </p>
            ) : (
              <div className="space-y-2">
                {screen.schedules.map((s) => {
                  const loop = loops.find((l) => l.id === s.loop_id);
                  return (
                    <div key={s.id} className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-border p-2.5", !s.enabled && "opacity-50")}>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {loop?.name ?? <span className="text-warning">Loop deleted</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">{describeDays(s.days ?? [])}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{hhmm(s.start_time)}–{hhmm(s.end_time)}</span>
                      {s.priority > 0 && <Badge className="border-transparent bg-muted text-[10px]">priority {s.priority}</Badge>}
                      {!s.enabled && <Badge className="border-transparent bg-muted text-[10px]">paused</Badge>}
                      <Button size="sm" variant="outline" onClick={() => { setDraft({ ...s }); setError(null); }}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => remove(s)} aria-label="Remove schedule"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}

      {draft && (
        <div className="space-y-3 rounded-xl border border-brand-strong/40 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">{draft.id ? "Edit schedule" : "New schedule"}</h3>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Loop">
              <Select value={draft.loop_id ?? ""} onValueChange={(v) => setDraft({ ...draft, loop_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a loop" /></SelectTrigger>
                <SelectContent>{loops.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="From"><Input type="time" value={hhmm(draft.start_time ?? "08:00")} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} /></FormField>
            <FormField label="To"><Input type="time" value={hhmm(draft.end_time ?? "20:00")} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} /></FormField>
            <FormField label="Priority"><Input type="number" value={draft.priority ?? 0} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) || 0 })} /></FormField>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Days</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const on = (draft.days ?? []).includes(d.value);
                return (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                    className={cn("rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      on ? "border-brand-strong bg-brand/10 text-brand-strong" : "border-border text-muted-foreground hover:text-foreground")}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            An end time before the start runs past midnight — 20:00 to 02:00 covers the evening and early hours.
          </p>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Button onClick={save} disabled={!draft.loop_id}>Save schedule</Button>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <button type="button" onClick={() => setDraft({ ...draft, enabled: draft.enabled === false })}
              className="text-xs text-muted-foreground hover:text-foreground">
              {draft.enabled === false ? "Paused — click to enable" : "Enabled — click to pause"}
            </button>
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}


/** How a Pi becomes a screen. Shown here because this is where you look. */
function SetupCard() {
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "https://os.channelcast.io" : window.location.origin;
  const command = `curl -fsSL ${origin}/install-display.sh | sudo bash -s -- --claim YOUR-CLAIM-CODE`;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Set up a new screen</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Register a Digital Display device to get a claim code, then run this on the Pi or mini-PC.
            It installs Chromium in kiosk mode and starts on boot.
          </p>
        </div>
        <Button size="sm" variant="outline"
          onClick={() => { navigator.clipboard?.writeText(command); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
          {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy command</>}
        </Button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground">{command}</pre>
      <p className="mt-2 text-xs text-muted-foreground">
        Add <code className="rounded bg-muted px-1">--rotate left</code> for a portrait screen, or
        <code className="ml-1 rounded bg-muted px-1">--user pi</code> if the desktop user isn&apos;t detected.
      </p>
    </div>
  );
}
