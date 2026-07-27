import { authDevice, clientIp, unauthorized } from "@/lib/server/device-auth";
import { addHeartbeat, getDeployment, takeCommands, updateDevice } from "@/lib/server/db";

export const runtime = "nodejs";

// POST /api/devices/heartbeat  (Bearer deviceToken)  { status?, firmwareVersion?, volume? }
export async function POST(req: Request) {
  const device = await authDevice(req);
  if (!device) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const ip = clientIp(req);
  const firmwareVersion = typeof body.firmwareVersion === "string" ? body.firmwareVersion : device.firmwareVersion;
  const volume = typeof body.volume === "number" ? body.volume : device.volume;

  await updateDevice(device.id, { status: "online", lastHeartbeatAt: new Date().toISOString(), firmwareVersion, volume, ip });
  await addHeartbeat({ deviceId: device.id, status: body.status || "online", firmwareVersion, ip, volume });

  const [dep, commands] = await Promise.all([getDeployment(device.id), takeCommands(device.id)]);
  return Response.json({ ok: true, scheduleVersion: dep?.version ?? 0, commands });
}
