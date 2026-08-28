import { clientIp } from "@/lib/server/device-auth";
import { findDeviceByClaim, token, updateDevice } from "@/lib/server/db";

export const runtime = "nodejs";

// POST /api/devices/register  { hardwareId, deviceType, model, firmwareVersion, registrationCode }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.registrationCode || !body?.hardwareId) {
    return Response.json({ error: "registrationCode and hardwareId are required" }, { status: 400 });
  }

  const device = await findDeviceByClaim(String(body.registrationCode));
  if (!device) return Response.json({ error: "invalid or already-used registration code" }, { status: 404 });

  // Screens are handed their player URL by the setup wizard before the hardware
  // exists, so a display already has a token. Minting a new one here would
  // silently invalidate every URL already copied, printed, or bookmarked.
  const deviceToken = device.deviceToken || token();
  await updateDevice(device.id, {
    hardwareId: String(body.hardwareId),
    deviceToken,
    claimCode: null,
    status: "registered",
    model: body.model || device.model,
    firmwareVersion: body.firmwareVersion || device.firmwareVersion,
    ip: clientIp(req),
  });

  return Response.json({
    deviceId: device.id,
    deviceToken,
    hardwareId: String(body.hardwareId),
    status: "registered",
    name: device.name,
    volume: device.volume,
  });
}
