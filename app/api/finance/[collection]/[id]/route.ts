import { isFinanceCollection } from "@/lib/finance/types";
import { deleteFinance, financeUser, upsertFinance } from "@/lib/server/finance-db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ collection: string; id: string }> };

// PATCH /api/finance/:collection/:id — upsert the full record
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const { collection, id } = await params;
  if (!isFinanceCollection(collection)) return Response.json({ error: "unknown collection" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "invalid body" }, { status: 400 });
  try {
    await upsertFinance(collection, user.id, [{ ...body, id }]);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const { collection, id } = await params;
  if (!isFinanceCollection(collection)) return Response.json({ error: "unknown collection" }, { status: 404 });
  try {
    await deleteFinance(collection, user.id, [id]);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
