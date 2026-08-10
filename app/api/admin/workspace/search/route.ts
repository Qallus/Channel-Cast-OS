import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { searchDocuments } from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await wsActor();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const results = await searchDocuments(actor, q);
    return Response.json({ ok: true, results });
  } catch (error) {
    return wsError(error, "Search failed.");
  }
}
