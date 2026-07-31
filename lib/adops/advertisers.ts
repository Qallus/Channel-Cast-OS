export type AdvertiserStatus = "prospect" | "onboarding" | "active" | "paused";

export type Advertiser = {
  id: string;
  name: string;
  industry: string;
  status: AdvertiserStatus;
  website: string;
  city: string;
  state: string;
  primaryContact: string;
  email: string;
  phone: string;
  campaigns: number;
  spend: number; // total spend to date, USD
  lat: number | null;
  lng: number | null;
  owner: string;
  notes: string;
  createdAt: string;
};

export const ADVERTISER_STATUS: Record<AdvertiserStatus, { label: string; tone: string }> = {
  prospect: { label: "Prospect", tone: "bg-muted text-muted-foreground" },
  onboarding: { label: "Onboarding", tone: "bg-brand/15 text-brand-strong" },
  active: { label: "Active", tone: "bg-success/15 text-success" },
  paused: { label: "Paused", tone: "bg-warning/15 text-warning" },
};
export const ADVERTISER_STATUS_ORDER: AdvertiserStatus[] = ["prospect", "onboarding", "active", "paused"];

export const ADVERTISER_INDUSTRIES = [
  "Hospitality",
  "Retail",
  "Real Estate",
  "Food & Beverage",
  "Fitness",
  "Automotive",
  "Events",
  "Healthcare",
  "Financial",
  "Other",
];

export const seedAdvertisers: Advertiser[] = [
  { id: "ad_oasis", name: "Oasis Tower Resorts", industry: "Hospitality", status: "active", website: "oasistower.com", city: "Scottsdale", state: "AZ", primaryContact: "Dana Whitfield", email: "dana@oasistower.com", phone: "+1 480 555 0142", campaigns: 3, spend: 48200, lat: 33.49, lng: -111.93, owner: "Alex Rivera", notes: "Flagship advertiser. Spring Patio + two seasonal flights.", createdAt: "2026-02-15T00:00:00.000Z" },
  { id: "ad_harbor", name: "Harbor Lights Resort", industry: "Hospitality", status: "active", website: "harborlights.com", city: "San Diego", state: "CA", primaryContact: "Priya Nair", email: "priya@harborlights.com", phone: "+1 619 555 0188", campaigns: 2, spend: 31600, lat: 32.72, lng: -117.16, owner: "Jordan Cole", notes: "Sunrise Promo running. Evaluating AI-vision spots.", createdAt: "2026-01-22T00:00:00.000Z" },
  { id: "ad_northwind", name: "Northwind Retail Group", industry: "Retail", status: "active", website: "northwindretail.com", city: "Austin", state: "TX", primaryContact: "Sam Ortiz", email: "sam@northwindretail.com", phone: "+1 512 555 0173", campaigns: 4, spend: 72400, lat: 30.27, lng: -97.74, owner: "Jordan Cole", notes: "Highest spend. Safety-loop + promo rotations across 12 stores.", createdAt: "2025-12-01T00:00:00.000Z" },
  { id: "ad_localbrew", name: "Local Brew Co", industry: "Food & Beverage", status: "active", website: "localbrew.co", city: "Phoenix", state: "AZ", primaryContact: "Owen Diaz", email: "owen@localbrew.co", phone: "+1 602 555 0139", campaigns: 1, spend: 8600, lat: 33.45, lng: -112.07, owner: "Jordan Cole", notes: "BrewFest sponsorship. Expanding to more taprooms.", createdAt: "2026-06-20T00:00:00.000Z" },
  { id: "ad_summit", name: "Summit Outfitters", industry: "Retail", status: "onboarding", website: "summitoutfitters.co", city: "Denver", state: "CO", primaryContact: "Riley Chen", email: "riley@summitoutfitters.co", phone: "+1 303 555 0166", campaigns: 1, spend: 0, lat: 39.74, lng: -104.99, owner: "Alex Rivera", notes: "Pilot approved. Powder Days push in setup.", createdAt: "2026-07-16T00:00:00.000Z" },
  { id: "ad_city", name: "City Events LLC", industry: "Events", status: "active", website: "cityevents.vegas", city: "Las Vegas", state: "NV", primaryContact: "Nora Patel", email: "nora@cityevents.vegas", phone: "+1 702 555 0184", campaigns: 2, spend: 14800, lat: 36.17, lng: -115.14, owner: "Alex Rivera", notes: "Seasonal event teasers. Reliable repeat spend.", createdAt: "2026-05-18T00:00:00.000Z" },
  { id: "ad_windy", name: "Windy City Pizza Co", industry: "Food & Beverage", status: "prospect", website: "windycitypizza.com", city: "Chicago", state: "IL", primaryContact: "Tony Bruno", email: "tony@windycitypizza.com", phone: "+1 312 555 0129", campaigns: 0, spend: 0, lat: 41.88, lng: -87.63, owner: "Jordan Cole", notes: "Negotiating revenue-share terms before first flight.", createdAt: "2026-07-25T00:00:00.000Z" },
  { id: "ad_ocean", name: "Ocean Drive Group", industry: "Hospitality", status: "paused", website: "oceandrivegroup.com", city: "Miami", state: "FL", primaryContact: "Lucia Ramos", email: "lucia@oceandrivegroup.com", phone: "+1 305 555 0151", campaigns: 1, spend: 9200, lat: 25.76, lng: -80.19, owner: "Jordan Cole", notes: "Paused over past-due invoices. Happy Hour flight on hold.", createdAt: "2026-04-10T00:00:00.000Z" },
];
