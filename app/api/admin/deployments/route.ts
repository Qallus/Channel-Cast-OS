import { getDeviceById, getPlaylist, upsertDeployment } from "@/lib/server/db";

export const runtime = "nodejs";

// POST /api/admin/deployments
// { deviceId, playlistId, window?, cooldownSec?, maxPerHour?, rotation? }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body?.deviceId || !body?.playlistId) {
    return Response.json({ error: "deviceId and playlistId are required" }, { status: 400 });
  }

  const [device, playlist] = await Promise.all([getDeviceById(String(body.deviceId)), getPlaylist(String(body.playlistId))]);
  if (!device || !playlist) return Response.json({ error: "device or playlist not found" }, { status: 404 });

  const dep = await upsertDeployment({
    deviceId: String(body.deviceId),
    playlistId: String(body.playlistId),
    window: body.window,
    cooldownSec: body.cooldownSec != null ? Number(body.cooldownSec) : undefined,
    maxPerHour: body.maxPerHour != null ? Number(body.maxPerHour) : undefined,
    rotation: body.rotation,
  });
  return Response.json(dep);
}
