import { getDeviceByCode, getPlaylist, listAudio, liveStatus, recentActivity } from "@/lib/server/db";

export const runtime = "nodejs";

// GET /api/admin/devices/by-code/:deviceCode
// → { device, playback (with trigger), heartbeats, tracks (deployed spots) }
// 404 if the code isn't a real device (the Devices page then shows the demo view).
export async function GET(_req: Request, { params }: { params: Promise<{ deviceCode: string }> }) {
  const { deviceCode } = await params;
  const device = await getDeviceByCode(decodeURIComponent(deviceCode));
  if (!device) return Response.json({ error: "not found" }, { status: 404 });

  const activity = await recentActivity(device.id);

  // Resolve the deployed playlist into playable track refs for the test button.
  let tracks: { id: string; name: string }[] = [];
  if (activity.deployment?.playlistId) {
    const pl = await getPlaylist(activity.deployment.playlistId);
    if (pl?.trackIds?.length) {
      const all = await listAudio();
      tracks = pl.trackIds
        .map((tid) => all.find((a) => a.id === tid))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({ id: a.id, name: a.name }));
    }
  }

  return Response.json({
    device: { ...device, deviceToken: undefined, status: liveStatus(device) },
    playback: activity.playback,
    heartbeats: activity.heartbeats,
    tracks,
  });
}
