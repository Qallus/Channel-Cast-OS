import { authDevice, unauthorized } from "@/lib/server/device-auth";
import { listAudio, listAudiences } from "@/lib/server/db";

export const runtime = "nodejs";

// GET /api/devices/:hardwareId/audiences  (Bearer deviceToken)
// → { visionEnabled, audiences: [{ name, countMin, countMax, priority, tracks:[{id,name,url}] }] }
// The agent pulls this to map a detected person-count to a content set.
export async function GET(req: Request, { params }: { params: Promise<{ hardwareId: string }> }) {
  const device = await authDevice(req);
  if (!device) return unauthorized();
  const { hardwareId } = await params;
  if (device.hardwareId !== hardwareId) return unauthorized();

  const [audiences, all] = await Promise.all([listAudiences(device.id), listAudio()]);
  const withTracks = audiences
    .filter((a) => a.enabled)
    .map((a) => ({
      name: a.name,
      countMin: a.countMin,
      countMax: a.countMax,
      priority: a.priority,
      tracks: a.trackIds
        .map((tid) => all.find((x) => x.id === tid))
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .map((x) => ({ id: x.id, name: x.name, url: `/api/audio/${x.id}/file` })),
    }));

  return Response.json({ visionEnabled: device.visionEnabled, audiences: withTracks });
}
