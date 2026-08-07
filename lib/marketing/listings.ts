import "server-only";

import { getListingBySlug, listListings } from "@/lib/server/db";
import { getMediaConfig } from "@/lib/server/media-config";
import { getListing as getSample, LISTINGS as SAMPLES, type Listing } from "@/lib/marketing/marketplace";
import { stockForType } from "@/lib/stock-images";

// Resolve a listing's image: dashboard override → its own image → stock by type.
function withImage(l: Listing, overrides: Record<string, string>): Listing {
  return { ...l, imageUrl: overrides[l.slug] || l.imageUrl || stockForType(l.type) };
}

// Real published ad spaces (device groups). Falls back to curated samples so the
// marketplace is never empty while operators are still publishing listings.
export async function getAllListings(): Promise<{ listings: Listing[]; sample: boolean }> {
  const media = await getMediaConfig();
  let listings: Listing[] = SAMPLES;
  let sample = true;
  try {
    const real = await listListings();
    if (real.length > 0) { listings = real; sample = false; }
  } catch {
    /* db unavailable — show samples */
  }
  return { listings: listings.map((l) => withImage(l, media.listings)), sample };
}

export async function resolveListing(slug: string): Promise<Listing | null> {
  const media = await getMediaConfig();
  try {
    const real = await getListingBySlug(slug);
    if (real) return withImage(real, media.listings);
  } catch {
    /* fall through to samples */
  }
  const sample = getSample(slug);
  return sample ? withImage(sample, media.listings) : null;
}
