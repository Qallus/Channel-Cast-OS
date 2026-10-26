import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/server/roles";
import { applyChange, deleteManagedUser, inviteUser, listManagedUsers, type Actor, type ManagedUser } from "@/lib/server/users-admin";

export const runtime = "nodejs";

// Only super admins may view or manage users.
async function requireSuperAdmin(): Promise<({ ok: true } & Actor) | { ok: false; res: Response }> {
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    if (data.user && isSuperAdmin(data.user)) return { ok: true, userId: data.user.id, email: data.user.email || "" };
  } catch { /* fall through */ }
  return { ok: false, res: Response.json({ error: "forbidden" }, { status: 403 }) };
}

export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  try {
    return Response.json({ users: await listManagedUsers(), me: gate.userId });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST — invite a user with a role, optionally linked to a contact.
export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  try {
    return Response.json({ ok: true, user: await inviteUser(body, gate) });
  } catch (e) {
    const msg = (e as Error).message;
    return Response.json({ error: msg }, { status: msg.startsWith("A valid email") ? 400 : 500 });
  }
}

// PATCH — change one user (`id`) or many (`ids`); see applyChange for the actions.
export async function PATCH(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : body.id ? [String(body.id)] : [];
  if (!ids.length) return Response.json({ error: "id required" }, { status: 400 });

  const results: ManagedUser[] = [];
  const errors: string[] = [];
  for (const id of ids) {
    try {
      results.push(await applyChange(id, body, gate));
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  if (ids.length === 1 && errors.length) return Response.json({ error: errors[0] }, { status: 400 });
  return Response.json({ ok: true, users: results, user: results[0] || null, errors });
}

// DELETE ?id= — remove a user. Deleting frees the email to sign up again;
// block instead to keep someone out.
export async function DELETE(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    await deleteManagedUser(id, gate);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
