import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { createFolder } from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await wsActor();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) return Response.json({ error: "Folder name is required." }, { status: 400 });
    const scope = body.scope === "shared" ? "shared" : "personal";
    const result = await createFolder({ name, scope, parentId: (body.parentId as string) ?? null, workspaceId: (body.workspaceId as string) ?? null }, actor.id);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return wsError(error, "Unable to create folder.");
  }
}
