import { mutate, type Deployment } from "@/lib/server/store";

export const runtime = "nodejs";

// POST /api/admin/deployments
// { deviceId, playlistId, window?, cooldownSec?, maxPerHour?, rotation? }
// Upserts the device's active deployment and bumps its schedule version.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body?.deviceId || !body?.playlistId) {
    return Response.json({ error: "deviceId and playlistId are required" }, { status: 400 });
  }

  const result = mutate((db) => {
    const device = db.devices.find((d) => d.id === body.deviceId);
    const playlist = db.playlists.find((p) => p.id === body.playlistId);
    if (!device || !playlist) return { error: "device or playlist not found" as const };

    const existing = db.deployments.find((d) => d.deviceId === body.deviceId);
    const dep: Deployment = {
      deviceId: body.deviceId,
      playlistId: body.playlistId,
      window: body.window ?? { start: "00:00", end: "23:59", days: [0, 1, 2, 3, 4, 5, 6] },
      cooldownSec: Number(body.cooldownSec ?? 15),
      maxPerHour: Number(body.maxPerHour ?? 12),
      rotation: body.rotation === "shuffle" ? "shuffle" : "sequential",
      version: (existing?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, dep);
    else db.deployments.push(dep);
    return dep;
  });

  if ("error" in result) return Response.json(result, { status: 404 });
  return Response.json(result);
}
