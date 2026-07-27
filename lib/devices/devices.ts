import { Eye, Monitor, Radar, Volume2, type LucideIcon } from "lucide-react";

/* ── Device types ─────────────────────────────────────────────────── */

export type DeviceTypeId = "ai_vision" | "pir_motion" | "standard_audio" | "digital_display";

export type DeviceTypeMeta = {
  id: DeviceTypeId;
  label: string;
  icon: LucideIcon;
  /** Short code fragment used in the human device code, e.g. "AV". */
  abbr: string;
};

export const DEVICE_TYPES: DeviceTypeMeta[] = [
  { id: "ai_vision", label: "AI Vision", icon: Eye, abbr: "AV" },
  { id: "pir_motion", label: "PIR Motion", icon: Radar, abbr: "MO" },
  { id: "standard_audio", label: "Standard Audio", icon: Volume2, abbr: "SA" },
  { id: "digital_display", label: "Digital Display", icon: Monitor, abbr: "DD" },
];

export function getDeviceType(id: DeviceTypeId): DeviceTypeMeta {
  return DEVICE_TYPES.find((t) => t.id === id) ?? DEVICE_TYPES[0];
}

/* ── Status ladder (from 05-hardware-device/03-…provisioning.md) ───── */

export type DeviceStatus =
  | "needs_setup"
  | "registered"
  | "online"
  | "offline"
  | "warning"
  | "error"
  | "updating"
  | "retired";

export type StatusTone = "brand" | "success" | "muted" | "warning" | "destructive" | "info";

export const STATUS_META: Record<DeviceStatus, { label: string; tone: StatusTone }> = {
  needs_setup: { label: "Needs setup", tone: "info" },
  registered: { label: "Registered", tone: "brand" },
  online: { label: "Online", tone: "success" },
  offline: { label: "Offline", tone: "muted" },
  warning: { label: "Warning", tone: "warning" },
  error: { label: "Error", tone: "destructive" },
  updating: { label: "Updating", tone: "info" },
  retired: { label: "Retired", tone: "muted" },
};

/** A device is awaiting a physical unit to claim it. */
export const PENDING_STATUSES: DeviceStatus[] = ["needs_setup", "registered"];
export function isPending(status: DeviceStatus) {
  return PENDING_STATUSES.includes(status);
}

/* ── Provisioning mode → maps to the two ownership scenarios ───────── */

export type ProvisioningMode = "self_service" | "field_install" | "zero_touch";

export const PROVISIONING_META: Record<
  ProvisioningMode,
  { label: string; description: string }
> = {
  self_service: {
    label: "Self-service",
    description: "Customer/location activates the device themselves via QR or claim code.",
  },
  field_install: {
    label: "Field install",
    description: "Channel Cast installer activates on-site and captures install verification.",
  },
  zero_touch: {
    label: "Zero-touch",
    description: "Pre-imaged with a device key; auto-registers on first boot. Best for bulk fleets.",
  },
};

/* ── Device record ────────────────────────────────────────────────── */

export type DeviceRecord = {
  id: string;
  deviceCode: string;
  name: string;
  type: DeviceTypeId;
  model: string;
  status: DeviceStatus;
  provisioningMode: ProvisioningMode;
  ownerOrg: string;
  locationName: string | null;
  /** One-time claim secret (shown until the device activates). Null once activated. */
  claimCode: string | null;
  claimExpiresLabel: string | null;
  firmwareVersion: string | null;
  lastHeartbeat: string | null;
  volume: number;
};

/* ── Generators (client-side only — do not call at module load) ────── */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function randomFrom(alphabet: string, length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Human-friendly device code, e.g. "CC-AV-7QK4". */
export function generateDeviceCode(type: DeviceTypeId) {
  return `CC-${getDeviceType(type).abbr}-${randomFrom(CODE_ALPHABET, 4)}`;
}

/** One-time claim code, e.g. "WXYZ-4821". Grouped for easy typing. */
export function generateClaimCode() {
  return `${randomFrom(CODE_ALPHABET, 4)}-${randomFrom(CODE_ALPHABET, 4)}`;
}

const ACTIVATION_BASE = "https://activate.channelcast.io/d";

/** Payload encoded into the activation QR code. */
export function buildActivationUrl(deviceCode: string, claimCode: string) {
  return `${ACTIVATION_BASE}/${deviceCode}?c=${claimCode}`;
}
