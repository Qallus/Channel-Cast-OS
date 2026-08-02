import "server-only";

import { getListingBySlug, listListings } from "@/lib/server/db";
import { getListing as getSample, LISTINGS as SAMPLES, type Listing } from "@/lib/marketing/marketplace";

// Real published ad spaces (device groups). Falls back to curated samples so the
// marketplace is never empty while operators are still publishing listings.
export async function getAllListings(): Promise<{ listings: Listing[]; sample: boolean }> {
  try {
    const real = await listListings();
    if (real.length > 0) return { listings: real, sample: false };
  } catch {
    /* db unavailable — show samples */
  }
  return { listings: SAMPLES, sample: true };
}

export async function resolveListing(slug: string): Promise<Listing | null> {
  try {
    const real = await getListingBySlug(slug);
    if (real) return real;
  } catch {
    /* fall through to samples */
  }
  return getSample(slug) ?? null;
}
