import { createGroup, listGroups } from "@/lib/server/db";

export const runtime = "nodejs";

// GET /api/admin/device-groups → list
export async function GET() {
  return Response.json(await listGroups());
}

// POST /api/admin/device-groups  { name, description?, imageUrl? }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body?.name?.trim()) return Response.json({ error: "name is required" }, { status: 400 });
  const group = await createGroup({ name: String(body.name).trim(), description: body.description ?? null, imageUrl: body.imageUrl ?? null });
  return Response.json(group);
}
