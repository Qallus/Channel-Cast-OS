import { authDevice, unauthorized } from "@/lib/server/device-auth";
import { mutate } from "@/lib/server/store";

export const runtime = "nodejs";

// POST /api/devices/:hardwareId/playback  (Bearer deviceToken)
// { event: "start" | "complete", audioId?, trackName?, trigger? }
export async function POST(req: Request, { params }: { params: Promise<{ hardwareId: string }> }) {
  const device = authDevice(req);
  if (!device) return unauthorized();
  const { hardwareId } = await params;
  if (device.hardwareId !== hardwareId) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const event = body.event === "complete" ? "complete" : "start";

  mutate((db) => {
    db.playback.push({
      deviceId: device.id,
      ts: new Date().toISOString(),
      audioId: body.audioId ?? null,
      trackName: body.trackName ?? null,
      event,
      trigger: body.trigger || "scheduled_play",
    });
    if (db.playback.length > 500) db.playback.splice(0, db.playback.length - 500);
  });

  return Response.json({ ok: true });
}
