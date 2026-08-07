import type { Listing } from "@/lib/marketing/marketplace";

// Rich, per-listing marketing content shown on the listing page. Sensible
// defaults are derived from the listing; operators override any field from the
// dashboard (Media → Details). Rating/reviews are editable placeholders until a
// real advertiser-reviews system exists.

export type Feature = { label: string; detail?: string };

export type ListingContent = {
  headline: string;
  tagline: string;
  rating: number;
  reviewCount: number;
  favorite: boolean;
  features: Feature[];
};

export type ListingContentOverride = Partial<ListingContent>;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function defaultContent(l: Listing): ListingContent {
  const h = hash(l.slug);
  const rating = Math.round((4.6 + (h % 40) / 100) * 100) / 100; // 4.60–4.99
  const reviewCount = 40 + (h % 260); // 40–299
  const loc = [l.city, l.state].filter(Boolean).join(", ");
  const features: Feature[] = [
    { label: "Foot traffic", detail: `~${l.audiencePerWeek.toLocaleString("en-US")} people / week` },
    { label: "Audience & demographics", detail: l.tags.length ? l.tags.join(", ") : `${l.type} visitors` },
    { label: "Play windows", detail: "You choose the schedule and cooldowns" },
    { label: "Real-time reporting", detail: "Every play tracked and reported live" },
    { label: "Motion-activated playback", detail: "Plays only when someone is present" },
    { label: "Live feed video", detail: "Optional on-device camera view" },
    { label: "Verified reviews", detail: "Ratings from advertisers who ran here" },
    { label: "Property type", detail: l.type },
    { label: `${l.devices} ad ${l.devices === 1 ? "spot" : "spots"}`, detail: `Advertise across ${l.devices} device${l.devices === 1 ? "" : "s"} on this property` },
    { label: "Privacy-first sensing", detail: "On-device only — no images stored" },
    { label: "Daypart insights", detail: "Audience by morning / day / evening" },
    { label: "Local reach", detail: loc || "Local audience" },
  ];
  return {
    headline: `Reach a present audience at ${l.name}`,
    tagline: l.description ? `${l.description.split(". ")[0]}.` : `${l.type}${loc ? ` in ${loc}` : ""} — audio that plays when people are actually there.`,
    rating,
    reviewCount,
    favorite: h % 3 === 0,
    features,
  };
}

export function mergeContent(l: Listing, ov?: ListingContentOverride | null): ListingContent {
  const d = defaultContent(l);
  if (!ov) return d;
  return {
    headline: ov.headline || d.headline,
    tagline: ov.tagline || d.tagline,
    rating: typeof ov.rating === "number" ? ov.rating : d.rating,
    reviewCount: typeof ov.reviewCount === "number" ? ov.reviewCount : d.reviewCount,
    favorite: typeof ov.favorite === "boolean" ? ov.favorite : d.favorite,
    features: ov.features && ov.features.length ? ov.features : d.features,
  };
}
