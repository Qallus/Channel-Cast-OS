"use client";

import { useMemo, useState } from "react";
import { Car, Clock, HardDrive, Plus, Trash2 } from "lucide-react";

import { FormField, StatRow, StatTile } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TAX_TABLES } from "@/lib/finance/tax-tables";
import { inYear } from "@/lib/finance/tax";
import { newId, type MileageTrip, type TimeLog } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

import { CustomFieldsRepeater, NumberInput, Section, usd, usd0 } from "./fin-ui";
import type { FinanceStore } from "./use-finance";

const today = () => new Date().toISOString().slice(0, 10);

export function LogsPanel({ store, flash }: { store: FinanceStore; flash: (m: string, tone?: "ok" | "error") => void }) {
  const year = store.profile.taxYear;
  const rate = TAX_TABLES[year].mileageRate;
  const trips = useMemo(() => store.trips.items.filter((t) => inYear(t.date, year)).sort((a, b) => b.date.localeCompare(a.date)), [store.trips.items, year]);
  const time = useMemo(() => store.time.items.filter((t) => inYear(t.date, year)).sort((a, b) => b.date.localeCompare(a.date)), [store.time.items, year]);
  const equipment = useMemo(() => store.entries.items.filter((e) => inYear(e.date, year) && e.category === "exp_equipment").sort((a, b) => b.date.localeCompare(a.date)), [store.entries.items, year]);

  const miles = trips.reduce((s, t) => s + t.miles * (t.roundTrip ? 2 : 1), 0);
  const hours = time.reduce((s, t) => s + t.hours, 0);
  const billedValue = time.filter((t) => t.billed).reduce((s, t) => s + t.hours * t.rate, 0);
  const unbilled = time.filter((t) => !t.billed);
  const unbilledValue = unbilled.reduce((s, t) => s + t.hours * t.rate, 0);

  const [trip, setTrip] = useState<MileageTrip | null>(null);
  const [log, setLog] = useState<TimeLog | null>(null);

  const lastTrip = trips[0];
  const newTrip = (): MileageTrip => ({ id: newId("trip"), date: today(), from: "Home office", to: "", purpose: "", miles: 0, roundTrip: true, business: store.profile.businesses[0]?.id, vehicle: store.profile.vehicle.description, custom: [], createdAt: new Date().toISOString() });
  const lastLog = time[0];
  const newLog = (): TimeLog => ({ id: newId("time"), date: today(), client: lastLog?.client ?? "", description: "", hours: 1, rate: lastLog?.rate ?? 125, billed: true, category: "client", business: store.profile.businesses[0]?.id, custom: [], createdAt: new Date().toISOString() });

  async function saveTrip() {
    if (!trip || !(trip.miles > 0) || !trip.purpose.trim()) return;
    const okSave = await store.trips.saveMany([trip]);
    flash(okSave ? "Trip saved." : "Couldn't save.", okSave ? "ok" : "error");
    setTrip(null);
  }
  async function saveLog() {
    if (!log || !(log.hours > 0)) return;
    const okSave = await store.time.saveMany([log]);
    flash(okSave ? "Time saved." : "Couldn't save.", okSave ? "ok" : "error");
    setLog(null);
  }

  return (
    <div className="space-y-5">
      <StatRow>
        <StatTile label="Business miles" value={Math.round(miles).toLocaleString()} hint={`${usd0.format(miles * rate)} at ${rate * 100}¢/mi`} accent />
        <StatTile label="Hours logged" value={hours.toFixed(1)} hint={`${usd0.format(billedValue)} billed`} />
        <StatTile label="Unbilled time" value={usd0.format(unbilledValue)} hint={`${unbilled.reduce((s, t) => s + t.hours, 0).toFixed(1)} h given away`} />
        <StatTile label="Equipment (§179)" value={usd0.format(equipment.reduce((s, e) => s + e.amount * ((e.businessUsePct ?? 100) / 100), 0))} hint={`${equipment.length} items`} />
      </StatRow>

      <Tabs defaultValue="mileage">
        <TabsList>
          <TabsTrigger value="mileage"><Car className="mr-1.5 h-4 w-4" /> Mileage</TabsTrigger>
          <TabsTrigger value="time"><Clock className="mr-1.5 h-4 w-4" /> Hours</TabsTrigger>
          <TabsTrigger value="equipment"><HardDrive className="mr-1.5 h-4 w-4" /> Equipment</TabsTrigger>
        </TabsList>

        <TabsContent value="mileage" className="mt-4">
          <Section title={`Mileage log · ${year}`} description="The IRS wants date, destination, business purpose and miles for each trip, written at the time. Commuting to a regular W-2 job doesn't count."
            action={<Button size="sm" onClick={() => setTrip(newTrip())}><Plus className="h-3.5 w-3.5" /> Add trip</Button>}>
            {trips.length === 0 ? <p className="text-sm text-muted-foreground">No trips yet. Client visits, device installs, supply runs and trips to the bank for the business all count.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2">Date</th><th className="py-2">Route</th><th className="py-2">Purpose</th><th className="py-2 text-right">Miles</th><th className="py-2 text-right">Deduction</th><th className="w-8" /></tr></thead>
                  <tbody>
                    {trips.map((t) => {
                      const m = t.miles * (t.roundTrip ? 2 : 1);
                      return (
                        <tr key={t.id} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40" onClick={() => setTrip({ ...t })}>
                          <td className="whitespace-nowrap py-2 text-muted-foreground">{t.date}</td>
                          <td className="py-2 text-foreground">{t.from} → {t.to}{t.roundTrip ? <span className="text-muted-foreground"> (round trip)</span> : null}</td>
                          <td className="py-2 text-muted-foreground">{t.purpose}</td>
                          <td className="py-2 text-right tabular-nums">{m.toFixed(1)}</td>
                          <td className="py-2 text-right tabular-nums">{usd.format(m * rate)}</td>
                          <td className="py-2"><button onClick={(e) => { e.stopPropagation(); store.trips.removeMany([t.id]); }} className="text-muted-foreground hover:text-destructive" aria-label="Delete trip"><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="time" className="mt-4">
          <Section title={`Hours · ${year}`} description="Track every hour, billed or not. Unbilled time isn't a tax deduction — the IRS doesn't allow writing off your own labor — but it shows exactly where the business gives money away."
            action={<Button size="sm" onClick={() => setLog(newLog())}><Plus className="h-3.5 w-3.5" /> Log time</Button>}>
            {time.length === 0 ? <p className="text-sm text-muted-foreground">No hours logged yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2">Date</th><th className="py-2">Client</th><th className="py-2">Work</th><th className="py-2 text-right">Hours</th><th className="py-2 text-right">Value</th><th className="py-2">Status</th><th className="w-8" /></tr></thead>
                  <tbody>
                    {time.map((t) => (
                      <tr key={t.id} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40" onClick={() => setLog({ ...t })}>
                        <td className="whitespace-nowrap py-2 text-muted-foreground">{t.date}</td>
                        <td className="py-2 text-foreground">{t.client}</td>
                        <td className="py-2 text-muted-foreground">{t.description}{t.category === "rnd" ? <span className="ml-1 text-[11px] text-brand-strong">R&amp;D</span> : null}</td>
                        <td className="py-2 text-right tabular-nums">{t.hours}</td>
                        <td className="py-2 text-right tabular-nums">{usd0.format(t.hours * t.rate)}</td>
                        <td className="py-2"><span className={cn("text-xs font-medium", t.billed ? "text-success" : "text-warning")}>{t.billed ? "Billed" : "Unbilled"}</span></td>
                        <td className="py-2"><button onClick={(e) => { e.stopPropagation(); store.time.removeMany([t.id]); }} className="text-muted-foreground hover:text-destructive" aria-label="Delete time"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <Section title={`Equipment register · ${year}`} description="Every ledger line in “Equipment (Section 179)”. These are expensed in full this year on Form 4562. Keep them on the books — selling one later is taxable.">
            {equipment.length === 0 ? <p className="text-sm text-muted-foreground">No equipment yet — categorize computers, cameras, devices and furniture as Equipment in the ledger.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2">Placed in service</th><th className="py-2">Item</th><th className="py-2 text-right">Cost</th><th className="py-2 text-right">Business %</th></tr></thead>
                <tbody>
                  {equipment.map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 text-muted-foreground">{e.date}</td><td className="py-2 text-foreground">{e.description}</td>
                      <td className="py-2 text-right tabular-nums">{usd.format(e.amount)}</td><td className="py-2 text-right">{e.businessUsePct ?? 100}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(trip)} onOpenChange={(o) => !o && setTrip(null)}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Business trip</DialogTitle></DialogHeader>
          {trip && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Date"><DatePicker value={trip.date} onChange={(v) => setTrip({ ...trip, date: v })} /></FormField>
              <FormField label="Miles (one way)"><NumberInput value={trip.miles} onChange={(n) => setTrip({ ...trip, miles: n })} step="0.1" min={0} /></FormField>
              <FormField label="From"><Input value={trip.from} onChange={(e) => setTrip({ ...trip, from: e.target.value })} /></FormField>
              <FormField label="To"><Input value={trip.to} onChange={(e) => setTrip({ ...trip, to: e.target.value })} placeholder="Client / site" /></FormField>
              <FormField label="Business purpose" className="sm:col-span-2"><Input value={trip.purpose} onChange={(e) => setTrip({ ...trip, purpose: e.target.value })} placeholder="Install player at Harbor Lights lobby" /></FormField>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={Boolean(trip.roundTrip)} onCheckedChange={(v) => setTrip({ ...trip, roundTrip: v })} /> Round trip (doubles the miles)</label>
              <div className="sm:col-span-2"><p className="mb-1.5 text-sm font-medium">Custom fields</p><CustomFieldsRepeater value={trip.custom} onChange={(v) => setTrip({ ...trip, custom: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setTrip(null)}>Cancel</Button><Button onClick={saveTrip} disabled={!trip || !trip.purpose.trim() || !(trip.miles > 0)}>Save trip</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(log)} onOpenChange={(o) => !o && setLog(null)}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Log time</DialogTitle></DialogHeader>
          {log && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Date"><DatePicker value={log.date} onChange={(v) => setLog({ ...log, date: v })} /></FormField>
              <FormField label="Client"><Input value={log.client} onChange={(e) => setLog({ ...log, client: e.target.value })} /></FormField>
              <FormField label="Work done" className="sm:col-span-2"><Input value={log.description} onChange={(e) => setLog({ ...log, description: e.target.value })} /></FormField>
              <FormField label="Hours"><NumberInput value={log.hours} onChange={(n) => setLog({ ...log, hours: n })} step="0.25" min={0} /></FormField>
              <FormField label="Your rate ($/h)"><NumberInput value={log.rate} onChange={(n) => setLog({ ...log, rate: n })} step="5" min={0} /></FormField>
              <FormField label="Type">
                <Select value={log.category ?? "client"} onValueChange={(v) => setLog({ ...log, category: v as TimeLog["category"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="client">Client work</SelectItem><SelectItem value="rnd">R&amp;D / product</SelectItem><SelectItem value="sales">Sales</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                </Select>
              </FormField>
              <label className="flex items-center gap-2 self-end pb-2 text-sm"><Switch checked={log.billed} onCheckedChange={(v) => setLog({ ...log, billed: v })} /> Billed to the client</label>
              <div className="sm:col-span-2"><p className="mb-1.5 text-sm font-medium">Custom fields</p><CustomFieldsRepeater value={log.custom} onChange={(v) => setLog({ ...log, custom: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setLog(null)}>Cancel</Button><Button onClick={saveLog} disabled={!log || !(log.hours > 0)}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
