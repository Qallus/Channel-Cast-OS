"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  MapPin,
  QrCode as QrIcon,
  Rocket,
  ScanLine,
  Wifi,
} from "lucide-react";

import { QrCode } from "@/components/devices/qr-code";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEVICE_TYPES,
  PROVISIONING_META,
  buildActivationUrl,
  generateClaimCode,
  generateDeviceCode,
  getDeviceType,
  type DeviceRecord,
  type DeviceTypeId,
  type ProvisioningMode,
} from "@/lib/devices/devices";
import { cn } from "@/lib/utils";

type Phase = "register" | "activate";

export function RegisterDeviceWizard({
  open,
  onOpenChange,
  onRegister,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: (device: DeviceRecord) => void;
}) {
  const [phase, setPhase] = useState<Phase>("register");
  const [device, setDevice] = useState<DeviceRecord | null>(null);

  // Registration form fields
  const [type, setType] = useState<DeviceTypeId>("standard_audio");
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [mode, setMode] = useState<ProvisioningMode>("self_service");
  const [ownerOrg, setOwnerOrg] = useState("");
  const [locationName, setLocationName] = useState("");

  function reset() {
    setPhase("register");
    setDevice(null);
    setType("standard_audio");
    setName("");
    setModel("");
    setMode("self_service");
    setOwnerOrg("");
    setLocationName("");
  }

  function handleClose(next: boolean) {
    if (!next) {
      if (device) onRegister(device); // persist whatever state we reached
      reset();
    }
    onOpenChange(next);
  }

  function handleRegister() {
    const claimCode = generateClaimCode();
    const record: DeviceRecord = {
      id: `dev-${generateDeviceCode(type)}`,
      deviceCode: generateDeviceCode(type),
      name: name.trim() || `${getDeviceType(type).label} Device`,
      type,
      model: model.trim() || getDeviceType(type).label,
      status: mode === "zero_touch" ? "needs_setup" : "registered",
      provisioningMode: mode,
      ownerOrg: ownerOrg.trim() || "Channel Cast",
      locationName: locationName.trim() || null,
      claimCode,
      claimExpiresLabel: "in 7 days",
      firmwareVersion: null,
      lastHeartbeat: null,
      volume: type === "digital_display" ? 100 : 80,
    };
    setDevice(record);
    setPhase("activate");
  }

  function simulateActivation() {
    setDevice((prev) =>
      prev
        ? { ...prev, status: "online", claimCode: null, claimExpiresLabel: null, firmwareVersion: "0.4.1", lastHeartbeat: "just now" }
        : prev,
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{phase === "register" ? "Register Device" : "Activate Device"}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 border-b border-border px-6 py-3 text-sm">
          <StepPill index={1} label="Registration" active={phase === "register"} done={phase === "activate"} />
          <div className="h-px w-6 bg-border" />
          <StepPill index={2} label="Setup & activation" active={phase === "activate"} done={false} />
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
          {phase === "register" ? (
            <RegisterStep
              {...{ type, setType, name, setName, model, setModel, mode, setMode, ownerOrg, setOwnerOrg, locationName, setLocationName }}
            />
          ) : (
            device && <ActivateStep device={device} onSimulate={simulateActivation} />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => handleClose(false)}>
            {phase === "activate" && device?.status === "online" ? "Done" : "Cancel"}
          </Button>
          {phase === "register" ? (
            <Button onClick={handleRegister}>
              <KeyRound className="h-4 w-4" />
              Register &amp; generate codes
            </Button>
          ) : (
            <Button onClick={() => handleClose(false)} disabled={device?.status !== "online"}>
              Finish
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepPill({ index, label, active, done }: { index: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", active ? "text-foreground" : "text-muted-foreground")}>
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
          active ? "bg-primary text-primary-foreground" : done ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : index}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

/* ── Step 1 ───────────────────────────────────────────────────────── */

function Field({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", full && "sm:col-span-2")}>
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function RegisterStep(props: {
  type: DeviceTypeId;
  setType: (v: DeviceTypeId) => void;
  name: string;
  setName: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  mode: ProvisioningMode;
  setMode: (v: ProvisioningMode) => void;
  ownerOrg: string;
  setOwnerOrg: (v: string) => void;
  locationName: string;
  setLocationName: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Device type" required>
          <Select value={props.type} onValueChange={(v) => props.setType(v as DeviceTypeId)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEVICE_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Device name" required>
          <Input value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="e.g., Lobby Player #1" />
        </Field>
        <Field label="Hardware model">
          <Input value={props.model} onChange={(e) => props.setModel(e.target.value)} placeholder="e.g., Raspberry Pi, Mini PC" />
        </Field>
        <Field label="Owner / organization">
          <Input value={props.ownerOrg} onChange={(e) => props.setOwnerOrg(e.target.value)} placeholder="e.g., Harbor Lights Resort" />
        </Field>
        <Field label="Assign location (optional)" full>
          <Input value={props.locationName} onChange={(e) => props.setLocationName(e.target.value)} placeholder="Link to an advertising location" />
        </Field>
      </div>

      {/* Provisioning mode → the two ownership scenarios */}
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Provisioning method</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(PROVISIONING_META) as ProvisioningMode[]).map((m) => {
            const meta = PROVISIONING_META[m];
            const active = props.mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => props.setMode(m)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  active ? "border-brand bg-brand/10" : "border-border hover:bg-accent/40",
                )}
              >
                <span className={cn("block text-sm font-semibold", active ? "text-foreground" : "text-foreground")}>{meta.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{meta.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Step 2 ───────────────────────────────────────────────────────── */

function ActivateStep({ device, onSimulate }: { device: DeviceRecord; onSimulate: () => void }) {
  const online = device.status === "online";
  const activationUrl = useMemo(
    () => (device.claimCode ? buildActivationUrl(device.deviceCode, device.claimCode) : ""),
    [device.claimCode, device.deviceCode],
  );

  if (online) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/20 text-success">
            <Wifi className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{device.name} is online</p>
            <p className="text-xs text-muted-foreground">
              {device.deviceCode} · firmware {device.firmwareVersion} · first heartbeat {device.lastHeartbeat}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SetupCard label="Assigned location" value={device.locationName ?? "Unassigned — assign on the device detail page"} />
          <SetupCard label="Default volume" value={`${device.volume}%`} />
          <SetupCard label="Owner" value={device.ownerOrg} />
          <SetupCard label="Provisioning" value={PROVISIONING_META[device.provisioningMode].label} />
        </div>
        <p className="text-xs text-muted-foreground">
          Next: assign a schedule/campaign and run a test play from the device detail page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {device.provisioningMode === "zero_touch" ? (
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
          <p className="text-sm font-semibold text-foreground">Zero-touch provisioning</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This device is pre-imaged with its device key and will auto-register on first boot — no code entry needed.
            Ship or install it, and it appears online here automatically.
          </p>
          <div className="mt-3">
            <CopyRow label="Device key" value={`${device.deviceCode}·${device.claimCode}`} mono />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          {/* QR method */}
          <div className="flex flex-col items-center gap-2">
            <QrCode value={activationUrl} />
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ScanLine className="h-3.5 w-3.5" /> Scan to activate
            </span>
          </div>

          {/* Code + manual methods */}
          <div className="space-y-3">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <QrIcon className="h-4 w-4 text-brand" /> Or enter the claim code on the device
              </p>
              <CopyRow label="Claim code" value={device.claimCode ?? ""} mono big expires={device.claimExpiresLabel} />
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 text-brand" /> Or match manually by device ID
              </p>
              <CopyRow label="Device ID" value={device.deviceCode} mono />
            </div>
            <p className="text-xs text-muted-foreground">
              {device.provisioningMode === "self_service"
                ? "Send the QR/code to the customer — they activate from the device's setup screen."
                : "Installer: scan the QR on-site, then capture install photos and run a test play."}
            </p>
          </div>
        </div>
      )}

      {/* Activation status */}
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
          </span>
          <span className="text-sm text-muted-foreground">Waiting for the device to phone home…</span>
        </div>
        <Button variant="secondary" size="sm" onClick={onSimulate}>
          <Rocket className="h-4 w-4" /> Simulate device activation
        </Button>
      </div>
    </div>
  );
}

function SetupCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function CopyRow({ label, value, mono, big, expires }: { label: string; value: string; mono?: boolean; big?: boolean; expires?: string | null }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}{expires ? ` · expires ${expires}` : ""}</p>
        <p className={cn("truncate text-foreground", mono && "font-mono", big ? "text-lg font-semibold tracking-wider" : "text-sm")}>{value}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={copy} aria-label={`Copy ${label}`}>
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
