import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { setCommentResolved, deleteComment } from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await wsActor();
    const body = (await request.json().catch(() => ({}))) as { resolved?: boolean };
    const result = await setCommentResolved(id, body.resolved !== false);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return wsError(error, "Unable to update comment.");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await wsActor();
    const result = await deleteComment(id);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return wsError(error, "Unable to delete comment.");
  }
}
