import { requireUser, AuthError } from "@/lib/server/require-user";
import { PlanAccessError, type PlanActor } from "./access";

export async function planActor(): Promise<PlanActor> {
  const user = await requireUser();
  return { id: user.id, isAdmin: user.isAdmin, name: user.name, email: user.email };
}

export function planApiError(error: unknown, fallback: string): Response {
  if (error instanceof PlanAccessError) return Response.json({ message: error.message }, { status: error.status });
  if (error instanceof AuthError) return Response.json({ message: error.message }, { status: error.status });
  const message = error instanceof Error && error.message ? error.message : fallback;
  return Response.json({ message }, { status: 500 });
}
