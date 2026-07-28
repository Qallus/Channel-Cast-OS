"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  Clock,
  Globe,
  KeyRound,
  Mail,
  MapPin,
  Monitor,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PROFILE,
  LANGUAGES,
  Profile,
  TIMEZONES,
  initials,
  loadProfile,
  saveProfile,
} from "@/lib/profile/profile";
import { cn } from "@/lib/utils";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/** Read-only label/value row used in view mode. */
function Field({ icon: Icon, label, value }: { icon?: typeof Mail; label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
      </span>
      <span className="max-w-[60%] text-right text-sm font-medium text-foreground">
        {value?.trim() ? value : <span className="text-muted-foreground/60">—</span>}
      </span>
    </div>
  );
}

function EditRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function PrefRow({
  icon: Icon,
  title,
  desc,
  checked,
  onChange,
  disabled,
}: {
  icon: typeof Bell;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function currentSession(): { browser: string; os: string } {
  if (typeof navigator === "undefined") return { browser: "This browser", os: "" };
  const ua = navigator.userAgent;
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /Chrome/.test(ua)
      ? "Chrome"
      : /Firefox/.test(ua)
        ? "Firefox"
        : /Safari/.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return { browser, os };
}

export function ProfilePanel() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [draft, setDraft] = useState<Profile>(DEFAULT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [session, setSession] = useState<{ browser: string; os: string }>({ browser: "This browser", os: "" });

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setDraft(p);
    setSession(currentSession());
  }, []);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function startEdit() {
    setDraft(profile);
    setEditing(true);
    setSaved(false);
  }
  function cancel() {
    setDraft(profile);
    setEditing(false);
  }
  function save() {
    const next = saveProfile(draft);
    setProfile(next);
    setDraft(next);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const pwLabel = profile.passwordUpdatedAt
    ? `Last changed ${new Date(profile.passwordUpdatedAt).toLocaleDateString()}`
    : "Set a password to secure your account";

  return (
    <div className="space-y-6">
      {/* Identity header */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand text-xl font-semibold text-brand-foreground">
            {initials(profile.fullName)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {profile.fullName || "Your name"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile.jobTitle} · {profile.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-brand/10 text-brand hover:bg-brand/10">{profile.jobTitle || "Member"}</Badge>
              {profile.location ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {profile.location}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
              <Check className="h-4 w-4" /> Saved
            </span>
          ) : null}
          {editing ? (
            <>
              <Button variant="ghost" onClick={cancel}>
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button onClick={save}>
                <Check className="h-4 w-4" /> Save changes
              </Button>
            </>
          ) : (
            <Button onClick={startEdit}>
              <Pencil className="h-4 w-4" /> Edit profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Personal info */}
          <Card>
            <CardHeader>
              <CardTitle>Personal info</CardTitle>
              <CardDescription>Your name and how you show up across the console.</CardDescription>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <EditRow label="Full name">
                    <Input value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Jane Doe" />
                  </EditRow>
                  <EditRow label="Job title">
                    <Input value={draft.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="Operations Lead" />
                  </EditRow>
                  <div className="sm:col-span-2">
                    <EditRow label="Bio" hint="A short line shown on your profile.">
                      <Textarea rows={3} value={draft.bio} onChange={(e) => set("bio", e.target.value)} placeholder="What you do at Channel Cast" />
                    </EditRow>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <Field label="Full name" value={profile.fullName} />
                  <Field label="Job title" value={profile.jobTitle} />
                  <Field label="Bio" value={profile.bio} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>How the team and the system reach you.</CardDescription>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <EditRow label="Email">
                    <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" />
                  </EditRow>
                  <EditRow label="Phone">
                    <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
                  </EditRow>
                  <EditRow label="Company">
                    <Input value={draft.company} onChange={(e) => set("company", e.target.value)} />
                  </EditRow>
                  <EditRow label="Location">
                    <Input value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder="City, State" />
                  </EditRow>
                  <EditRow label="Timezone">
                    <Select value={draft.timezone} onValueChange={(v) => set("timezone", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </EditRow>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <Field icon={Mail} label="Email" value={profile.email} />
                  <Field icon={Phone} label="Phone" value={profile.phone} />
                  <Field icon={Building2} label="Company" value={profile.company} />
                  <Field icon={MapPin} label="Location" value={profile.location} />
                  <Field icon={Clock} label="Timezone" value={profile.timezone} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Language, appearance, and what lands in your inbox.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <EditRow label="Language">
                    <Select value={draft.language} onValueChange={(v) => set("language", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </EditRow>
                  <EditRow label="Appearance" hint="Applies across the console.">
                    <Select value={draft.appearance} onValueChange={(v) => set("appearance", v as Profile["appearance"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                      </SelectContent>
                    </Select>
                  </EditRow>
                  <div className="sm:col-span-2">
                    <Separator className="my-1" />
                    <PrefRow icon={Bell} title="Email notifications" desc="Alerts for devices, campaigns, and quotes." checked={draft.emailNotifications} onChange={(v) => set("emailNotifications", v)} />
                    <PrefRow icon={Sparkles} title="Product updates" desc="New features and release notes." checked={draft.productUpdates} onChange={(v) => set("productUpdates", v)} />
                    <PrefRow icon={Globe} title="Weekly report" desc="A Monday digest of network performance." checked={draft.weeklyReport} onChange={(v) => set("weeklyReport", v)} />
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <Field icon={Globe} label="Language" value={profile.language} />
                  <Field icon={Monitor} label="Appearance" value={profile.appearance === "dark" ? "Dark" : "Light"} />
                  <Field icon={Bell} label="Email notifications" value={profile.emailNotifications ? "On" : "Off"} />
                  <Field icon={Sparkles} label="Product updates" value={profile.productUpdates ? "On" : "Off"} />
                  <Field icon={Globe} label="Weekly report" value={profile.weeklyReport ? "On" : "Off"} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <SecurityCard profile={profile} setProfile={setProfile} pwLabel={pwLabel} />

          <Card>
            <CardHeader>
              <CardTitle>Active sessions</CardTitle>
              <CardDescription>Devices signed in to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {session.browser}
                      {session.os ? ` · ${session.os}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">This device</p>
                  </div>
                </div>
                <Badge className="bg-success/15 text-success hover:bg-success/15">Active now</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Session management activates with account sign-in in an upcoming phase.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SecurityCard({
  profile,
  setProfile,
  pwLabel,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  pwLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (pw.next.length < 8) return setError("New password must be at least 8 characters.");
    if (pw.next !== pw.confirm) return setError("New password and confirmation don't match.");
    // No auth backend yet: we record WHEN it changed, never the password itself.
    const next = saveProfile({ ...profile, passwordUpdatedAt: new Date().toISOString() });
    setProfile(next);
    setPw({ current: "", next: "", confirm: "" });
    setError(null);
    setOpen(false);
  }

  function toggle2fa(v: boolean) {
    setProfile(saveProfile({ ...profile, twoFactor: v }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password &amp; security</CardTitle>
        <CardDescription>Keep your account protected.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="text-xs text-muted-foreground">{pwLabel}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Change
          </Button>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Two-factor auth</p>
              <p className="text-xs text-muted-foreground">Extra step at sign-in.</p>
            </div>
          </div>
          <Toggle checked={profile.twoFactor} onChange={toggle2fa} />
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Choose a new password of at least 8 characters.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Current password"
              value={pw.current}
              onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="New password"
              value={pw.next}
              onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={pw.confirm}
              onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Update password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
