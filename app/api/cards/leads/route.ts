// Public lead capture ("Send me your info") — no auth.
import { createLead, loadCardById, loadPublicCardBySlug, recordEvent } from "@/lib/business-cards/store";
import { runLeadAutomations } from "@/lib/business-cards/notify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { cardId?: string; slug?: string; name?: string; email?: string; phone?: string; company?: string; message?: string; preferredContact?: string }
    | null;
  if (!body) return Response.json({ error: "Invalid payload." }, { status: 400 });

  const card = body.cardId ? await loadCardById(body.cardId) : body.slug ? await loadPublicCardBySlug(body.slug) : null;
  if (!card) return Response.json({ error: "Card not found." }, { status: 404 });

  const hasContent = [body.name, body.email, body.phone, body.company, body.message].some((v) => String(v || "").trim());
  if (!hasContent) return Response.json({ error: "Please fill in at least one field." }, { status: 400 });

  try {
    await createLead({
      card,
      name: body.name, email: body.email, phone: body.phone,
      company: body.company, message: body.message, preferredContact: body.preferredContact,
    });
    await recordEvent({ cardId: card.id, eventType: "lead_submit", source: "public_card" });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Could not submit." }, { status: 500 });
  }

  // Fire automations (email/SMS) — best-effort, never blocks the response.
  await runLeadAutomations(card, body).catch(() => {});
  return Response.json({ ok: true });
}
