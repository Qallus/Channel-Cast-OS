import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { toggleFavorite } from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await wsActor();
    const body = (await request.json().catch(() => ({}))) as { favorite?: boolean };
    const result = await toggleFavorite(actor.id, id, body.favorite !== false);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return wsError(error, "Unable to update favorite.");
  }
}
