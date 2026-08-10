import { requireUser, AuthError } from "@/lib/server/require-user";
import { computeStats, loadCardsForViewer, loadOwnerOptions, saveCard } from "@/lib/business-cards/store";
import type { SaveCardPayload } from "@/lib/business-cards/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let user;
  try { user = await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const all = user.isAdmin && new URL(request.url).searchParams.get("scope") === "all";
  try {
    const cards = await loadCardsForViewer({ all, ownerId: user.id });
    const stats = await computeStats(cards);
    const ownerOptions = user.isAdmin ? await loadOwnerOptions() : [];
    return Response.json({ cards, stats, role: user.role, userId: user.id, userName: user.name, userEmail: user.email, isAdmin: user.isAdmin, ownerOptions });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load cards." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try { user = await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const payload = (await request.json().catch(() => null)) as SaveCardPayload | null;
  if (!payload) return Response.json({ error: "Invalid payload." }, { status: 400 });

  // Ownership guard for non-admins editing an existing card.
  if (payload.id && !user.isAdmin) {
    const { loadCardById } = await import("@/lib/business-cards/store");
    const existing = await loadCardById(payload.id);
    if (!existing || existing.owner_id !== user.id) {
      return Response.json({ error: "You can only edit your own card." }, { status: 403 });
    }
  }

  try {
    const card = await saveCard(payload, { ownerId: user.id, ownerEmail: user.email, ownerName: user.name, isAdmin: user.isAdmin });
    return Response.json({ card });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Save failed." }, { status: 400 });
  }
}
