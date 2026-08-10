import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { updateDocument, deleteDocument } from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await wsActor();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await updateDocument(id, {
      title: typeof body.title === "string" ? body.title : undefined,
      content: body.content !== undefined ? body.content : undefined,
      folderId: body.folderId !== undefined ? ((body.folderId as string) || null) : undefined,
      scope: body.scope === "shared" || body.scope === "personal" ? body.scope : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
    }, actor);
    return Response.json({ ok: true });
  } catch (error) {
    return wsError(error, "Unable to save document.");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await wsActor();
    await deleteDocument(id);
    return Response.json({ ok: true });
  } catch (error) {
    return wsError(error, "Unable to delete document.");
  }
}
