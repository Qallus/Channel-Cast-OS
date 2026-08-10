import { requireUser, AuthError } from "@/lib/server/require-user";
import { loadLeads } from "@/lib/business-cards/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let user;
  try { user = await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const all = user.isAdmin && new URL(request.url).searchParams.get("scope") === "all";
  try {
    const leads = await loadLeads({ all, ownerId: user.id });
    return Response.json({ leads });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load leads." }, { status: 500 });
  }
}
