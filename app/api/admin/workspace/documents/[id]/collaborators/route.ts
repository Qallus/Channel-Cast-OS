import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { getSharing, addCollaborator, removeCollaborator } from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await wsActor();
    const data = await getSharing(id, actor);
    return Response.json({ ok: true, ...data });
  } catch (error) {
    return wsError(error, "Sharing action failed.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await wsActor();
    const body = (await request.json().catch(() => ({}))) as { userId?: string; permission?: string };
    if (!body.userId) return Response.json({ error: "A user is required." }, { status: 400 });
    const permission = ["editor", "commenter", "viewer"].includes(body.permission ?? "") ? body.permission! : "editor";
    await addCollaborator(id, String(body.userId), permission);
    return Response.json({ ok: true });
  } catch (error) {
    return wsError(error, "Sharing action failed.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await wsActor();
    const body = (await request.json().catch(() => ({}))) as { userId?: string };
    if (!body.userId) return Response.json({ error: "A user is required." }, { status: 400 });
    await removeCollaborator(id, String(body.userId));
    return Response.json({ ok: true });
  } catch (error) {
    return wsError(error, "Sharing action failed.");
  }
}
