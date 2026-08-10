import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { listWorkspaces, createWorkspace } from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    await wsActor();
    const workspaces = await listWorkspaces();
    return Response.json({ ok: true, workspaces });
  } catch (error) {
    return wsError(error, "Failed to load workspaces.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await wsActor();
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = String(body.name ?? "").trim();
    if (!name) return Response.json({ error: "Workspace name is required." }, { status: 400 });
    const workspace = await createWorkspace(name, actor.id);
    return Response.json({ ok: true, workspace });
  } catch (error) {
    return wsError(error, "Unable to create workspace.");
  }
}
