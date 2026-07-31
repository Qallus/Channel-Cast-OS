export type ClientStatus = "prospect" | "active" | "at_risk" | "churned";
export type ClientHealth = "good" | "watch" | "poor";

export type Client = {
  id: string;
  name: string;
  industry: string;
  status: ClientStatus;
  health: ClientHealth;
  website: string;
  city: string;
  state: string;
  primaryContact: string;
  email: string;
  phone: string;
  locations: number;
  devices: number;
  mrr: number; // monthly recurring revenue, USD
  owner: string;
  notes: string;
  createdAt: string;
};

export const CLIENT_STATUS: Record<ClientStatus, { label: string; tone: string }> = {
  prospect: { label: "Prospect", tone: "bg-muted text-muted-foreground" },
  active: { label: "Active", tone: "bg-success/15 text-success" },
  at_risk: { label: "At risk", tone: "bg-warning/15 text-warning" },
  churned: { label: "Churned", tone: "bg-destructive/15 text-destructive" },
};
export const CLIENT_STATUS_ORDER: ClientStatus[] = ["prospect", "active", "at_risk", "churned"];

export const CLIENT_HEALTH: Record<ClientHealth, { label: string; tone: string }> = {
  good: { label: "Healthy", tone: "bg-success/15 text-success" },
  watch: { label: "Watch", tone: "bg-warning/15 text-warning" },
  poor: { label: "Poor", tone: "bg-destructive/15 text-destructive" },
};

export const INDUSTRIES = [
  "Hospitality",
  "Retail",
  "Real Estate",
  "Healthcare",
  "Fitness",
  "Food & Beverage",
  "Events",
  "Automotive",
  "Education",
  "Other",
];

export const seedClients: Client[] = [
  { id: "cl_oasis", name: "Oasis Tower Resorts", industry: "Hospitality", status: "active", health: "good", website: "oasistower.com", city: "Scottsdale", state: "AZ", primaryContact: "Dana Whitfield", email: "dana@oasistower.com", phone: "+1 480 555 0142", locations: 6, devices: 84, mrr: 7800, owner: "Alex Rivera", notes: "Flagship account. Expanding to two new towers in Q4.", createdAt: "2026-02-11T00:00:00.000Z" },
  { id: "cl_coppermesa", name: "Copper Mesa Apartments", industry: "Real Estate", status: "active", health: "watch", website: "coppermesa.living", city: "Tempe", state: "AZ", primaryContact: "Marcus Lee", email: "marcus@coppermesa.living", phone: "+1 480 555 0110", locations: 3, devices: 41, mrr: 3200, owner: "Alex Rivera", notes: "Pool-deck zone had checksum drift last month — watching playback health.", createdAt: "2026-03-02T00:00:00.000Z" },
  { id: "cl_harbor", name: "Harbor Lights Resort", industry: "Hospitality", status: "active", health: "good", website: "harborlights.com", city: "San Diego", state: "CA", primaryContact: "Priya Nair", email: "priya@harborlights.com", phone: "+1 619 555 0188", locations: 4, devices: 62, mrr: 6100, owner: "Jordan Cole", notes: "Sunrise Promo performing well. Interested in AI-vision upgrade.", createdAt: "2026-01-19T00:00:00.000Z" },
  { id: "cl_northwind", name: "Northwind Retail Group", industry: "Retail", status: "active", health: "good", website: "northwindretail.com", city: "Austin", state: "TX", primaryContact: "Sam Ortiz", email: "sam@northwindretail.com", phone: "+1 512 555 0173", locations: 12, devices: 140, mrr: 12400, owner: "Jordan Cole", notes: "Largest device footprint. Quarterly business review due.", createdAt: "2025-11-28T00:00:00.000Z" },
  { id: "cl_summit", name: "Summit Outfitters", industry: "Retail", status: "prospect", health: "watch", website: "summitoutfitters.co", city: "Denver", state: "CO", primaryContact: "Riley Chen", email: "riley@summitoutfitters.co", phone: "+1 303 555 0166", locations: 2, devices: 0, mrr: 0, owner: "Alex Rivera", notes: "Pilot proposal sent. Powder Days push waiting on approval.", createdAt: "2026-07-14T00:00:00.000Z" },
  { id: "cl_windycity", name: "Windy City Pizza Co", industry: "Food & Beverage", status: "prospect", health: "watch", website: "windycitypizza.com", city: "Chicago", state: "IL", primaryContact: "Tony Bruno", email: "tony@windycitypizza.com", phone: "+1 312 555 0129", locations: 5, devices: 0, mrr: 0, owner: "Jordan Cole", notes: "Deep Dish Deal in draft. Price-sensitive; wants revenue-share model.", createdAt: "2026-07-25T00:00:00.000Z" },
  { id: "cl_oceandrive", name: "Ocean Drive Group", industry: "Hospitality", status: "at_risk", health: "poor", website: "oceandrivegroup.com", city: "Miami", state: "FL", primaryContact: "Lucia Ramos", email: "lucia@oceandrivegroup.com", phone: "+1 305 555 0151", locations: 3, devices: 28, mrr: 2600, owner: "Jordan Cole", notes: "Two invoices past due. Beachfront Happy Hour engagement dropping.", createdAt: "2026-04-08T00:00:00.000Z" },
  { id: "cl_fashionrow", name: "Fashion Row", industry: "Retail", status: "churned", health: "poor", website: "fashionrow.com", city: "Los Angeles", state: "CA", primaryContact: "Elena Frost", email: "elena@fashionrow.com", phone: "+1 213 555 0197", locations: 0, devices: 0, mrr: 0, owner: "Alex Rivera", notes: "Churned after seasonal campaign. Re-engage in fall.", createdAt: "2025-12-05T00:00:00.000Z" },
  { id: "cl_cityevents", name: "City Events LLC", industry: "Events", status: "active", health: "good", website: "cityevents.vegas", city: "Las Vegas", state: "NV", primaryContact: "Nora Patel", email: "nora@cityevents.vegas", phone: "+1 702 555 0184", locations: 2, devices: 18, mrr: 1900, owner: "Alex Rivera", notes: "Night Market Teaser in review. Seasonal but reliable.", createdAt: "2026-05-16T00:00:00.000Z" },
  { id: "cl_localbrew", name: "Local Brew Co", industry: "Food & Beverage", status: "active", health: "watch", website: "localbrew.co", city: "Phoenix", state: "AZ", primaryContact: "Owen Diaz", email: "owen@localbrew.co", phone: "+1 602 555 0139", locations: 3, devices: 22, mrr: 2100, owner: "Jordan Cole", notes: "BrewFest sponsorship approved. Upsell to more locations planned.", createdAt: "2026-06-18T00:00:00.000Z" },
];
