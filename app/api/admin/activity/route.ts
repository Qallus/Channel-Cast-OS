import { read } from "@/lib/server/store";

export const runtime = "nodejs";

// GET /api/admin/activity?deviceId=...  → recent heartbeats + playback for a device
export async function GET(req: Request) {
  const deviceId = new URL(req.url).searchParams.get("deviceId");
  if (!deviceId) return Response.json({ error: "deviceId required" }, { status: 400 });

  return Response.json(
    read((db) => ({
      heartbeats: db.heartbeats.filter((h) => h.deviceId === deviceId).slice(-20).reverse(),
      playback: db.playback.filter((p) => p.deviceId === deviceId).slice(-20).reverse(),
      deployment: db.deployments.find((d) => d.deviceId === deviceId) ?? null,
    })),
  );
}
