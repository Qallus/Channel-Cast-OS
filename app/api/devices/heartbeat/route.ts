import { authDevice, clientIp, unauthorized } from "@/lib/server/device-auth";
import { mutate } from "@/lib/server/store";

export const runtime = "nodejs";

// POST /api/devices/heartbeat  (Bearer deviceToken)
// { status?, firmwareVersion?, volume? }
export async function POST(req: Request) {
  const device = authDevice(req);
  if (!device) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const ip = clientIp(req);

  const result = mutate((db) => {
    const d = db.devices.find((x) => x.id === device.id)!;
    d.status = "online";
    d.lastHeartbeatAt = new Date().toISOString();
    if (typeof body.firmwareVersion === "string") d.firmwareVersion = body.firmwareVersion;
    if (typeof body.volume === "number") d.volume = body.volume;
    d.ip = ip;

    db.heartbeats.push({
      deviceId: d.id,
      ts: d.lastHeartbeatAt,
      status: body.status || "online",
      firmwareVersion: d.firmwareVersion,
      ip,
      volume: d.volume,
    });
    if (db.heartbeats.length > 500) db.heartbeats.splice(0, db.heartbeats.length - 500);

    // Deliver + dequeue any pending commands for this device.
    const commands = db.commands.filter((c) => c.deviceId === d.id);
    db.commands = db.commands.filter((c) => c.deviceId !== d.id);

    const dep = db.deployments.find((x) => x.deviceId === d.id);
    return { version: dep?.version ?? 0, commands };
  });

  return Response.json({ ok: true, scheduleVersion: result.version, commands: result.commands });
}
