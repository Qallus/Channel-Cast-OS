export type Listing = {
  slug: string;
  name: string;
  type: string;
  city: string;
  state: string;
  description: string;
  audiencePerWeek: number;
  pricePerWeek: number;
  devices: number;
  tags: string[];
  imageUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
};

// Curated sample ad spaces across the West Coast and Southwest — the high-traffic,
// motion-rich environments Channel Cast targets: parking garages & retail lots,
// busy downtowns, big-box & grocery, malls, arenas & event venues, airports, and
// gas stations. Shown until operators publish their own live listings.
export const LISTINGS: Listing[] = [
  // Downtowns & parking (Southwest → up the coast)
  { slug: "old-town-scottsdale-garage", name: "Old Town Scottsdale Parking Garage", type: "Parking Garage", city: "Scottsdale", state: "AZ", description: "Multi-level garage serving Old Town Scottsdale's entertainment district — a constant flow of diners, shoppers, and nightlife crowds walking to and from their cars.", audiencePerWeek: 7200, pricePerWeek: 380, devices: 4, tags: ["Downtown", "Nightlife", "High volume"], lat: 33.4942, lng: -111.9214 },
  { slug: "downtown-seattle-garage", name: "Downtown Seattle Parking Garage", type: "Parking Garage", city: "Seattle", state: "WA", description: "Core downtown garage feeding office towers, retail, and Pike Place foot traffic. Heavy weekday commuter volume plus weekend visitors.", audiencePerWeek: 9600, pricePerWeek: 520, devices: 5, tags: ["Downtown", "Commuters", "High volume"], lat: 47.6101, lng: -122.3344 },
  { slug: "downtown-san-diego-garage", name: "Downtown San Diego Parking Garage", type: "Parking Garage", city: "San Diego", state: "CA", description: "Gaslamp-adjacent garage with all-day turnover from tourists, ballpark crowds, and downtown workers.", audiencePerWeek: 8100, pricePerWeek: 460, devices: 4, tags: ["Downtown", "Tourists", "All day"], lat: 32.7115, lng: -117.1608 },
  { slug: "las-vegas-strip-garage", name: "Las Vegas Strip Parking Garage", type: "Parking Garage", city: "Las Vegas", state: "NV", description: "Resort-corridor garage with round-the-clock tourist and event traffic just off the Strip.", audiencePerWeek: 18000, pricePerWeek: 880, devices: 7, tags: ["Tourists", "Nightlife", "High volume"], lat: 36.1147, lng: -115.1728 },
  { slug: "downtown-la-retail-lot", name: "Downtown LA Retail Parking Lot", type: "Retail Parking Lot", city: "Los Angeles", state: "CA", description: "Surface lot anchoring a busy downtown retail block — shoppers and errand-runners crossing on foot all day.", audiencePerWeek: 9200, pricePerWeek: 420, devices: 4, tags: ["Downtown", "Shoppers", "All day"], lat: 34.0430, lng: -118.2570 },
  { slug: "san-jose-retail-lot", name: "San Jose Retail Center Lot", type: "Retail Parking Lot", city: "San Jose", state: "CA", description: "Neighborhood shopping-center lot with steady grocery, dining, and service traffic across the week.", audiencePerWeek: 7400, pricePerWeek: 340, devices: 3, tags: ["Shoppers", "Local", "All day"], lat: 37.3382, lng: -121.8863 },

  // Big-box & grocery
  { slug: "walmart-supercenter-mesa", name: "Walmart Supercenter — Mesa", type: "Walmart", city: "Mesa", state: "AZ", description: "Supercenter with heavy all-day and weekend foot traffic across a broad value-shopper audience.", audiencePerWeek: 14000, pricePerWeek: 560, devices: 4, tags: ["Shoppers", "Value", "All day"], lat: 33.4152, lng: -111.8315 },
  { slug: "walmart-supercenter-sacramento", name: "Walmart Supercenter — Sacramento", type: "Walmart", city: "Sacramento", state: "CA", description: "High-volume Supercenter serving a dense suburban trade area — a reliable mass-reach location.", audiencePerWeek: 13500, pricePerWeek: 540, devices: 4, tags: ["Shoppers", "Value", "All day"], lat: 38.5816, lng: -121.4944 },
  { slug: "frys-food-chandler", name: "Fry's Food Store — Chandler", type: "Grocery Store", city: "Chandler", state: "AZ", description: "Neighborhood grocery with frequent repeat visits and long in-store dwell — strong for local and CPG brands.", audiencePerWeek: 8800, pricePerWeek: 320, devices: 3, tags: ["Grocery", "Repeat", "All day"], lat: 33.3062, lng: -111.8413 },
  { slug: "frys-food-tempe", name: "Fry's Food Store — Tempe", type: "Grocery Store", city: "Tempe", state: "AZ", description: "Busy grocery near ASU with a mix of students, families, and weekday shoppers.", audiencePerWeek: 8200, pricePerWeek: 300, devices: 3, tags: ["Grocery", "Repeat", "Weekday"], lat: 33.4255, lng: -111.9400 },
  { slug: "safeway-portland", name: "Safeway — Portland", type: "Grocery Store", city: "Portland", state: "OR", description: "Established neighborhood grocery with steady daily traffic and high visit frequency.", audiencePerWeek: 7600, pricePerWeek: 280, devices: 2, tags: ["Grocery", "Repeat", "All day"], lat: 45.5231, lng: -122.6765 },

  // Malls
  { slug: "scottsdale-fashion-square", name: "Scottsdale Fashion Square", type: "Mall", city: "Scottsdale", state: "AZ", description: "Premier regional mall with strong weekend and holiday shopper volume across fashion and dining.", audiencePerWeek: 12000, pricePerWeek: 640, devices: 5, tags: ["Shoppers", "Weekend", "Retail"], lat: 33.5028, lng: -111.9290 },
  { slug: "westfield-utc-mall", name: "Westfield UTC", type: "Mall", city: "San Diego", state: "CA", description: "Open-air super-regional mall drawing shoppers, diners, and moviegoers throughout the day and evening.", audiencePerWeek: 11000, pricePerWeek: 600, devices: 5, tags: ["Shoppers", "Weekend", "Retail"], lat: 32.8709, lng: -117.2110 },

  // Arenas & event facilities
  { slug: "footprint-center-arena", name: "Footprint Center", type: "Sports Arena", city: "Phoenix", state: "AZ", description: "Downtown Phoenix arena hosting NBA games, concerts, and events — dense pre- and post-event crowds.", audiencePerWeek: 15000, pricePerWeek: 820, devices: 6, tags: ["Events", "Evening", "Crowds"], lat: 33.4457, lng: -112.0712 },
  { slug: "chase-center-arena", name: "Chase Center", type: "Sports Arena", city: "San Francisco", state: "CA", description: "Waterfront arena and entertainment district with year-round games, shows, and heavy event-day footfall.", audiencePerWeek: 17000, pricePerWeek: 900, devices: 7, tags: ["Events", "Evening", "Crowds"], lat: 37.7680, lng: -122.3877 },
  { slug: "climate-pledge-arena", name: "Climate Pledge Arena", type: "Sports Arena", city: "Seattle", state: "WA", description: "Seattle Center arena hosting NHL, concerts, and events with large, engaged crowds.", audiencePerWeek: 16000, pricePerWeek: 860, devices: 6, tags: ["Events", "Evening", "Crowds"], lat: 47.6221, lng: -122.3540 },
  { slug: "phoenix-convention-center", name: "Phoenix Convention Center", type: "Event Facility", city: "Phoenix", state: "AZ", description: "Major convention venue with rotating trade shows and events bringing waves of high-intent attendees.", audiencePerWeek: 13000, pricePerWeek: 700, devices: 5, tags: ["Events", "Conventions", "Crowds"], lat: 33.4470, lng: -112.0700 },
  { slug: "san-diego-convention-center", name: "San Diego Convention Center", type: "Event Facility", city: "San Diego", state: "CA", description: "Waterfront convention center hosting large-scale events and conferences year-round.", audiencePerWeek: 14000, pricePerWeek: 740, devices: 5, tags: ["Events", "Conventions", "Crowds"], lat: 32.7057, lng: -117.1622 },

  // Airports
  { slug: "phx-sky-harbor-airport", name: "Phoenix Sky Harbor Airport", type: "Airport", city: "Phoenix", state: "AZ", description: "One of the nation's busiest airports — massive daily traveler throughput across terminals, rental returns, and garages.", audiencePerWeek: 21000, pricePerWeek: 980, devices: 8, tags: ["Travelers", "High volume", "All day"], lat: 33.4342, lng: -112.0116 },
  { slug: "seatac-airport", name: "Seattle–Tacoma Airport (SEA)", type: "Airport", city: "SeaTac", state: "WA", description: "Pacific Northwest hub with heavy commuter and leisure traffic through terminals and parking structures.", audiencePerWeek: 24000, pricePerWeek: 1050, devices: 9, tags: ["Travelers", "High volume", "Rush hour"], lat: 47.4502, lng: -122.3088 },
  { slug: "lax-airport", name: "Los Angeles International (LAX)", type: "Airport", city: "Los Angeles", state: "CA", description: "Major international gateway with enormous continuous traveler volume across terminals and garages.", audiencePerWeek: 30000, pricePerWeek: 1200, devices: 10, tags: ["Travelers", "High volume", "All day"], lat: 33.9416, lng: -118.4085 },

  // Gas stations
  { slug: "circle-k-fuel-phoenix", name: "Circle K Fuel Center — Phoenix", type: "Gas Station", city: "Phoenix", state: "AZ", description: "High-turnover fuel and convenience stop on a busy corridor — quick, repeat visits all day.", audiencePerWeek: 6400, pricePerWeek: 180, devices: 2, tags: ["Fuel", "Quick stop", "All day"], lat: 33.4484, lng: -112.0740 },
  { slug: "chevron-station-san-jose", name: "Chevron Station — San Jose", type: "Gas Station", city: "San Jose", state: "CA", description: "Commuter-route fuel station with steady weekday morning and evening traffic.", audiencePerWeek: 6100, pricePerWeek: 170, devices: 2, tags: ["Fuel", "Quick stop", "Commuters"], lat: 37.3230, lng: -121.9052 },
];

export const LISTING_TYPES = Array.from(new Set(LISTINGS.map((l) => l.type))).sort();

export const getListing = (slug: string) => LISTINGS.find((l) => l.slug === slug);

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
