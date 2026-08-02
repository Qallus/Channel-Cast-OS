import { deleteAudience, updateAudience } from "@/lib/server/db";

export const runtime = "nodejs";

// PATCH /api/admin/devices/:id/audiences/:audienceId
export async function PATCH(req: Request, { params }: { params: Promise<{ audienceId: string }> }) {
  const { audienceId } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Parameters<typeof updateAudience>[1] = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (body.countMin !== undefined) patch.countMin = Number(body.countMin);
  if ("countMax" in body) patch.countMax = body.countMax === null || body.countMax === "" ? null : Number(body.countMax);
  if (body.priority !== undefined) patch.priority = Number(body.priority);
  if (Array.isArray(body.trackIds)) patch.trackIds = body.trackIds;
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  const a = await updateAudience(audienceId, patch);
  if (!a) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(a);
}

// DELETE /api/admin/devices/:id/audiences/:audienceId
export async function DELETE(_req: Request, { params }: { params: Promise<{ audienceId: string }> }) {
  const { audienceId } = await params;
  await deleteAudience(audienceId);
  return Response.json({ ok: true });
}
