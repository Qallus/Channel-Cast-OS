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
};

export const LISTINGS: Listing[] = [
  { slug: "downtown-coffee-bar", name: "Downtown Coffee Bar", type: "Café", city: "Austin", state: "TX", description: "High-traffic specialty coffee bar in the heart of downtown. Steady morning and lunchtime crowds of professionals and students.", audiencePerWeek: 1200, pricePerWeek: 120, devices: 1, tags: ["Morning", "Professionals", "Food & drink"] },
  { slug: "riverside-fitness", name: "Riverside Fitness", type: "Gym", city: "Denver", state: "CO", description: "24/7 gym with a dedicated, health-focused membership. Great for wellness, nutrition, and lifestyle brands.", audiencePerWeek: 3400, pricePerWeek: 260, devices: 3, tags: ["Fitness", "Wellness", "All day"] },
  { slug: "market-street-salon", name: "Market Street Salon", type: "Salon", city: "Portland", state: "OR", description: "Upscale hair and beauty salon with long dwell times — ideal for beauty, fashion, and local services.", audiencePerWeek: 800, pricePerWeek: 90, devices: 1, tags: ["Beauty", "Dwell time", "Local"] },
  { slug: "harbor-brewery", name: "Harbor Brewery Taproom", type: "Bar", city: "San Diego", state: "CA", description: "Busy craft taproom with evening and weekend crowds. Perfect for events, food, and lifestyle spots.", audiencePerWeek: 2100, pricePerWeek: 200, devices: 2, tags: ["Evening", "Weekend", "Nightlife"] },
  { slug: "sunrise-laundromat", name: "Sunrise Laundromat", type: "Retail", city: "Chicago", state: "IL", description: "Neighborhood laundromat with high dwell time and repeat visitors. Cost-effective local reach.", audiencePerWeek: 950, pricePerWeek: 70, devices: 1, tags: ["Dwell time", "Local", "All day"] },
  { slug: "grand-auto-service", name: "Grand Auto Service", type: "Auto", city: "Phoenix", state: "AZ", description: "Auto service waiting room with a captive audience for 30–60 minutes. Ideal for finance, insurance, and local services.", audiencePerWeek: 640, pricePerWeek: 85, devices: 1, tags: ["Captive", "Services", "Weekday"] },
  { slug: "campus-bookstore", name: "Campus Bookstore", type: "Retail", city: "Ann Arbor", state: "MI", description: "University bookstore with heavy student foot traffic during the academic year.", audiencePerWeek: 2800, pricePerWeek: 180, devices: 2, tags: ["Students", "Daytime", "Seasonal"] },
  { slug: "lakeview-dental", name: "Lakeview Dental", type: "Clinic", city: "Minneapolis", state: "MN", description: "Family dental practice waiting room. Trusted environment for health, family, and local brands.", audiencePerWeek: 520, pricePerWeek: 75, devices: 1, tags: ["Family", "Health", "Captive"] },
  { slug: "central-transit-hub", name: "Central Transit Hub", type: "Transit", city: "Seattle", state: "WA", description: "Commuter transit hub with massive daily throughput across morning and evening rush.", audiencePerWeek: 9800, pricePerWeek: 520, devices: 4, tags: ["Commuters", "High volume", "Rush hour"] },
];

export const LISTING_TYPES = Array.from(new Set(LISTINGS.map((l) => l.type))).sort();

export const getListing = (slug: string) => LISTINGS.find((l) => l.slug === slug);

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
