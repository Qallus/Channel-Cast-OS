// Royalty-free stock photo library (Unsplash License — free commercial use, no
// attribution required). Files live in /public/stock. Used as marketplace and
// marketing imagery; operators can override any of these from the dashboard.

export type StockImage = { id: string; src: string; label: string };

export const STOCK_IMAGES: StockImage[] = [
  { id: "cafe", src: "/stock/cafe.jpg", label: "Café" },
  { id: "restaurant", src: "/stock/restaurant.jpg", label: "Restaurant" },
  { id: "gym", src: "/stock/gym.jpg", label: "Gym / Fitness" },
  { id: "retail", src: "/stock/retail.jpg", label: "Retail store" },
  { id: "bar", src: "/stock/bar.jpg", label: "Bar / Taproom" },
  { id: "salon", src: "/stock/salon.jpg", label: "Salon / Spa" },
  { id: "hotel", src: "/stock/hotel.jpg", label: "Hotel / Pool" },
  { id: "parking", src: "/stock/parking.jpg", label: "Parking garage" },
  { id: "office", src: "/stock/office.jpg", label: "Office / Coworking" },
  { id: "clinic", src: "/stock/clinic.jpg", label: "Clinic / Waiting room" },
  { id: "transit", src: "/stock/transit.jpg", label: "Transit" },
  { id: "auto", src: "/stock/auto.jpg", label: "Auto service" },
];

// Keyword → stock id, matched against a listing's type/space type.
const TYPE_MAP: [string, string][] = [
  ["coffee", "cafe"], ["café", "cafe"], ["cafe", "cafe"],
  ["restaurant", "restaurant"], ["food", "restaurant"], ["diner", "restaurant"],
  ["gym", "gym"], ["fitness", "gym"], ["studio", "gym"],
  ["salon", "salon"], ["spa", "salon"], ["beauty", "salon"],
  ["bar", "bar"], ["taproom", "bar"], ["brewery", "bar"], ["night", "bar"], ["pub", "bar"],
  ["hotel", "hotel"], ["hospitality", "hotel"], ["pool", "hotel"], ["resort", "hotel"],
  ["parking", "parking"], ["garage", "parking"],
  // Big-box, grocery, malls → retail. Keep gas/fuel before "station" (transit) so
  // "Gas Station" resolves to a retail/convenience image, not a transit hub.
  ["gas", "retail"], ["fuel", "retail"], ["mall", "retail"], ["walmart", "retail"],
  ["grocery", "retail"], ["supermarket", "retail"], ["market", "retail"], ["fry", "retail"],
  // High-traffic public venues → transit (crowds). Airport is a natural fit.
  ["airport", "transit"], ["arena", "transit"], ["stadium", "transit"], ["sport", "transit"],
  ["event", "transit"], ["venue", "transit"], ["convention", "transit"],
  ["office", "office"], ["cowork", "office"],
  ["clinic", "clinic"], ["medical", "clinic"], ["dental", "clinic"], ["waiting", "clinic"], ["health", "clinic"],
  ["transit", "transit"], ["commut", "transit"], ["station", "transit"],
  ["auto", "auto"], ["car", "auto"], ["vehicle", "auto"],
  ["retail", "retail"], ["store", "retail"], ["shop", "retail"], ["convenience", "retail"], ["gas", "retail"], ["laundr", "retail"], ["book", "retail"],
];

// Best-matching stock image src for a listing/space type (retail is the default).
export function stockForType(type?: string | null): string {
  const t = (type || "").toLowerCase();
  for (const [key, id] of TYPE_MAP) if (t.includes(key)) return `/stock/${id}.jpg`;
  return "/stock/retail.jpg";
}

export function stockSrcById(id?: string | null): string | null {
  return STOCK_IMAGES.find((s) => s.id === id)?.src ?? null;
}

// Named marketing image slots that operators can set from the dashboard.
export const SITE_SLOTS: { key: string; label: string; defaultId: string }[] = [
  { key: "placement-lifestyle", label: "Placement page — lifestyle photo", defaultId: "cafe" },
  { key: "businesses-lifestyle", label: "Businesses page — lifestyle photo", defaultId: "retail" },
];

export function siteSlotDefault(key: string): string {
  const slot = SITE_SLOTS.find((s) => s.key === key);
  return stockSrcById(slot?.defaultId ?? "retail") ?? "/stock/retail.jpg";
}
