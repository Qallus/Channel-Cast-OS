import { listRecords, upsertRecords } from "@/lib/server/crm-db";

// Server-persisted config for the public placement qualification form.
// Stored as a single row (id "placement") in the JSONB settings collection.
export type PlacementConfig = {
  minDailyVisitors: number; // minimum daily foot traffic to qualify for FREE placement
  updatedAt?: string;
};

export const DEFAULT_PLACEMENT_CONFIG: PlacementConfig = { minDailyVisitors: 1000 };

export async function getPlacementConfig(): Promise<PlacementConfig> {
  try {
    const rows = await listRecords("settings");
    const rec = rows.find((r) => r.id === "placement") as (PlacementConfig & { id: string }) | undefined;
    if (!rec) return DEFAULT_PLACEMENT_CONFIG;
    const n = Number(rec.minDailyVisitors);
    return { minDailyVisitors: Number.isFinite(n) && n >= 0 ? n : DEFAULT_PLACEMENT_CONFIG.minDailyVisitors, updatedAt: rec.updatedAt };
  } catch {
    return DEFAULT_PLACEMENT_CONFIG;
  }
}

export async function setPlacementConfig(patch: Partial<PlacementConfig>): Promise<PlacementConfig> {
  const cur = await getPlacementConfig();
  const raw = Number(patch.minDailyVisitors ?? cur.minDailyVisitors);
  const next: PlacementConfig = {
    minDailyVisitors: Math.max(0, Math.round(Number.isFinite(raw) ? raw : cur.minDailyVisitors)),
    updatedAt: new Date().toISOString(),
  };
  await upsertRecords("settings", [{ id: "placement", ...next }]);
  return next;
}
