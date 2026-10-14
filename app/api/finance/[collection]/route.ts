import { isFinanceCollection } from "@/lib/finance/types";
import { deleteFinance, financeUser, listFinance, upsertFinance } from "@/lib/server/finance-db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ collection: string }> };

// GET /api/finance/:collection → the signed-in admin's records
export async function GET(_req: Request, { params }: Ctx) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const { collection } = await params;
  if (!isFinanceCollection(collection)) return Response.json({ error: "unknown collection" }, { status: 404 });
  try {
    return Response.json(await listFinance(collection, user.id));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/finance/:collection — upsert one record (body = record) or many ({ records })
export async function POST(req: Request, { params }: Ctx) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const { collection } = await params;
  if (!isFinanceCollection(collection)) return Response.json({ error: "unknown collection" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "invalid body" }, { status: 400 });
  const records = Array.isArray(body.records) ? body.records : [body];
  if (records.length > 5000) return Response.json({ error: "Import at most 5,000 rows at a time." }, { status: 413 });
  try {
    const count = await upsertFinance(collection, user.id, records);
    return Response.json({ ok: true, count });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/finance/:collection { ids } — bulk delete
export async function DELETE(req: Request, { params }: Ctx) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const { collection } = await params;
  if (!isFinanceCollection(collection)) return Response.json({ error: "unknown collection" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === "string") : [];
  try {
    await deleteFinance(collection, user.id, ids);
    return Response.json({ ok: true, count: ids.length });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
