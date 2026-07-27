import { authDevice, unauthorized } from "@/lib/server/device-auth";
import { addPlayback } from "@/lib/server/db";

export const runtime = "nodejs";

// POST /api/devices/:hardwareId/playback  (Bearer deviceToken)
// { event: "start" | "complete", audioId?, trackName?, trigger? }
export async function POST(req: Request, { params }: { params: Promise<{ hardwareId: string }> }) {
  const device = await authDevice(req);
  if (!device) return unauthorized();
  const { hardwareId } = await params;
  if (device.hardwareId !== hardwareId) return unauthorized();

  const body = await req.json().catch(() => ({}));
  await addPlayback({
    deviceId: device.id,
    audioId: body.audioId ?? null,
    trackName: body.trackName ?? null,
    event: body.event === "complete" ? "complete" : "start",
    trigger: body.trigger || "scheduled_play",
  });

  return Response.json({ ok: true });
}
