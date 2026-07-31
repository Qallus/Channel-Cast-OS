export type CampaignStatus = "draft" | "scheduled" | "live" | "paused" | "completed";

export type Campaign = {
  id: string;
  name: string;
  advertiser: string;
  status: CampaignStatus;
  objective: string;
  budget: number;
  spent: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  spots: number; // number of audio spots in rotation
  plays: number;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  owner: string;
  notes: string;
  createdAt: string;
};

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-muted text-muted-foreground" },
  scheduled: { label: "Scheduled", tone: "bg-brand/15 text-brand" },
  live: { label: "Live", tone: "bg-success/15 text-success" },
  paused: { label: "Paused", tone: "bg-warning/15 text-warning" },
  completed: { label: "Completed", tone: "bg-secondary text-secondary-foreground" },
};
export const CAMPAIGN_STATUS_ORDER: CampaignStatus[] = ["draft", "scheduled", "live", "paused", "completed"];

export const CAMPAIGN_OBJECTIVES = ["Awareness", "Foot traffic", "Promotion", "Event", "Sponsorship", "Retention"];

export const seedCampaigns: Campaign[] = [
  { id: "cp_spring", name: "Spring Patio Promo", advertiser: "Oasis Tower Resorts", status: "live", objective: "Promotion", budget: 18000, spent: 11200, startDate: "2026-07-06", endDate: "2026-07-27", spots: 3, plays: 41200, city: "Scottsdale", state: "AZ", lat: 33.49, lng: -111.93, owner: "Alex Rivera", notes: "Performing above pacing. Consider extending.", createdAt: "2026-06-28T00:00:00.000Z" },
  { id: "cp_sunrise", name: "Sunrise Promo 30s", advertiser: "Harbor Lights Resort", status: "live", objective: "Awareness", budget: 16000, spent: 9400, startDate: "2026-07-01", endDate: "2026-07-31", spots: 2, plays: 190000, city: "San Diego", state: "CA", lat: 32.72, lng: -117.16, owner: "Jordan Cole", notes: "Strong reach. Feeding AI-vision upsell.", createdAt: "2026-06-24T00:00:00.000Z" },
  { id: "cp_safety", name: "Tech Campus Safety Loop", advertiser: "Northwind Retail Group", status: "scheduled", objective: "Awareness", budget: 22000, spent: 0, startDate: "2026-08-14", endDate: "2026-10-14", spots: 4, plays: 0, city: "Austin", state: "TX", lat: 30.27, lng: -97.74, owner: "Jordan Cole", notes: "Approved. Rolls out across 12 stores.", createdAt: "2026-07-14T00:00:00.000Z" },
  { id: "cp_brewfest", name: "BrewFest Sponsorship", advertiser: "Local Brew Co", status: "scheduled", objective: "Sponsorship", budget: 8600, spent: 0, startDate: "2026-08-01", endDate: "2026-08-15", spots: 1, plays: 0, city: "Phoenix", state: "AZ", lat: 33.45, lng: -112.07, owner: "Jordan Cole", notes: "Sponsorship bloc confirmed for festival week.", createdAt: "2026-07-18T00:00:00.000Z" },
  { id: "cp_powder", name: "Powder Days Push", advertiser: "Summit Outfitters", status: "draft", objective: "Promotion", budget: 12000, spent: 0, startDate: "2026-08-28", endDate: "2026-09-28", spots: 2, plays: 0, city: "Denver", state: "CO", lat: 39.74, lng: -104.99, owner: "Alex Rivera", notes: "Pilot flight. Creative in the Media Studio.", createdAt: "2026-07-16T00:00:00.000Z" },
  { id: "cp_night", name: "Night Market Teaser", advertiser: "City Events LLC", status: "scheduled", objective: "Event", budget: 6000, spent: 0, startDate: "2026-08-05", endDate: "2026-08-19", spots: 1, plays: 0, city: "Las Vegas", state: "NV", lat: 36.17, lng: -115.14, owner: "Alex Rivera", notes: "Seasonal teaser bloc.", createdAt: "2026-07-22T00:00:00.000Z" },
  { id: "cp_happy", name: "Beachfront Happy Hour", advertiser: "Ocean Drive Group", status: "paused", objective: "Foot traffic", budget: 5000, spent: 1800, startDate: "2026-07-16", endDate: "2026-08-16", spots: 1, plays: 6400, city: "Miami", state: "FL", lat: 25.76, lng: -80.19, owner: "Jordan Cole", notes: "Paused pending payment resolution.", createdAt: "2026-07-10T00:00:00.000Z" },
  { id: "cp_memorial", name: "Memorial Spotlight", advertiser: "Northwind Retail Group", status: "completed", objective: "Promotion", budget: 9000, spent: 9000, startDate: "2026-05-20", endDate: "2026-06-02", spots: 2, plays: 96400, city: "Austin", state: "TX", lat: 30.27, lng: -97.74, owner: "Alex Rivera", notes: "Closed out. Recap sent to advertiser.", createdAt: "2026-05-12T00:00:00.000Z" },
];
