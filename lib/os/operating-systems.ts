import { Eye, Radar, Volume2, type LucideIcon } from "lucide-react";

export type OsId = "vision" | "motion" | "standard";

export type OsConfig = {
  id: OsId;
  label: string;
  icon: LucideIcon;
  tagline: string;
  overview: string;
  fleetCount: string;
  firmware: string;
  /** Trigger event types this OS emits (from 05-trigger-playback-rules.md). */
  triggers: string[];
  capabilities: string[];
  hardware: string[];
  config: { key: string; value: string }[];
  /** Numbered playback/behavior steps. */
  logic: string[];
  /** OS-specific callout: privacy (vision), limitations (motion), rotation (standard). */
  note: { title: string; body: string; items?: string[] };
};

/** Shared edge-runtime responsibilities (05-firmware-edge-runtime.md). */
export const EDGE_RUNTIME: string[] = [
  "Authenticate with the Channel Cast API & send heartbeat",
  "Pull schedule and cache approved audio locally",
  "Apply playback eligibility & priority rules on-device",
  "Continue cached schedule offline; queue logs until reconnected",
  "Report firmware version & errors to the dashboard",
];

export const OPERATING_SYSTEMS: OsConfig[] = [
  {
    id: "vision",
    label: "Vision Activated",
    icon: Eye,
    tagline: "Computer-vision runtime that triggers audio by presence, dwell, and zone.",
    overview:
      "The AI Vision OS runs an on-device vision model to detect qualified visitor activity, then selects eligible campaign audio by priority and pacing. Processing stays at the edge — only aggregate events sync to the cloud.",
    fleetCount: "312 devices",
    firmware: "v0.4.1",
    triggers: ["person_detected", "group_detected", "dwell_time_reached", "scheduled_play", "campaign_rotation"],
    capabilities: [
      "On-device person & group detection",
      "Zone entry & dwell-time targeting",
      "Direction-of-movement awareness",
      "Visitor count estimates",
      "Presence-based playback selection",
    ],
    hardware: ["AI-capable edge computer", "Camera / vision sensor", "Directional speaker", "Wi-Fi / Ethernet / LTE", "Local storage"],
    config: [
      { key: "Detection confidence", value: "0.60" },
      { key: "Minimum dwell", value: "3s" },
      { key: "Frame sampling", value: "5 fps" },
      { key: "Zone sensitivity", value: "Medium" },
      { key: "Cooldown", value: "45s" },
      { key: "Max plays / hour", value: "6" },
    ],
    logic: [
      "Vision model detects qualified visitor activity.",
      "Device checks cooldown and local schedule.",
      "Device chooses eligible campaign audio by priority and pacing.",
      "Device plays audio.",
      "Device logs the trigger and playback event.",
      "Device syncs aggregate stats to the cloud.",
    ],
    note: {
      title: "Privacy-first design",
      body: "Vision processing is designed to protect visitors:",
      items: [
        "Prefer edge processing — no raw video leaves the device.",
        "Store aggregate events, not raw frames.",
        "Never expose raw camera data to advertisers.",
        "Treat visitor counts & impressions as estimates unless directly measured.",
      ],
    },
  },
  {
    id: "motion",
    label: "Motion Activated",
    icon: Radar,
    tagline: "Lightweight PIR runtime that plays scheduled audio on movement — low cost, simple to deploy.",
    overview:
      "The PIR Motion OS is the simple, lower-cost runtime. A passive-infrared sensor detects movement and plays approved scheduled content while respecting cooldown and frequency limits. Ideal for entryways, common areas, and simple placements.",
    fleetCount: "468 devices",
    firmware: "v0.3.8",
    triggers: ["motion_detected", "scheduled_play", "campaign_rotation"],
    capabilities: [
      "PIR motion trigger",
      "Scheduled playback windows",
      "Cooldown & frequency limits",
      "Time-of-day activity logging",
      "Low-power, low-cost deployment",
    ],
    hardware: ["PIR motion sensor", "Speaker", "Audio controller", "Wi-Fi", "Local storage"],
    config: [
      { key: "PIR sensitivity", value: "Medium" },
      { key: "Motion hold", value: "2s" },
      { key: "Cooldown", value: "60s" },
      { key: "Max plays / hour", value: "4" },
      { key: "Quiet hours", value: "10:00 PM – 7:00 AM" },
    ],
    logic: [
      "PIR sensor detects motion.",
      "Device checks the active schedule.",
      "Device respects cooldown / frequency limits.",
      "Device plays approved content.",
      "Device logs the motion trigger and playback.",
      "Device reports activity to the cloud.",
    ],
    note: {
      title: "Limitations",
      body: "Motion sensing is simple by design:",
      items: [
        "Does not classify users or estimate group size.",
        "Motion events are not the same as unique visitors.",
        "Best analytics: trigger count, playback count, completion, and time-of-day activity.",
      ],
    },
  },
  {
    id: "standard",
    label: "Standard Audio",
    icon: Volume2,
    tagline: "Scheduled, radio-style runtime that plays approved content on time windows and rotations — no sensor required.",
    overview:
      "The Standard Audio OS delivers scheduled, radio-style playback without a motion or vision trigger. It rotates approved campaigns across time windows using priority and pacing — ideal for continuous ambient advertising and announcements.",
    fleetCount: "112 devices",
    firmware: "v0.4.1",
    triggers: ["scheduled_play", "campaign_rotation", "manual_play", "admin_test"],
    capabilities: [
      "Time-window scheduling",
      "Campaign rotation & pacing",
      "Priority-based selection",
      "Continuous / looped playback",
      "No sensor required",
    ],
    hardware: ["Media player / mini PC", "Speaker", "Wi-Fi / Ethernet", "Local storage"],
    config: [
      { key: "Rotation mode", value: "Weighted" },
      { key: "Loop gap", value: "15s" },
      { key: "Play window", value: "8:00 AM – 9:00 PM" },
      { key: "Priority mode", value: "Pacing-first" },
      { key: "Max plays / hour", value: "12" },
    ],
    logic: [
      "Device pulls the active schedule.",
      "Device checks playback eligibility (approved, active, in-window).",
      "Device prioritizes: priority → pacing → rotation weight → least recently played.",
      "Device plays audio on the schedule / rotation.",
      "Device logs playback start & complete events.",
      "Device syncs logs to the cloud.",
    ],
    note: {
      title: "Prioritization order",
      body: "When multiple campaigns are eligible, the runtime selects in this order:",
      items: ["Higher-priority campaign wins.", "Then pacing needs.", "Then rotation weight.", "Then least recently played."],
    },
  },
];

export function getOperatingSystem(id: OsId): OsConfig {
  return OPERATING_SYSTEMS.find((o) => o.id === id) ?? OPERATING_SYSTEMS[0];
}
