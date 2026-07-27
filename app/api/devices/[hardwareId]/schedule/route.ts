import { authDevice, unauthorized } from "@/lib/server/device-auth";
import { getAudio, getDeployment, getPlaylist } from "@/lib/server/db";

export const runtime = "nodejs";

// GET /api/devices/:hardwareId/schedule  (Bearer deviceToken)
export async function GET(req: Request, { params }: { params: Promise<{ hardwareId: string }> }) {
  const device = await authDevice(req);
  if (!device) return unauthorized();
  const { hardwareId } = await params;
  if (device.hardwareId !== hardwareId) return unauthorized();

  const dep = await getDeployment(device.id);
  if (!dep) return Response.json({ version: 0, window: null, cooldownSec: 15, maxPerHour: 12, rotation: "sequential", tracks: [] });

  const playlist = await getPlaylist(dep.playlistId);
  const tracks: { id: string; name: string; url: string }[] = [];
  for (const id of playlist?.trackIds ?? []) {
    const a = await getAudio(id);
    if (a) tracks.push({ id: a.id, name: a.name, url: `/api/audio/${a.id}/file` });
  }

  return Response.json({
    version: dep.version,
    window: dep.window,
    cooldownSec: dep.cooldownSec,
    maxPerHour: dep.maxPerHour,
    rotation: dep.rotation,
    playlist: playlist ? { id: playlist.id, name: playlist.name } : null,
    tracks,
  });
}
