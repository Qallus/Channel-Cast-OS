"use client";

import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  generateLocationCode,
  type InventoryLocation,
  type InventoryType,
  type SpecField,
} from "@/lib/advertising/inventory";
import { cn } from "@/lib/utils";

type FormData = Record<string, string>;
type StepId = "A" | "B" | "C" | "D" | "E" | "F" | "G";
type CalcResult = {
  totalPerDay: number;
  monthlyPlays: number;
  monthlyImpressions: number;
  cpm: number;
  costPerPlay: number;
  remaining: number;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-US");
const toNum = (v: string | undefined) => {
  const n = Number.parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
};

export function AddLocationWizard({
  open,
  onOpenChange,
  type,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: InventoryType;
  onCreate: (location: InventoryLocation) => void;
}) {
  const seed = useId();
  const locationCode = useMemo(() => generateLocationCode(`${type.id}-${seed}`), [type.id, seed]);

  const steps = useMemo<{ id: StepId; label: string }[]>(() => {
    const base: { id: StepId; label: string }[] = [
      { id: "A", label: "Location Overview" },
      { id: "B", label: "Traffic & Audience" },
      { id: "C", label: "Ad Specifications" },
      { id: "D", label: "Pricing" },
      { id: "E", label: "Availability" },
      { id: "F", label: "Calculations" },
    ];
    if (type.hasDevice) base.push({ id: "G", label: "Add Device" });
    return base;
  }, [type.hasDevice]);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormData>({ createDevice: type.hasDevice ? "yes" : "no" });

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const calc = useMemo(() => {
    const spotsPerHour = toNum(form.spotsPerHour);
    const playHours = toNum(form.playHoursPerDay);
    const totalPerDay = Math.round(spotsPerHour * playHours);
    const monthlyPlays = totalPerDay * 30;
    const monthlyImpressions = toNum(form.estAudiencePerDay) * 30;
    const rate = toNum(form.baseMonthlyRate);
    const cpm = monthlyImpressions > 0 ? (rate / monthlyImpressions) * 1000 : 0;
    const costPerPlay = monthlyPlays > 0 ? rate / monthlyPlays : 0;
    const remaining = form.inventorySlotsRemaining ? toNum(form.inventorySlotsRemaining) : 100;
    return { totalPerDay, monthlyPlays, monthlyImpressions, cpm, costPerPlay, remaining };
  }, [form]);

  function reset() {
    setStepIndex(0);
    setForm({ createDevice: type.hasDevice ? "yes" : "no" });
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleCreate() {
    const location: InventoryLocation = {
      id: `loc-${locationCode}`,
      type: type.id,
      name: form.name?.trim() || `New ${type.label} Location`,
      locationCode,
      address: [form.streetAddress, form.city, form.state, form.zip].filter(Boolean).join(", "),
      status: "available",
      monthlyRate: toNum(form.baseMonthlyRate),
      dailyTraffic: toNum(form.avgDailyFootTraffic),
      monthlyImpressions: Math.round(calc.monthlyImpressions),
      linkedDevice: type.hasDevice && form.createDevice === "yes" && form.deviceName ? form.deviceName : null,
    };
    onCreate(location);
    reset();
  }

  const current = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Add Advertising Location</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2">
          {steps.map((step, i) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setStepIndex(i)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                i === stepIndex ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <span className="opacity-70">{step.id}.</span>
              {step.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="max-h-[58vh] overflow-y-auto px-6 py-5">
          {current.id === "A" && <StepOverview form={form} set={set} locationCode={locationCode} />}
          {current.id === "B" && <StepTraffic form={form} set={set} />}
          {current.id === "C" && <StepSpecs form={form} set={set} type={type} />}
          {current.id === "D" && <StepPricing form={form} set={set} />}
          {current.id === "E" && <StepAvailability form={form} set={set} />}
          {current.id === "F" && <StepCalculations calc={calc} type={type} />}
          {current.id === "G" && <StepDevice form={form} set={set} type={type} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="secondary" onClick={() => setStepIndex((i) => i - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button onClick={handleCreate}>Create Location{type.hasDevice ? " & Device" : ""}</Button>
            ) : (
              <Button onClick={() => setStepIndex((i) => i + 1)}>Next</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Field primitives ─────────────────────────────────────────────── */

function Field({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", full && "sm:col-span-2 lg:col-span-3")}>
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-4 border-b border-border pb-2 text-sm font-semibold text-foreground">{children}</h3>;
}

/* ── Steps ────────────────────────────────────────────────────────── */

function StepOverview({ form, set, locationCode }: { form: FormData; set: (k: string, v: string) => void; locationCode: string }) {
  return (
    <div>
      <SectionTitle>Location Overview</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location Name" required>
          <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g., Oldtown Player #1" />
        </Field>
        <Field label="Location ID">
          <Input value={locationCode} readOnly className="text-muted-foreground" />
        </Field>
        <Field label="Street Address" required full>
          <Input value={form.streetAddress ?? ""} onChange={(e) => set("streetAddress", e.target.value)} />
        </Field>
        <Field label="City">
          <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="State">
          <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
        </Field>
        <Field label="ZIP">
          <Input value={form.zip ?? ""} onChange={(e) => set("zip", e.target.value)} />
        </Field>
        <Field label="District">
          <Input value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} placeholder="e.g., Old Town" />
        </Field>
        <Field label="GPS Coordinates">
          <Input value={form.gps ?? ""} onChange={(e) => set("gps", e.target.value)} placeholder="33.4942, -111.9261" />
        </Field>
        <Field label="Indoor/Outdoor">
          <Select value={form.placement ?? "Outdoor"} onValueChange={(v) => set("placement", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Indoor">Indoor</SelectItem>
              <SelectItem value="Outdoor">Outdoor</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Property Type">
          <Input value={form.propertyType ?? ""} onChange={(e) => set("propertyType", e.target.value)} placeholder="e.g., Shopping Center, Restaurant" />
        </Field>
        <Field label="Video URL" full>
          <Input value={form.videoUrl ?? ""} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtube.com/..." />
        </Field>
        <Field label="Public Description" full>
          <Textarea value={form.publicDescription ?? ""} onChange={(e) => set("publicDescription", e.target.value)} placeholder="Description visible to prospective advertisers..." />
        </Field>
        <Field label="Internal Notes" full>
          <Textarea value={form.internalNotes ?? ""} onChange={(e) => set("internalNotes", e.target.value)} placeholder="Private notes..." />
        </Field>
      </div>
    </div>
  );
}

function StepTraffic({ form, set }: { form: FormData; set: (k: string, v: string) => void }) {
  const n = (k: string, label: string, placeholder = "0") => (
    <Field label={label}>
      <Input type="number" value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} />
    </Field>
  );
  return (
    <div>
      <SectionTitle>Traffic &amp; Audience Data</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {n("avgDailyFootTraffic", "Avg Daily Foot Traffic")}
        {n("weekendTraffic", "Weekend Traffic")}
        {n("vehicleCount", "Vehicle Count/Day")}
        {n("avgDwellTime", "Avg Dwell Time (min)")}
        {n("medianIncome", "Median Household Income")}
        <Field label="Tourist vs Local %">
          <Input type="number" value={form.touristPct ?? "50"} onChange={(e) => set("touristPct", e.target.value)} />
        </Field>
        <Field label="Average Age Range">
          <Input value={form.ageRange ?? ""} onChange={(e) => set("ageRange", e.target.value)} placeholder="e.g., 25-54" />
        </Field>
        <Field label="Gender Split">
          <Input value={form.genderSplit ?? "50/50"} onChange={(e) => set("genderSplit", e.target.value)} />
        </Field>
        <Field label="Peak Hours (comma separated)" full>
          <Input value={form.peakHours ?? ""} onChange={(e) => set("peakHours", e.target.value)} placeholder="e.g., 11:00-14:00, 17:00-21:00" />
        </Field>
        <Field label="Audience Type (comma separated)" full>
          <Input value={form.audienceType ?? ""} onChange={(e) => set("audienceType", e.target.value)} placeholder="e.g., Families, Young Professionals, Tourists" />
        </Field>
      </div>
    </div>
  );
}

function StepSpecs({ form, set, type }: { form: FormData; set: (k: string, v: string) => void; type: InventoryType }) {
  const specTitle =
    type.category === "audio" ? "Audio Player Specifications" : type.category === "display" ? "Display Specifications" : "Placement Specifications";
  return (
    <div>
      <SectionTitle>{specTitle}</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {type.specFields.map((f) => (
          <SpecInput key={f.key} field={f} value={form[f.key] ?? f.defaultValue ?? ""} onChange={(v) => set(f.key, v)} />
        ))}
      </div>
    </div>
  );
}

function SpecInput({ field, value, onChange }: { field: SpecField; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={field.label} full={field.full}>
      {field.type === "select" ? (
        <Select value={value || field.defaultValue} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input type={field.type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
      )}
    </Field>
  );
}

function StepPricing({ form, set }: { form: FormData; set: (k: string, v: string) => void }) {
  const n = (k: string, label: string, def = "") => (
    <Field label={label}>
      <Input type="number" value={form[k] ?? def} onChange={(e) => set(k, e.target.value)} placeholder="0" />
    </Field>
  );
  return (
    <div>
      <SectionTitle>Pricing Structure</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {n("baseMonthlyRate", "Base Monthly Rate ($)")}
        {n("setupFee", "Setup Fee ($)")}
        {n("productionFee", "Production Fee ($)")}
        {n("costPerSecond", "Cost/Second ($)")}
        {n("cost15s", "Cost/15s ($)")}
        {n("cost30s", "Cost/30s ($)")}
        {n("cost60s", "Cost/60s ($)")}
        {n("cpm", "CPM ($)")}
        <Field label="Minimum Contract (months)">
          <Input type="number" value={form.minContract ?? "1"} onChange={(e) => set("minContract", e.target.value)} />
        </Field>
        {n("seasonalAdjustment", "Seasonal Adjustment (%)")}
      </div>
    </div>
  );
}

function StepAvailability({ form, set }: { form: FormData; set: (k: string, v: string) => void }) {
  const windows = ["Morning", "Afternoon", "Evening", "Late Night"];
  const selected = (form.timeWindows ?? "Morning,Afternoon,Evening").split(",").filter(Boolean);
  const toggle = (w: string) => {
    const next = selected.includes(w) ? selected.filter((x) => x !== w) : [...selected, w];
    set("timeWindows", next.join(","));
  };
  return (
    <div>
      <SectionTitle>Availability Management</SectionTitle>
      <div className="mb-4 rounded-md border border-brand/30 bg-brand/5 px-3 py-2.5 text-sm text-muted-foreground">
        <span className="font-medium text-brand-strong">Booking integration:</span> connect campaign booking types for detailed calendar scheduling.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Campaign Start Date">
          <Input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Campaign End Date">
          <Input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
        <Field label="Daily Window Start">
          <Input type="time" value={form.windowStart ?? "06:00"} onChange={(e) => set("windowStart", e.target.value)} />
        </Field>
        <Field label="Daily Window End">
          <Input type="time" value={form.windowEnd ?? "22:00"} onChange={(e) => set("windowEnd", e.target.value)} />
        </Field>
        <Field label="Time of Day Availability" full>
          <div className="flex flex-wrap gap-4">
            {windows.map((w) => (
              <label key={w} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={selected.includes(w)} onChange={() => toggle(w)} className="h-4 w-4 accent-[hsl(var(--brand))]" />
                {w}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Inventory Slots Remaining (%)">
          <Input type="number" value={form.inventorySlotsRemaining ?? "100"} onChange={(e) => set("inventorySlotsRemaining", e.target.value)} />
        </Field>
        <Field label="Blackout Dates (comma separated)">
          <Input value={form.blackoutDates ?? ""} onChange={(e) => set("blackoutDates", e.target.value)} placeholder="2026-12-25, 2026-12-31" />
        </Field>
      </div>
    </div>
  );
}

function StepCalculations({ calc, type }: { calc: CalcResult; type: InventoryType }) {
  const isAudioLike = type.category !== "physical";
  return (
    <div>
      <SectionTitle>Auto-Calculated Performance Metrics</SectionTitle>
      <div className="mb-4 rounded-md border border-success/30 bg-success/5 px-3 py-3 text-sm">
        <p className="font-medium text-success">These values are automatically calculated from the data entered in previous sections.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Monthly Plays = Spots/Day × 30 · CPM = (Monthly Rate ÷ Monthly Impressions) × 1,000 · Cost Per Play = Monthly Rate ÷ Monthly Plays
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isAudioLike && <MetricCard label="Monthly Plays" value={num.format(calc.monthlyPlays)} />}
        <MetricCard label="Monthly Impressions" value={num.format(Math.round(calc.monthlyImpressions))} />
        {isAudioLike && <MetricCard label="Cost Per Play" value={money.format(calc.costPerPlay)} />}
        <MetricCard label="Calculated CPM" value={money.format(calc.cpm)} />
        {isAudioLike && <MetricCard label="Total Inventory Per Day" value={`${num.format(calc.totalPerDay)} spots`} />}
        <MetricCard label="Remaining Inventory" value={`${num.format(calc.remaining)}%`} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StepDevice({ form, set, type }: { form: FormData; set: (k: string, v: string) => void; type: InventoryType }) {
  const create = form.createDevice === "yes";
  return (
    <div>
      <SectionTitle>Add {type.label} Device</SectionTitle>
      <div className="mb-4 rounded-md border border-brand/30 bg-brand/5 px-3 py-2.5 text-sm text-muted-foreground">
        Optionally create a device to link to this location. You can also add devices later from the Devices page.
      </div>
      <label className="mb-4 flex items-start gap-3 rounded-lg border border-border p-3">
        <input type="checkbox" checked={create} onChange={(e) => set("createDevice", e.target.checked ? "yes" : "no")} className="mt-0.5 h-4 w-4 accent-[hsl(var(--brand))]" />
        <span>
          <span className="block text-sm font-medium text-foreground">Create a device for this location</span>
          <span className="block text-xs text-muted-foreground">Set up a {type.noun} device that will be automatically linked</span>
        </span>
      </label>
      {create && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Device Name" required>
            <Input value={form.deviceName ?? ""} onChange={(e) => set("deviceName", e.target.value)} placeholder="Location Player" />
          </Field>
          <Field label="IP Address / Hostname">
            <Input value={form.deviceHost ?? ""} onChange={(e) => set("deviceHost", e.target.value)} placeholder="100.x.x.x or hostname" />
          </Field>
          <Field label="Hardware Model">
            <Input value={form.hardwareModel ?? ""} onChange={(e) => set("hardwareModel", e.target.value)} placeholder="e.g., Raspberry Pi, Mini PC" />
          </Field>
          <Field label="Default Volume (%)">
            <Input type="number" value={form.defaultVolume ?? "80"} onChange={(e) => set("defaultVolume", e.target.value)} />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            After creation, you&apos;ll receive an API key to configure on the device.
          </p>
        </div>
      )}
    </div>
  );
}
