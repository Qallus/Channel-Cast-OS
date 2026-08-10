import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { createComment } from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await wsActor();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const text = String(body.body ?? "").trim();
    if (!text) return Response.json({ error: "Comment can't be empty." }, { status: 400 });
    const result = await createComment({
      documentId: id, body: text,
      quote: typeof body.quote === "string" ? body.quote : null,
      parentId: (body.parentId as string) || null,
      mentionedUserIds: Array.isArray(body.mentionedUserIds) ? (body.mentionedUserIds as string[]) : [],
    }, actor);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return wsError(error, "Unable to add comment.");
  }
}
