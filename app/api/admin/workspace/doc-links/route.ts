import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { listLinkableDocuments, listWorkspaces } from "@/lib/workspace/store";

export const runtime = "nodejs";

// Powers the document-link picker in the Workspace editor.
export async function GET(request: Request) {
  try {
    const actor = await wsActor();
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const ws = url.searchParams.get("ws") ?? "";
    const [docs, workspaces] = await Promise.all([listLinkableDocuments(actor, q, ws || undefined), listWorkspaces()]);
    return Response.json({ ok: true, docs, workspaces });
  } catch (error) {
    return wsError(error, "Failed to load documents.");
  }
}
