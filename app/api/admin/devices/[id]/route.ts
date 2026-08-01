import { deleteDevice, getDeviceById } from "@/lib/server/db";

export const runtime = "nodejs";

// DELETE /api/admin/devices/:id — remove a device and its activity.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = await getDeviceById(id);
  if (!device) return Response.json({ error: "not found" }, { status: 404 });
  await deleteDevice(id);
  return Response.json({ ok: true });
}
