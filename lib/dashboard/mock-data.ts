/**
 * Preview data for the Super Admin command center.
 * Values mirror docs/screen-shots so layout + workflows can be built before
 * Supabase is wired. Replace with real queries in a later phase.
 */

export type Kpi = {
  label: string;
  value: string;
  hint: string;
};

export const kpis: Kpi[] = [
  { label: "Total Clients", value: "142", hint: "+6 this quarter" },
  { label: "Total Advertisers", value: "68", hint: "+3 onboarded" },
  { label: "Total Devices", value: "892", hint: "+14 installed" },
  { label: "Online Devices", value: "821", hint: "92% uptime" },
  { label: "Offline Devices", value: "71", hint: "Heartbeat alerts" },
  { label: "Active Campaigns", value: "37", hint: "12 ending soon" },
  { label: "Scheduled Campaigns", value: "19", hint: "Across 8 metros" },
  { label: "Total Audio Plays", value: "1.82M", hint: "30-day window" },
  { label: "Estimated Revenue", value: "$284k", hint: "+11% WoW" },
  { label: "Open Quote Requests", value: "24", hint: "7 SLA-tight" },
];

export type DeviceHealthKey = "online" | "warning" | "offline" | "error";

export const deviceHealth: { key: DeviceHealthKey; label: string; value: number }[] = [
  { key: "online", label: "Online", value: 821 },
  { key: "warning", label: "Warning", value: 54 },
  { key: "offline", label: "Offline", value: 17 },
  { key: "error", label: "Error", value: 0 },
];

export const deviceHealthNote = "Median heartbeat drift 94s · 6 devices syncing firmware nightly";

export const deploymentQueues: { name: string; progress: number }[] = [
  { name: "BrewFest rotation", progress: 78 },
  { name: "Apartment HOA notices", progress: 45 },
  { name: "Retail flash sale bloc", progress: 33 },
];

export const revenueSnapshot = {
  grossBilled: "$312,480",
  netToChannelCast: "$183,924",
  clientPayouts: "$118,056",
  model: "Revenue share + flat",
};

export type AlertSeverity = "high" | "med" | "low";

export const alerts: { severity: AlertSeverity; message: string }[] = [
  { severity: "high", message: "5 devices stalled on schedule pull" },
  { severity: "med", message: "Harbor playlist integrity checksum drift" },
  { severity: "med", message: "Quote SLA breach risk — 7 open > 48h" },
];

export type PlaybackTrigger = "motion_detected" | "person_detected" | "scheduled_play";

export const recentPlayback: {
  time: string;
  device: string;
  track: string;
  campaign: string;
  trigger: PlaybackTrigger;
}[] = [
  { time: "2:41 PM", device: "Lobby Player · Oasis Tower", track: "Spring Patio Promo", campaign: "Oasis Patio Q2", trigger: "motion_detected" },
  { time: "2:39 PM", device: "Pool Deck Zone B", track: "Aqua Splash 15s", campaign: "Sponsor Swim Week", trigger: "person_detected" },
  { time: "2:35 PM", device: "Radio · Oldtown Station", track: "Local Brew Co", campaign: "BrewFest Sponsorship", trigger: "scheduled_play" },
  { time: "2:31 PM", device: "Retail · Fashion Row", track: "Memorial Sale", campaign: "Memorial Spotlight", trigger: "motion_detected" },
];

export type QuoteStatus = "new" | "in progress";

export const recentQuotes: {
  lead: string;
  status: QuoteStatus;
  listing: string;
  budget: string;
}[] = [
  { lead: "Desert Spine & Joint", status: "new", listing: "Hospital Audio Lobby", budget: "$8k–$12k" },
  { lead: "Copper Mesa Apartments", status: "in progress", listing: "Pool deck audio zone", budget: "$3.5k" },
  { lead: "Northwind Retail Group", status: "new", listing: "Mall kiosk audio pair", budget: "$15k+" },
];

export const topDevices: { rank: number; name: string; plays: string; status: "Online" | "Warning" }[] = [
  { rank: 1, name: "Main Street Retail Pod", plays: "42.1k plays recorded", status: "Online" },
  { rank: 2, name: "Harbor Lights Resort Lobby", plays: "31.9k plays recorded", status: "Warning" },
  { rank: 3, name: "Midtown Apartments Clubhouse", plays: "28.4k plays recorded", status: "Online" },
];

export const topAdSpots: { name: string; fillRate: string; plays: string }[] = [
  { name: "Sunrise Promo 30s", fillRate: "98% avg fill-rate", plays: "190k" },
  { name: "City Events — Night Market", fillRate: "95% avg fill-rate", plays: "152k" },
  { name: "Tech Campus Safety Loop", fillRate: "100% avg fill-rate", plays: "144k" },
];
