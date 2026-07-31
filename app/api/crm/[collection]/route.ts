import { isCrmCollection, listRecords, upsertRecords } from "@/lib/server/crm-db";

export const runtime = "nodejs";

// GET /api/crm/:collection → all records (array of entity objects)
export async function GET(_req: Request, { params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  if (!isCrmCollection(collection)) return Response.json({ error: "unknown collection" }, { status: 404 });
  try {
    return Response.json(await listRecords(collection));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/crm/:collection  — upsert one record (body = record) or many (body = { records: [...] })
export async function POST(req: Request, { params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  if (!isCrmCollection(collection)) return Response.json({ error: "unknown collection" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "invalid body" }, { status: 400 });
  const records = Array.isArray(body?.records) ? body.records : [body];
  try {
    await upsertRecords(collection, records);
    return Response.json({ ok: true, count: records.length });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
