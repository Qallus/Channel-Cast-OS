import { deployAudioToSpace } from "@/lib/server/db";

export const runtime = "nodejs";

// POST /api/admin/spaces/deploy-audio  { spaceSlug, audioId }
// Deploys a spot to every device in the booked space (device group).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body?.spaceSlug || !body?.audioId) return Response.json({ error: "spaceSlug and audioId are required" }, { status: 400 });
  const res = await deployAudioToSpace(String(body.spaceSlug), String(body.audioId));
  if (res.notFound) return Response.json({ error: "space not found or has no devices" }, { status: 404 });
  return Response.json({ ok: true, devices: res.devices });
}
