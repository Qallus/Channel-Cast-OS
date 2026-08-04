import { getPlacementConfig, setPlacementConfig } from "@/lib/server/placement-config";

export const runtime = "nodejs";

// GET  /api/admin/placement-config           → current config
// PATCH /api/admin/placement-config { minDailyVisitors } → update
export async function GET() {
  return Response.json(await getPlacementConfig());
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const n = Number((body as { minDailyVisitors?: unknown }).minDailyVisitors);
  if (!Number.isFinite(n) || n < 0) return Response.json({ error: "minDailyVisitors must be a non-negative number" }, { status: 400 });
  const cfg = await setPlacementConfig({ minDailyVisitors: n });
  return Response.json(cfg);
}
