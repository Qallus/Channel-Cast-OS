import { clientIp } from "@/lib/server/device-auth";
import { mutate, token } from "@/lib/server/store";

export const runtime = "nodejs";

// POST /api/devices/register
// { hardwareId, deviceType, model, firmwareVersion, registrationCode }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.registrationCode || !body?.hardwareId) {
    return Response.json({ error: "registrationCode and hardwareId are required" }, { status: 400 });
  }

  const result = mutate((db) => {
    const device = db.devices.find(
      (d) => d.claimCode && d.claimCode.toUpperCase() === String(body.registrationCode).toUpperCase(),
    );
    if (!device) return { error: "invalid or already-used registration code" as const };

    device.hardwareId = String(body.hardwareId);
    device.deviceToken = token();
    device.claimCode = null; // consume one-time code
    device.status = "registered";
    device.model = body.model || device.model;
    device.firmwareVersion = body.firmwareVersion || device.firmwareVersion;
    device.ip = clientIp(req);

    return {
      deviceId: device.id,
      deviceToken: device.deviceToken,
      hardwareId: device.hardwareId,
      status: device.status,
      name: device.name,
      volume: device.volume,
    };
  });

  if ("error" in result) return Response.json(result, { status: 404 });
  return Response.json(result);
}
