export type SpotStatus = "draft" | "in_review" | "approved" | "live" | "archived";

export type AudioSpot = {
  id: string;
  name: string;
  advertiser: string;
  status: SpotStatus;
  durationSec: number;
  start: string; // ISO date
  end: string; // ISO date
  city: string;
  state: string;
  lat: number;
  lng: number;
  plays: number;
  image?: string | null; // optional cover; falls back to a waveform tile
};

export const SPOT_STATUS_META: Record<SpotStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-muted text-muted-foreground" },
  in_review: { label: "In Review", tone: "bg-warning/15 text-warning" },
  approved: { label: "Approved", tone: "bg-brand/15 text-brand-strong" },
  live: { label: "Live", tone: "bg-success/15 text-success" },
  archived: { label: "Archived", tone: "bg-secondary text-secondary-foreground" },
};

export const SPOT_STATUS_ORDER: SpotStatus[] = ["draft", "in_review", "approved", "live", "archived"];

export const mockSpots: AudioSpot[] = [
  { id: "s1", name: "Spring Patio Promo", advertiser: "Oasis Tower", status: "live", durationSec: 30, start: "2026-07-06", end: "2026-07-27", city: "Scottsdale", state: "AZ", lat: 33.49, lng: -111.93, plays: 41200 },
  { id: "s2", name: "Aqua Splash 15s", advertiser: "Copper Mesa", status: "live", durationSec: 15, start: "2026-07-10", end: "2026-08-10", city: "Tempe", state: "AZ", lat: 33.43, lng: -111.94, plays: 18800 },
  { id: "s3", name: "BrewFest Sponsorship", advertiser: "Local Brew Co", status: "approved", durationSec: 30, start: "2026-07-18", end: "2026-07-31", city: "Phoenix", state: "AZ", lat: 33.45, lng: -112.07, plays: 0 },
  { id: "s4", name: "Memorial Spotlight", advertiser: "Fashion Row", status: "archived", durationSec: 20, start: "2026-05-20", end: "2026-06-02", city: "Los Angeles", state: "CA", lat: 34.05, lng: -118.24, plays: 96400 },
  { id: "s5", name: "Sunrise Promo 30s", advertiser: "Harbor Lights Resort", status: "live", durationSec: 30, start: "2026-07-01", end: "2026-07-31", city: "San Diego", state: "CA", lat: 32.72, lng: -117.16, plays: 190000 },
  { id: "s6", name: "Night Market Teaser", advertiser: "City Events", status: "in_review", durationSec: 15, start: "2026-07-22", end: "2026-08-05", city: "Las Vegas", state: "NV", lat: 36.17, lng: -115.14, plays: 0 },
  { id: "s7", name: "Tech Campus Safety Loop", advertiser: "Northwind Retail", status: "approved", durationSec: 45, start: "2026-07-14", end: "2026-09-14", city: "Austin", state: "TX", lat: 30.27, lng: -97.74, plays: 144000 },
  { id: "s8", name: "Powder Days Push", advertiser: "Summit Outfitters", status: "draft", durationSec: 30, start: "2026-07-28", end: "2026-08-28", city: "Denver", state: "CO", lat: 39.74, lng: -104.99, plays: 0 },
  { id: "s9", name: "Deep Dish Deal", advertiser: "Windy City Pizza", status: "draft", durationSec: 20, start: "2026-07-25", end: "2026-08-15", city: "Chicago", state: "IL", lat: 41.88, lng: -87.63, plays: 0 },
  { id: "s10", name: "Beachfront Happy Hour", advertiser: "Ocean Drive Group", status: "in_review", durationSec: 15, start: "2026-07-16", end: "2026-08-16", city: "Miami", state: "FL", lat: 25.76, lng: -80.19, plays: 0 },
];
