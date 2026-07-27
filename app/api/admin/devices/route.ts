import { claimCode, deviceCode, genId, mutate, read, type StoredDevice } from "@/lib/server/store";

export const runtime = "nodejs";

const ABBR: Record<string, string> = {
  ai_vision: "AV",
  pir_motion: "MO",
  standard_audio: "SA",
  digital_display: "DD",
};

/** Derive live status from last heartbeat (online if seen in the last 60s). */
function withLiveStatus(d: StoredDevice) {
  let status = d.status;
  if (d.lastHeartbeatAt) {
    const ageMs = Date.now() - new Date(d.lastHeartbeatAt).getTime();
    status = ageMs < 60_000 ? "online" : "offline";
  }
  return { ...d, deviceToken: undefined, status };
}

// GET /api/admin/devices → list (tokens stripped)
export async function GET() {
  return Response.json(read((db) => db.devices.map(withLiveStatus)));
}

// POST /api/admin/devices  { name, type, model, ownerOrg, locationName } → device incl. claimCode
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || "standard_audio");

  const device: StoredDevice = {
    id: genId(),
    deviceCode: deviceCode(ABBR[type] || "SA"),
    claimCode: claimCode(),
    hardwareId: null,
    deviceToken: null,
    name: String(body.name || "New Device"),
    type,
    model: String(body.model || "Mini PC"),
    ownerOrg: String(body.ownerOrg || "Channel Cast"),
    locationName: body.locationName ? String(body.locationName) : null,
    status: "needs_setup",
    firmwareVersion: null,
    ip: null,
    volume: type === "digital_display" ? 100 : 80,
    lastHeartbeatAt: null,
    createdAt: new Date().toISOString(),
  };
  mutate((db) => db.devices.push(device));
  return Response.json(device);
}
