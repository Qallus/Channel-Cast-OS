"use client";

import { useEffect, useState } from "react";
import { Bell, Building2, Check, KeyRound, Loader2, MapPin, Palette, Plug, Settings as SettingsIcon } from "lucide-react";

import { FormField, PageHeader } from "@/components/crm/crm-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, DEFAULT_SETTINGS, Settings, TIMEZONES, loadSettings, saveSettings } from "@/lib/ops/settings";
import { cn } from "@/lib/utils";

type Tab = "organization" | "branding" | "integrations" | "notifications" | "placement";
const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "placement", label: "Placement", icon: MapPin },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-brand" : "bg-muted")}
    >
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

function ToggleRow({ icon: Icon, title, desc, checked, onChange }: { icon?: typeof Bell; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="flex items-start gap-2.5">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : null}
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("organization");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((s) => ({ ...s, [key]: value }));
  const setIntegration = (k: keyof Settings["integrations"], v: boolean) => setSettings((s) => ({ ...s, integrations: { ...s.integrations, [k]: v } }));
  const setNotif = (k: keyof Settings["notifications"], v: boolean) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, [k]: v } }));

  function save() {
    setSettings(saveSettings(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Organization, branding, integrations, and preferences."
        action={
          tab === "placement" ? undefined : (
            <div className="flex items-center gap-2">
              {saved ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong"><Check className="h-4 w-4" /> Saved</span> : null}
              <Button onClick={save}><Check className="h-4 w-4" /> Save changes</Button>
            </div>
          )
        }
      />

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 sm:w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", tab === t.id && "text-brand-strong")} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "placement" && <PlacementSettings />}

      {tab === "organization" && (
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Your workspace identity and defaults.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Organization name">
                <Input value={settings.orgName} onChange={(e) => set("orgName", e.target.value)} />
              </FormField>
              <FormField label="Website">
                <Input value={settings.website} onChange={(e) => set("website", e.target.value)} placeholder="channelcast.io" />
              </FormField>
              <FormField label="Support email">
                <Input type="email" value={settings.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
              </FormField>
              <FormField label="Timezone">
                <Select value={settings.timezone} onValueChange={(v) => set("timezone", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Default currency">
                <Select value={settings.currency} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "branding" && (
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>How Channel Cast presents your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Tagline">
              <Textarea rows={2} value={settings.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </FormField>
            <FormField label="Brand color">
              <div className="flex items-center gap-3">
                <input type="color" value={settings.brandColor} onChange={(e) => set("brandColor", e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background" />
                <Input value={settings.brandColor} onChange={(e) => set("brandColor", e.target.value)} className="w-40" />
                <span className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium" style={{ backgroundColor: settings.brandColor, color: "#0b160e" }}>Preview</span>
              </div>
            </FormField>
          </CardContent>
        </Card>
      )}

      {tab === "integrations" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connected services powering the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <ToggleRow icon={Plug} title="Supabase" desc="Database, storage, and auth for the platform." checked={settings.integrations.supabase} onChange={(v) => setIntegration("supabase", v)} />
              <ToggleRow icon={Plug} title="Stripe" desc="Billing and subscription payments." checked={settings.integrations.stripe} onChange={(v) => setIntegration("stripe", v)} />
              <ToggleRow icon={Plug} title="OpenAI" desc="AI voice generation in the Media Studio." checked={settings.integrations.openai} onChange={(v) => setIntegration("openai", v)} />
              <ToggleRow icon={Plug} title="Tailscale" desc="Secure device connectivity over the tailnet." checked={settings.integrations.tailscale} onChange={(v) => setIntegration("tailscale", v)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>API access</CardTitle>
              <CardDescription>Server key for the device and admin APIs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Production API key</p>
                    <p className="font-mono text-xs text-muted-foreground">cct_••••••••••••••••••••••••</p>
                  </div>
                </div>
                <Badge className="bg-success/15 text-success hover:bg-success/15">Active</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Key rotation activates with the org backend in an upcoming phase.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>What the workspace is alerted about.</CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleRow icon={Bell} title="Device alerts" desc="Offline devices, playback errors, checksum drift." checked={settings.notifications.deviceAlerts} onChange={(v) => setNotif("deviceAlerts", v)} />
            <ToggleRow icon={Bell} title="Quote alerts" desc="New quote requests and SLA breaches." checked={settings.notifications.quoteAlerts} onChange={(v) => setNotif("quoteAlerts", v)} />
            <ToggleRow icon={Bell} title="Billing alerts" desc="Overdue invoices and failed payments." checked={settings.notifications.billingAlerts} onChange={(v) => setNotif("billingAlerts", v)} />
            <ToggleRow icon={Bell} title="Weekly digest" desc="Monday summary of network performance." checked={settings.notifications.weeklyDigest} onChange={(v) => setNotif("weeklyDigest", v)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* Server-persisted config for the public /placement qualification form. */
function PlacementSettings() {
  const [min, setMin] = useState<string>("1000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/placement-config")
      .then((r) => r.json())
      .then((d) => { if (typeof d?.minDailyVisitors === "number") setMin(String(d.minDailyVisitors)); setUpdatedAt(d?.updatedAt ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/placement-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minDailyVisitors: Number(min) || 0 }),
      });
      const d = await res.json();
      if (typeof d?.minDailyVisitors === "number") setMin(String(d.minDailyVisitors));
      setUpdatedAt(d?.updatedAt ?? new Date().toISOString());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Placement qualification</CardTitle>
        <CardDescription>Controls the free-vs-paid result on the public placement form.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-w-md space-y-4">
          <FormField label="Minimum daily foot traffic for FREE placement">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={50}
                value={loading ? "" : min}
                placeholder={loading ? "Loading…" : "1000"}
                onChange={(e) => setMin(e.target.value)}
                className="max-w-[180px]"
              />
              <span className="text-sm text-muted-foreground">visitors / day</span>
            </div>
          </FormField>
          <p className="text-xs text-muted-foreground">
            Locations reporting at least this many daily visitors qualify for <span className="font-medium text-foreground">free</span> placement; everyone else is offered <span className="font-medium text-foreground">paid</span> placement. Traffic is collected in ranges on the form — a range qualifies when its lower bound meets this number (e.g. at 1,000 only the &ldquo;1,000+/day&rdquo; range qualifies).
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={saving || loading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
            </Button>
            {saved ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong"><Check className="h-4 w-4" /> Saved</span> : null}
            {updatedAt && !saved ? <span className="text-xs text-muted-foreground">Updated {new Date(updatedAt).toLocaleDateString()}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
