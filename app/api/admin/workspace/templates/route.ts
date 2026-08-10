import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { favoriteTemplate, hideTemplate } from "@/lib/workspace/store";

export const runtime = "nodejs";

// PATCH toggles a per-user favorite on a template.
export async function PATCH(request: Request) {
  try {
    const actor = await wsActor();
    const body = (await request.json().catch(() => ({}))) as { templateId?: string; favorite?: boolean };
    const templateId = String(body.templateId ?? "").trim();
    if (!templateId) return Response.json({ error: "A template is required." }, { status: 400 });
    await favoriteTemplate(actor.id, templateId, body.favorite !== false);
    return Response.json({ ok: true });
  } catch (error) {
    return wsError(error, "Unable to update favorite.");
  }
}

// POST hides a built-in template from the gallery; DELETE restores it.
export async function POST(request: Request) {
  try {
    await wsActor();
    const body = (await request.json().catch(() => ({}))) as { templateId?: string };
    const templateId = String(body.templateId ?? "").trim();
    if (!templateId) return Response.json({ error: "A template is required." }, { status: 400 });
    await hideTemplate(templateId, true);
    return Response.json({ ok: true });
  } catch (error) {
    return wsError(error, "Unable to hide template.");
  }
}

export async function DELETE(request: Request) {
  try {
    await wsActor();
    const body = (await request.json().catch(() => ({}))) as { templateId?: string };
    const templateId = String(body.templateId ?? "").trim();
    if (!templateId) return Response.json({ error: "A template is required." }, { status: 400 });
    await hideTemplate(templateId, false);
    return Response.json({ ok: true });
  } catch (error) {
    return wsError(error, "Unable to restore template.");
  }
}
