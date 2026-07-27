import { deleteAudio, updateAudio } from "@/lib/server/db";

export const runtime = "nodejs";

// PATCH /api/admin/audio/:id  { name?, archived? } — rename / archive.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: { name?: string; archived?: boolean } = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.archived === "boolean") patch.archived = body.archived;

  const rec = await updateAudio(id, patch);
  if (!rec) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(rec);
}

// DELETE /api/admin/audio/:id — remove the record and its file.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteAudio(id);
  if (!ok) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ ok: true });
}
