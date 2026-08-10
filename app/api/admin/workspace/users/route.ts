import { wsActor, wsError } from "@/lib/workspace/route-helpers";
import { listMentionableUsers } from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await wsActor();
    const users = await listMentionableUsers(actor);
    return Response.json({ ok: true, users });
  } catch (error) {
    return wsError(error, "Failed to load users.");
  }
}
