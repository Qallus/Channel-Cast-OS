import { requireUser, AuthError } from "@/lib/server/require-user";
import { deleteCard, loadCardById, loadOwnerOptions, reassignCard, setCardStatus } from "@/lib/business-cards/store";
import type { CardStatus } from "@/lib/business-cards/types";

export const runtime = "nodejs";

async function guard(request: Request, id: string) {
  const user = await requireUser();
  const card = await loadCardById(id);
  if (!card) throw new AuthError("Card not found.", 404);
  if (!user.isAdmin && card.owner_id !== user.id) throw new AuthError("You can only manage your own card.", 403);
  return { user, card };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { ({ user } = await guard(request, id)); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const body = (await request.json().catch(() => ({}))) as { status?: CardStatus; ownerId?: string | null };

  try {
    if (body.status) {
      const card = await setCardStatus(id, body.status);
      return Response.json({ card });
    }
    if (body.ownerId !== undefined) {
      if (!user.isAdmin) return Response.json({ error: "Only admins can reassign cards." }, { status: 403 });
      const owners = await loadOwnerOptions();
      const owner = body.ownerId ? owners.find((o) => o.id === body.ownerId) ?? null : null;
      const card = await reassignCard(id, owner);
      return Response.json({ card });
    }
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Update failed." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await guard(request, id); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  try {
    await deleteCard(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Delete failed." }, { status: 400 });
  }
}
