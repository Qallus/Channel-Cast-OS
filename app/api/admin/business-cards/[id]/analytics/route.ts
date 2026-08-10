import { requireUser, AuthError } from "@/lib/server/require-user";
import { loadCardAnalytics, loadCardById } from "@/lib/business-cards/store";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const card = await loadCardById(id);
  if (!card) return Response.json({ error: "Card not found." }, { status: 404 });
  if (!user.isAdmin && card.owner_id !== user.id) return Response.json({ error: "Not your card." }, { status: 403 });

  const range = Number(new URL(request.url).searchParams.get("range") || "30");
  const rangeDays = [7, 30, 90].includes(range) ? range : 30;
  try {
    const analytics = await loadCardAnalytics(id, rangeDays);
    return Response.json({ analytics });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load analytics." }, { status: 500 });
  }
}
