export type StationStatus = "live" | "scheduled" | "offline";

export type RadioStation = {
  id: string;
  name: string;
  market: string; // city
  state: string;
  lat: number | null;
  lng: number | null;
  status: StationStatus;
  genre: string;
  listeners: number;
  spotsAvailable: number;
  owner: string;
  notes: string;
  createdAt: string;
};

export const STATION_STATUS: Record<StationStatus, { label: string; tone: string }> = {
  live: { label: "Live", tone: "bg-success/15 text-success" },
  scheduled: { label: "Scheduled", tone: "bg-brand/15 text-brand-strong" },
  offline: { label: "Offline", tone: "bg-muted text-muted-foreground" },
};
export const STATION_STATUS_ORDER: StationStatus[] = ["live", "scheduled", "offline"];

export const STATION_GENRES = ["Top 40", "Country", "Classic Rock", "Jazz", "News/Talk", "Latin", "Hip-Hop", "Local"];

export const seedRadioStations: RadioStation[] = [
  { id: "rs_desert", name: "Desert Pulse 101.5", market: "Scottsdale", state: "AZ", lat: 33.49, lng: -111.93, status: "live", genre: "Top 40", listeners: 42000, spotsAvailable: 6, owner: "Alex Rivera", notes: "Strong evening drive-time. Oasis flights run here.", createdAt: "2026-02-20T00:00:00.000Z" },
  { id: "rs_harbor", name: "Harbor Wave 96.3", market: "San Diego", state: "CA", lat: 32.72, lng: -117.16, status: "live", genre: "Classic Rock", listeners: 61000, spotsAvailable: 4, owner: "Jordan Cole", notes: "Coastal reach. Sunrise Promo airing.", createdAt: "2026-01-30T00:00:00.000Z" },
  { id: "rs_austin", name: "ATX Live 88.7", market: "Austin", state: "TX", lat: 30.27, lng: -97.74, status: "live", genre: "Local", listeners: 38000, spotsAvailable: 8, owner: "Jordan Cole", notes: "Local-first programming. Northwind safety loop.", createdAt: "2025-12-10T00:00:00.000Z" },
  { id: "rs_denver", name: "Mile High FM 104.1", market: "Denver", state: "CO", lat: 39.74, lng: -104.99, status: "scheduled", genre: "Country", listeners: 29000, spotsAvailable: 10, owner: "Alex Rivera", notes: "Powder Days push scheduled for the season.", createdAt: "2026-07-16T00:00:00.000Z" },
  { id: "rs_vegas", name: "Neon Nights 92.9", market: "Las Vegas", state: "NV", lat: 36.17, lng: -115.14, status: "scheduled", genre: "Hip-Hop", listeners: 47000, spotsAvailable: 5, owner: "Alex Rivera", notes: "Night Market teaser bloc booked.", createdAt: "2026-07-22T00:00:00.000Z" },
  { id: "rs_miami", name: "Bayfront 105.9", market: "Miami", state: "FL", lat: 25.76, lng: -80.19, status: "offline", genre: "Latin", listeners: 0, spotsAvailable: 12, owner: "Jordan Cole", notes: "Paused with Ocean Drive account. Inventory open.", createdAt: "2026-04-15T00:00:00.000Z" },
  { id: "rs_phoenix", name: "Valley Talk 1230", market: "Phoenix", state: "AZ", lat: 33.45, lng: -112.07, status: "live", genre: "News/Talk", listeners: 21000, spotsAvailable: 7, owner: "Jordan Cole", notes: "BrewFest sponsorship reads.", createdAt: "2026-06-22T00:00:00.000Z" },
  { id: "rs_chicago", name: "Windy 98.5", market: "Chicago", state: "IL", lat: 41.88, lng: -87.63, status: "offline", genre: "Jazz", listeners: 0, spotsAvailable: 9, owner: "Jordan Cole", notes: "Prospecting Windy City Pizza rev-share.", createdAt: "2026-07-26T00:00:00.000Z" },
];
