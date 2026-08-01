import { deleteGroup, updateGroup } from "@/lib/server/db";

export const runtime = "nodejs";

// PATCH /api/admin/device-groups/:id  { name?, description?, imageUrl? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: { name?: string; description?: string | null; imageUrl?: string | null } = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if ("description" in body) patch.description = body.description ?? null;
  if ("imageUrl" in body) patch.imageUrl = body.imageUrl ?? null;
  const group = await updateGroup(id, patch);
  if (!group) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(group);
}

// DELETE /api/admin/device-groups/:id — members become ungrouped.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteGroup(id);
  return Response.json({ ok: true });
}
