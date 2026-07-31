import { deleteRecord, isCrmCollection, upsertRecords } from "@/lib/server/crm-db";

export const runtime = "nodejs";

// PATCH /api/crm/:collection/:id — upsert the full record (body = record)
export async function PATCH(req: Request, { params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params;
  if (!isCrmCollection(collection)) return Response.json({ error: "unknown collection" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "invalid body" }, { status: 400 });
  try {
    await upsertRecords(collection, [{ ...body, id }]);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/crm/:collection/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params;
  if (!isCrmCollection(collection)) return Response.json({ error: "unknown collection" }, { status: 404 });
  try {
    await deleteRecord(collection, id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
