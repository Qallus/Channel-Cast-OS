import { listRecords, upsertRecords } from "@/lib/server/crm-db";
import type { ListingContentOverride } from "@/lib/marketing/listing-content";

// Per-listing content overrides keyed by slug. Stored as one row (id
// "listing-content") in the settings collection.
export type ListingContentMap = Record<string, ListingContentOverride>;

export async function getListingContentMap(): Promise<ListingContentMap> {
  try {
    const rows = await listRecords("settings");
    const rec = rows.find((r) => r.id === "listing-content") as { content?: ListingContentMap } | undefined;
    return rec?.content && typeof rec.content === "object" ? rec.content : {};
  } catch {
    return {};
  }
}

export async function setListingContentMap(map: ListingContentMap): Promise<ListingContentMap> {
  const clean: ListingContentMap = {};
  for (const [slug, ov] of Object.entries(map || {})) {
    if (ov && typeof ov === "object") clean[slug] = ov;
  }
  await upsertRecords("settings", [{ id: "listing-content", content: clean }]);
  return clean;
}
