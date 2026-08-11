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
  pricePerDay?: number;   // daily rate ($/day)
  spots?: number;         // ad-loop inventory (slots)
  spotSeconds?: number;   // typical spot length: moving audience 10s, captive 20–30s
};

// Arizona placement sites with real location photos. Shown until operators
// publish their own live listings.
export const LISTINGS: Listing[] = [

  // ── Arizona placement sites (real locations & photos) ──────────────────────
  // Standard offer: $25/day, a 10-spot loop. Spot length by traffic: moving 10s,
  // walking/parking 15s, dwelling shoppers 20s, captive event crowds 30s.
  { slug: "goodyear-civic-center", name: "Goodyear Civic Center", type: "Civic Center", city: "Goodyear", state: "AZ", description: "West Valley civic hub hosting city events, meetings, and community gatherings — a captive, engaged local audience.", audiencePerWeek: 4200, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 30, devices: 2, tags: ["Civic", "Events", "Captive"], imageUrl: "/locations/goodyear-civic-center.jpg", lat: 33.4353, lng: -112.3585 },
  { slug: "catalina-parking-garage", name: "Catalina Parking Garage", type: "Parking Garage", city: "Tucson", state: "AZ", description: "Busy Tucson parking structure serving downtown and university foot traffic all day.", audiencePerWeek: 6800, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 15, devices: 3, tags: ["Parking", "Students", "All day"], imageUrl: "/locations/catalina-parking-garage.jpg", lat: 32.2226, lng: -110.9686 },
  { slug: "goodyear-parking-garage", name: "Goodyear Ballpark Parking Garage", type: "Parking Garage", city: "Goodyear", state: "AZ", description: "Parking structure serving Goodyear Ballpark and the surrounding entertainment district.", audiencePerWeek: 3600, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 15, devices: 2, tags: ["Parking", "Events", "Weekend"], imageUrl: "/locations/goodyear-parking-garage.jpg", lat: 33.4144, lng: -112.3835 },
  { slug: "phoenix-biomedical-garage", name: "Phoenix Biomedical P3 Parking Structure", type: "Parking Garage", city: "Phoenix", state: "AZ", description: "Downtown biomedical campus garage with heavy weekday commuter and staff throughput — an audience on the move.", audiencePerWeek: 7200, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 10, devices: 3, tags: ["Parking", "Commuters", "On the move"], imageUrl: "/locations/phoenix-biomedical-garage.jpg", lat: 33.4515, lng: -112.0662 },
  { slug: "scottsdale-fashion-square-garage", name: "Scottsdale Fashion Square Parking Garage", type: "Parking Garage", city: "Scottsdale", state: "AZ", description: "Garage feeding Arizona's premier shopping mall — dwelling shoppers walking to and from their cars.", audiencePerWeek: 11500, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 20, devices: 4, tags: ["Parking", "Shoppers", "Dwell time"], imageUrl: "/locations/scottsdale-fashion-square-garage.jpg", lat: 33.5028, lng: -111.9290 },
  { slug: "scottsdale-civic-center-garage", name: "Old Town Scottsdale Parking Garage", type: "Parking Garage", city: "Scottsdale", state: "AZ", description: "Structure serving Old Town Scottsdale's dining, gallery, and nightlife district.", audiencePerWeek: 6400, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 15, devices: 3, tags: ["Parking", "Nightlife", "Downtown"], imageUrl: "/locations/scottsdale-civic-center-garage.jpg", lat: 33.4925, lng: -111.9260 },
  { slug: "sky-harbor-parking-garage", name: "Sky Harbor Airport Parking Garage", type: "Parking Garage", city: "Phoenix", state: "AZ", description: "Terminal parking structure at one of the nation's busiest airports — a constant stream of travelers on the move.", audiencePerWeek: 21000, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 10, devices: 6, tags: ["Parking", "Travelers", "On the move"], imageUrl: "/locations/sky-harbor-parking-garage.jpg", lat: 33.4356, lng: -112.0080 },
  { slug: "tempe-hayden-ferry-garage", name: "Tempe Hayden Ferry Lakeside Garage", type: "Parking Garage", city: "Tempe", state: "AZ", description: "Tempe Town Lake district garage serving offices, dining, and waterfront events.", audiencePerWeek: 5200, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 15, devices: 2, tags: ["Parking", "Professionals", "All day"], imageUrl: "/locations/tempe-hayden-ferry-garage.jpg", lat: 33.4293, lng: -111.9410 },
  { slug: "asu-packard-garage", name: "ASU Packard Drive Parking Garage", type: "Parking Garage", city: "Tempe", state: "AZ", description: "Arizona State University garage with heavy student and staff foot traffic through the academic year.", audiencePerWeek: 9800, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 15, devices: 3, tags: ["Parking", "Students", "Daytime"], imageUrl: "/locations/asu-packard-garage.jpg", lat: 33.4242, lng: -111.9330 },
  { slug: "chandler-oregon-street-garage", name: "Chandler Oregon Street Parking Garage", type: "Parking Garage", city: "Chandler", state: "AZ", description: "Downtown Chandler garage serving the dining and small-business district.", audiencePerWeek: 4200, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 15, devices: 2, tags: ["Parking", "Downtown", "All day"], imageUrl: "/locations/chandler-oregon-street-garage.jpg", lat: 33.3062, lng: -111.8413 },
  { slug: "downtown-chandler-overstreet-garage", name: "Downtown Chandler Overstreet Garage", type: "Parking Garage", city: "Chandler", state: "AZ", description: "Overstreet development garage anchoring downtown Chandler's retail and dining core.", audiencePerWeek: 4600, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 15, devices: 2, tags: ["Parking", "Shoppers", "Downtown"], imageUrl: "/locations/downtown-chandler-overstreet-garage.jpg", lat: 33.3040, lng: -111.8420 },
  { slug: "gilbert-heritage-garage", name: "Gilbert Heritage District Parking Garage", type: "Parking Garage", city: "Gilbert", state: "AZ", description: "Garage serving Gilbert's Heritage District — a popular dining and nightlife destination with high dwell time.", audiencePerWeek: 5400, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 20, devices: 2, tags: ["Parking", "Nightlife", "Dwell time"], imageUrl: "/locations/gilbert-heritage-garage.jpg", lat: 33.3528, lng: -111.7890 },
  { slug: "gilbert-town-garage", name: "Gilbert Town Square Parking Garage", type: "Parking Garage", city: "Gilbert", state: "AZ", description: "Neighborhood garage serving Gilbert shopping and community traffic.", audiencePerWeek: 3800, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 15, devices: 2, tags: ["Parking", "Shoppers", "All day"], imageUrl: "/locations/gilbert-town-garage.jpg", lat: 33.3528, lng: -111.7920 },
  { slug: "luhrs-parking-garage", name: "Luhrs Downtown Phoenix Garage", type: "Parking Garage", city: "Phoenix", state: "AZ", description: "Historic downtown Phoenix garage serving offices, courts, and event traffic — commuters on the move.", audiencePerWeek: 6600, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 10, devices: 3, tags: ["Parking", "Commuters", "On the move"], imageUrl: "/locations/luhrs-parking-garage.jpg", lat: 33.4470, lng: -112.0740 },
  { slug: "peoria-sports-complex", name: "Peoria Sports Complex", type: "Sports Complex", city: "Peoria", state: "AZ", description: "Spring-training and events venue with large, captive crowds during games and tournaments.", audiencePerWeek: 9000, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 20, devices: 4, tags: ["Sports", "Events", "Captive"], imageUrl: "/locations/peoria-sports-complex.jpg", lat: 33.6303, lng: -112.2620 },
  { slug: "salt-river-fields", name: "Salt River Fields at Talking Stick", type: "Sports Complex", city: "Scottsdale", state: "AZ", description: "Premier spring-training ballpark with dense, captive audiences at concessions, concourses, and lots.", audiencePerWeek: 12000, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 30, devices: 5, tags: ["Sports", "Events", "Captive"], imageUrl: "/locations/salt-river-fields.jpg", lat: 33.5386, lng: -111.8880 },
  { slug: "tempe-diablo-stadium", name: "Tempe Diablo Stadium", type: "Sports Complex", city: "Tempe", state: "AZ", description: "Longtime spring-training stadium with event-day crowds moving through lots and concourses.", audiencePerWeek: 7000, pricePerWeek: 175, pricePerDay: 25, spots: 10, spotSeconds: 20, devices: 3, tags: ["Sports", "Events", "Weekend"], imageUrl: "/locations/tempe-diablo-stadium.jpg", lat: 33.3930, lng: -111.9530 },
];

export const LISTING_TYPES = Array.from(new Set(LISTINGS.map((l) => l.type))).sort();

export const getListing = (slug: string) => LISTINGS.find((l) => l.slug === slug);

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
