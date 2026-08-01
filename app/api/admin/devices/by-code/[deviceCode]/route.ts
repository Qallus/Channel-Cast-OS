import { getDeviceByCode, liveStatus, recentActivity } from "@/lib/server/db";

export const runtime = "nodejs";

// GET /api/admin/devices/by-code/:deviceCode
// → { device (token stripped, live status), playback (with trigger), heartbeats }
// 404 if the code isn't a real device (the Devices page then shows the demo view).
export async function GET(_req: Request, { params }: { params: Promise<{ deviceCode: string }> }) {
  const { deviceCode } = await params;
  const device = await getDeviceByCode(decodeURIComponent(deviceCode));
  if (!device) return Response.json({ error: "not found" }, { status: 404 });

  const activity = await recentActivity(device.id);
  return Response.json({
    device: { ...device, deviceToken: undefined, status: liveStatus(device) },
    playback: activity.playback,
    heartbeats: activity.heartbeats,
  });
}
