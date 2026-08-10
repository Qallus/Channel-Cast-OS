import { requireUser, AuthError } from "@/lib/server/require-user";
import type { WsActor } from "./store";

// Workspace is admin-only (mirrors MJG's "Super Admin only").
export async function wsActor(): Promise<WsActor> {
  const user = await requireUser();
  if (!user.isAdmin) throw new AuthError("Workspace is available to admins only.", 403);
  return { id: user.id, isAdmin: user.isAdmin, name: user.name, email: user.email };
}

export function wsError(error: unknown, fallback: string): Response {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error && error.message ? error.message : fallback;
  return Response.json({ error: message }, { status: 500 });
}
