import { requireUser, AuthError } from "@/lib/server/require-user";
import { deleteLead, loadLeadById, updateLeadStatus } from "@/lib/business-cards/store";
import type { LeadStatus } from "@/lib/business-cards/types";

export const runtime = "nodejs";

async function guard(id: string) {
  const user = await requireUser();
  const lead = await loadLeadById(id);
  if (!lead) throw new AuthError("Lead not found.", 404);
  if (!user.isAdmin && lead.owner_id !== user.id) throw new AuthError("Not your lead.", 403);
  return { user, lead };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await guard(id); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const body = (await request.json().catch(() => ({}))) as { status?: LeadStatus };
  if (!body.status) return Response.json({ error: "status is required." }, { status: 400 });
  await updateLeadStatus(id, body.status);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await guard(id); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }
  await deleteLead(id);
  return Response.json({ ok: true });
}
