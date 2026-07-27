import { authDevice, unauthorized } from "@/lib/server/device-auth";
import { read } from "@/lib/server/store";

export const runtime = "nodejs";

// GET /api/devices/:hardwareId/schedule  (Bearer deviceToken)
export async function GET(req: Request, { params }: { params: Promise<{ hardwareId: string }> }) {
  const device = authDevice(req);
  if (!device) return unauthorized();
  const { hardwareId } = await params;
  if (device.hardwareId !== hardwareId) return unauthorized();

  const schedule = read((db) => {
    const dep = db.deployments.find((d) => d.deviceId === device.id);
    if (!dep) return { version: 0, window: null, cooldownSec: 15, maxPerHour: 12, rotation: "sequential", tracks: [] };

    const playlist = db.playlists.find((p) => p.id === dep.playlistId);
    const tracks = (playlist?.trackIds ?? [])
      .map((id) => db.audio.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({ id: a.id, name: a.name, url: `/api/audio/${a.id}/file` }));

    return {
      version: dep.version,
      window: dep.window,
      cooldownSec: dep.cooldownSec,
      maxPerHour: dep.maxPerHour,
      rotation: dep.rotation,
      playlist: playlist ? { id: playlist.id, name: playlist.name } : null,
      tracks,
    };
  });

  return Response.json(schedule);
}
