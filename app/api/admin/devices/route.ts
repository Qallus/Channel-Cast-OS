import { createDevice, listDevices, liveStatus } from "@/lib/server/db";

export const runtime = "nodejs";

// GET /api/admin/devices → list (tokens stripped, live status)
export async function GET() {
  const devices = await listDevices();
  return Response.json(devices.map((d) => ({ ...d, deviceToken: undefined, status: liveStatus(d) })));
}

// POST /api/admin/devices  { name, type, model, ownerOrg, locationName } → device incl. claimCode
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const device = await createDevice({
    name: String(body.name || "New Device"),
    type: body.type ? String(body.type) : undefined,
    model: body.model ? String(body.model) : undefined,
    ownerOrg: body.ownerOrg ? String(body.ownerOrg) : undefined,
    locationName: body.locationName ? String(body.locationName) : null,
  });
  return Response.json(device);
}
