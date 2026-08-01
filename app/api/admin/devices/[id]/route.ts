import { deleteDevice, getDeviceById, updateDevice } from "@/lib/server/db";

export const runtime = "nodejs";

// PATCH /api/admin/devices/:id  { groupId?, name?, locationName? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = await getDeviceById(id);
  if (!device) return Response.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if ("groupId" in body) patch.groupId = body.groupId || null;
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if ("locationName" in body) patch.locationName = body.locationName || null;
  if ("latitude" in body) patch.latitude = body.latitude === null || body.latitude === "" ? null : Number(body.latitude);
  if ("longitude" in body) patch.longitude = body.longitude === null || body.longitude === "" ? null : Number(body.longitude);
  if (Object.keys(patch).length === 0) return Response.json({ error: "nothing to update" }, { status: 400 });

  const updated = await updateDevice(id, patch);
  return Response.json({ ...updated, deviceToken: undefined });
}

// DELETE /api/admin/devices/:id — remove a device and its activity.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = await getDeviceById(id);
  if (!device) return Response.json({ error: "not found" }, { status: 404 });
  await deleteDevice(id);
  return Response.json({ ok: true });
}
