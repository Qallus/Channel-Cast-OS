import type { DeviceRecord } from "@/lib/devices/devices";

/** Preview telemetry for a device detail page. Deterministic per device so the
 *  view is stable; replaced by real heartbeat/log queries in a later phase. */

export type Heartbeat = {
  time: string;
  status: string;
  firmware: string;
  ip: string;
  signal: string;
  volume: number;
};

export type PlaybackLog = {
  time: string;
  track: string;
  campaign: string;
  trigger: "motion_detected" | "person_detected" | "scheduled_play" | "manual_test";
  result: "completed" | "partial" | "skipped";
};

export type DeviceError = {
  time: string;
  code: string;
  severity: "high" | "med" | "low";
  detail: string;
};

export type ScheduleEntry = {
  campaign: string;
  window: string;
  maxPerHour: number;
  priority: "high" | "normal" | "low";
  status: "active" | "scheduled" | "paused";
};

export function heartbeatsFor(device: DeviceRecord): Heartbeat[] {
  if (!device.firmwareVersion) return [];
  const base = device.status === "warning" ? "warning" : device.status === "offline" ? "offline" : "online";
  const times = ["just now", "2m ago", "4m ago", "6m ago", "8m ago"];
  return times.map((t, i) => ({
    time: t,
    status: i === 0 ? device.status : base,
    firmware: device.firmwareVersion ?? "—",
    ip: "100.84.12.30",
    signal: device.status === "warning" ? "weak" : "strong",
    volume: device.volume,
  }));
}

export function playbackFor(device: DeviceRecord): PlaybackLog[] {
  if (!device.firmwareVersion) return [];
  return [
    { time: "2:41 PM", track: "Spring Patio Promo", campaign: "Oasis Patio Q2", trigger: "motion_detected", result: "completed" },
    { time: "2:33 PM", track: "Local Brew Co 15s", campaign: "BrewFest Sponsorship", trigger: "scheduled_play", result: "completed" },
    { time: "2:22 PM", track: "Memorial Sale", campaign: "Memorial Spotlight", trigger: "person_detected", result: "partial" },
    { time: "2:05 PM", track: "System check tone", campaign: "—", trigger: "manual_test", result: "completed" },
  ];
}

export function errorsFor(device: DeviceRecord): DeviceError[] {
  if (device.status === "warning") {
    return [{ time: "3m ago", code: "schedule_sync_failed", severity: "med", detail: "Playlist checksum drift — re-sync queued." }];
  }
  if (device.status === "offline") {
    return [
      { time: "2h ago", code: "network_error", severity: "high", detail: "Heartbeat missed — device unreachable." },
      { time: "2h ago", code: "sensor_offline", severity: "med", detail: "Motion sensor stopped reporting." },
    ];
  }
  if (device.status === "error") {
    return [{ time: "just now", code: "speaker_error", severity: "high", detail: "Audio output fault detected." }];
  }
  return [];
}

export function scheduleFor(device: DeviceRecord): ScheduleEntry[] {
  if (!device.locationName || device.status !== "online") return [];
  return [
    { campaign: "Oasis Patio Q2", window: "Mon–Sun · 8:00 AM–9:00 PM", maxPerHour: 6, priority: "high", status: "active" },
    { campaign: "BrewFest Sponsorship", window: "Fri–Sun · 4:00 PM–10:00 PM", maxPerHour: 4, priority: "normal", status: "scheduled" },
  ];
}
