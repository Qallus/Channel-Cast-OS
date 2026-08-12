import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/server/supabase";
import { SUPER_ADMIN_EMAILS, isSuperAdmin } from "@/lib/server/roles";

export const runtime = "nodejs";

const ROLES = ["super_admin", "admin", "advertiser", "owner"] as const;

// Only super admins may view or manage users.
async function requireSuperAdmin(): Promise<{ ok: true } | { ok: false; res: Response }> {
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    if (data.user && isSuperAdmin(data.user)) return { ok: true };
  } catch { /* fall through */ }
  return { ok: false, res: Response.json({ error: "forbidden" }, { status: 403 }) };
}

type Meta = { role?: string; access?: string; contactId?: string; contactName?: string };

function present(u: { id: string; email?: string; user_metadata?: Meta; created_at?: string }) {
  const email = (u.email || "").toLowerCase();
  const superAdmin = SUPER_ADMIN_EMAILS.includes(email) || u.user_metadata?.role === "super_admin";
  const role = superAdmin ? "super_admin" : (u.user_metadata?.role || "advertiser");
  const access = superAdmin || u.user_metadata?.access === "approved" ? "approved" : "pending";
  return { id: u.id, email: u.email, role, access, contactId: u.user_metadata?.contactId || null, contactName: u.user_metadata?.contactName || null, createdAt: u.created_at, lockedSuper: SUPER_ADMIN_EMAILS.includes(email) };
}

export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  try {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    return Response.json({ users: data.users.map(present) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST — invite a user with a role, optionally linked to a contact.
export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const role = ROLES.includes(body.role) ? body.role : "advertiser";
  if (!email || !email.includes("@")) return Response.json({ error: "A valid email is required." }, { status: 400 });

  const meta: Meta = { role, access: "approved", contactId: body.contactId || undefined, contactName: body.contactName || undefined };
  try {
    const { data, error } = await supabaseAdmin().auth.admin.inviteUserByEmail(email, { data: meta });
    if (error) throw error;
    return Response.json({ ok: true, user: data.user ? present(data.user) : null });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PATCH — update a user's role / access / linked contact.
export async function PATCH(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    const admin = supabaseAdmin().auth.admin;
    const existing = await admin.getUserById(id);
    if (existing.error || !existing.data.user) throw existing.error || new Error("user not found");
    const cur = (existing.data.user.user_metadata || {}) as Meta;
    const next: Meta = { ...cur };
    if (body.role && ROLES.includes(body.role)) next.role = body.role;
    if (body.access === "approved" || body.access === "pending") next.access = body.access;
    if (typeof body.contactId === "string") next.contactId = body.contactId || undefined;
    if (typeof body.contactName === "string") next.contactName = body.contactName || undefined;
    const { data, error } = await admin.updateUserById(id, { user_metadata: next });
    if (error) throw error;
    return Response.json({ ok: true, user: present(data.user) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE ?id= — remove a user.
export async function DELETE(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    const { error } = await supabaseAdmin().auth.admin.deleteUser(id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
