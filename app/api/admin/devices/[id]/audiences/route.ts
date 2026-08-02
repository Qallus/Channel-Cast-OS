import { createAudience, getDeviceById, listAudiences } from "@/lib/server/db";

export const runtime = "nodejs";

// GET /api/admin/devices/:id/audiences → list
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json(await listAudiences(id));
}

// POST /api/admin/devices/:id/audiences  { name, countMin, countMax, priority, trackIds }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = await getDeviceById(id);
  if (!device) return Response.json({ error: "device not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (!body?.name?.trim()) return Response.json({ error: "name is required" }, { status: 400 });
  const a = await createAudience({
    deviceId: id,
    name: String(body.name).trim(),
    countMin: Number(body.countMin ?? 1),
    countMax: body.countMax === null || body.countMax === "" || body.countMax === undefined ? null : Number(body.countMax),
    priority: Number(body.priority ?? 0),
    trackIds: Array.isArray(body.trackIds) ? body.trackIds : [],
  });
  return Response.json(a);
}
