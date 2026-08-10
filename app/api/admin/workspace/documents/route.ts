import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { createDocument } from "@/lib/workspace/store";
import { WORKSPACE_TEMPLATES, getTemplateContent } from "@/lib/workspace/templates";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await wsActor();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const scope = body.scope === "shared" ? "shared" : "personal";
    const templateId = typeof body.templateId === "string" ? body.templateId : null;
    const template = templateId ? WORKSPACE_TEMPLATES.find((t) => t.id === templateId) : null;
    const content = templateId ? getTemplateContent(templateId) ?? undefined : undefined;
    const title = typeof body.title === "string" ? body.title : template && template.id !== "blank" ? template.name : undefined;
    const result = await createDocument({ title, scope, folderId: (body.folderId as string) ?? null, content, workspaceId: (body.workspaceId as string) ?? null }, actor);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return wsError(error, "Unable to create document.");
  }
}
