import { listRecords, upsertRecords } from "@/lib/server/crm-db";

// Dashboard-managed image overrides. `listings` maps a marketplace listing slug
// to an image URL; `slots` maps a named marketing slot (e.g. "placement-lifestyle")
// to an image URL. Stored as one row (id "media") in the settings collection.
export type MediaConfig = {
  listings: Record<string, string>;
  slots: Record<string, string>;
};

const EMPTY: MediaConfig = { listings: {}, slots: {} };

export async function getMediaConfig(): Promise<MediaConfig> {
  try {
    const rows = await listRecords("settings");
    const rec = rows.find((r) => r.id === "media") as (MediaConfig & { id: string }) | undefined;
    if (!rec) return EMPTY;
    return {
      listings: rec.listings && typeof rec.listings === "object" ? rec.listings : {},
      slots: rec.slots && typeof rec.slots === "object" ? rec.slots : {},
    };
  } catch {
    return EMPTY;
  }
}

// Replaces whichever top-level map is provided (dropping empty values). The
// manager always posts the full override maps, so replacement reflects resets.
export async function setMediaConfig(patch: Partial<MediaConfig>): Promise<MediaConfig> {
  const cur = await getMediaConfig();
  const clean = (m?: Record<string, string>) => Object.fromEntries(Object.entries(m ?? {}).filter(([, v]) => v).map(([k, v]) => [k, String(v)]));
  const next: MediaConfig = {
    listings: patch.listings !== undefined ? clean(patch.listings) : cur.listings,
    slots: patch.slots !== undefined ? clean(patch.slots) : cur.slots,
  };
  await upsertRecords("settings", [{ id: "media", ...next }]);
  return next;
}
