import { recentActivity } from "@/lib/server/db";

export const runtime = "nodejs";

// GET /api/admin/activity?deviceId=...  → recent heartbeats + playback + deployment
export async function GET(req: Request) {
  const deviceId = new URL(req.url).searchParams.get("deviceId");
  if (!deviceId) return Response.json({ error: "deviceId required" }, { status: 400 });
  return Response.json(await recentActivity(deviceId));
}
