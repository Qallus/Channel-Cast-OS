import { requireUser, AuthError } from "@/lib/server/require-user";
import { createDevice, listDevices, liveStatus } from "@/lib/server/db";

export const runtime = "nodejs";

// Middleware only guards pages — /api is excluded from its matcher — so every
// admin route has to check for itself. This one hands out claim codes and, for
// screens, the device token that is the player's whole credential.
async function guard(): Promise<Response | null> {
  try { await requireUser(); return null; }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }
}

// GET /api/admin/devices → list (tokens stripped, live status)
export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  const devices = await listDevices();
  return Response.json(devices.map((d) => ({ ...d, deviceToken: undefined, status: liveStatus(d) })));
}

// POST /api/admin/devices  { name, type, model, ownerOrg, locationName } → device incl. claimCode
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;

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
