import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/server/supabase";
import { SUPER_ADMIN_EMAILS, isSuperAdmin } from "@/lib/server/roles";

export const runtime = "nodejs";

const ROLES = ["super_admin", "admin", "advertiser", "owner"] as const;
const ACCESS = ["approved", "pending", "declined", "blocked"] as const;
type Access = (typeof ACCESS)[number];

// A block is a Supabase ban long enough to be permanent (~100 years). Banned
// users can't sign in or refresh a session, so a block takes effect at once.
const PERMANENT_BAN = "876000h";

// Only super admins may view or manage users.
async function requireSuperAdmin(): Promise<{ ok: true; userId: string; email: string } | { ok: false; res: Response }> {
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    if (data.user && isSuperAdmin(data.user)) return { ok: true, userId: data.user.id, email: data.user.email || "" };
  } catch { /* fall through */ }
  return { ok: false, res: Response.json({ error: "forbidden" }, { status: 403 }) };
}

type Meta = {
  role?: string;
  access?: string;
  contactId?: string;
  contactName?: string;
  note?: string;
  reason?: string; // why a user was declined / blocked / suspended
  decidedAt?: string;
  decidedBy?: string;
};

const isLocked = (u: User) => SUPER_ADMIN_EMAILS.includes((u.email || "").toLowerCase());

function present(u: User) {
  const meta = (u.user_metadata || {}) as Meta;
  const email = (u.email || "").toLowerCase();
  const superAdmin = SUPER_ADMIN_EMAILS.includes(email) || meta.role === "super_admin";
  const role = superAdmin ? "super_admin" : (meta.role || "advertiser");
  const bannedUntil = (u as User & { banned_until?: string }).banned_until || null;
  const banned = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
  let access: Access = ACCESS.includes(meta.access as Access) ? (meta.access as Access) : "pending";
  if (superAdmin) access = "approved";
  return {
    id: u.id,
    email: u.email,
    role,
    access,
    // A temporary ban on an otherwise-approved user is a suspension.
    suspendedUntil: banned && access !== "blocked" ? bannedUntil : null,
    contactId: meta.contactId || null,
    contactName: meta.contactName || null,
    note: meta.note || "",
    reason: meta.reason || "",
    decidedAt: meta.decidedAt || null,
    decidedBy: meta.decidedBy || null,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at || null,
    emailConfirmed: !!(u.email_confirmed_at || u.confirmed_at),
    invitedAt: u.invited_at || null,
    provider: (u.app_metadata?.provider as string | undefined) || "email",
    lockedSuper: isLocked(u),
  };
}

async function listAll(): Promise<User[]> {
  const admin = supabaseAdmin().auth.admin;
  const out: User[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return out;
}

export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  try {
    const users = (await listAll()).map(present).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return Response.json({ users, me: gate.userId });
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

  const meta: Meta = { role, access: "approved", contactId: body.contactId || undefined, contactName: body.contactName || undefined, decidedAt: new Date().toISOString(), decidedBy: gate.email };
  try {
    const { data, error } = await supabaseAdmin().auth.admin.inviteUserByEmail(email, { data: meta });
    if (error) throw error;
    return Response.json({ ok: true, user: data.user ? present(data.user) : null });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * PATCH — change one user (`id`) or many (`ids`).
 *
 * `action` is one of approve | decline | block | unblock | suspend | unsuspend |
 * revoke | send_link, with an optional `reason` (decline/block/suspend) and
 * `days` (suspend). Without an action it edits fields: role, note, contact.
 * The owner accounts and the caller's own account can't be restricted.
 */
export async function PATCH(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : body.id ? [String(body.id)] : [];
  if (!ids.length) return Response.json({ error: "id required" }, { status: 400 });

  const results: ReturnType<typeof present>[] = [];
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

async function applyChange(id: string, body: Record<string, unknown>, gate: { userId: string; email: string }) {
  const admin = supabaseAdmin().auth.admin;
  const existing = await admin.getUserById(id);
  if (existing.error || !existing.data.user) throw existing.error || new Error("User not found.");
  const user = existing.data.user;
  const cur = (user.user_metadata || {}) as Meta;
  const next: Meta = { ...cur };
  const action = typeof body.action === "string" ? body.action : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  const restricting = ["decline", "block", "suspend", "revoke"].includes(action) || (body.role && body.role !== cur.role);
  if (restricting && isLocked(user)) throw new Error(`${user.email} is an owner account and can't be changed.`);
  if (restricting && id === gate.userId) throw new Error("You can't restrict your own account.");

  const stamp = () => { next.decidedAt = new Date().toISOString(); next.decidedBy = gate.email; };
  let ban: string | undefined;

  switch (action) {
    case "approve":
      next.access = "approved"; next.reason = undefined; stamp();
      if (cur.access === "blocked") ban = "none";
      break;
    case "revoke":
      next.access = "pending"; stamp();
      break;
    case "decline":
      next.access = "declined"; next.reason = reason || undefined; stamp();
      break;
    case "block":
      next.access = "blocked"; next.reason = reason || undefined; stamp(); ban = PERMANENT_BAN;
      break;
    case "unblock":
      // Back to pending, not approved: lifting a block shouldn't silently grant access.
      next.access = "pending"; next.reason = undefined; stamp(); ban = "none";
      break;
    case "suspend": {
      const days = Math.min(365, Math.max(1, Math.round(Number(body.days) || 7)));
      next.reason = reason || undefined; stamp(); ban = `${days * 24}h`;
      break;
    }
    case "unsuspend":
      next.reason = undefined; stamp(); ban = "none";
      break;
    case "send_link": {
      // Unconfirmed invitees get the invite again; everyone else gets a password reset.
      const email = user.email || "";
      const confirmed = !!(user.email_confirmed_at || user.confirmed_at);
      const { error } = confirmed
        ? await supabaseAdmin().auth.resetPasswordForEmail(email)
        : await admin.inviteUserByEmail(email, { data: cur });
      if (error) throw error;
      return present(user);
    }
    case "":
      break;
    default:
      throw new Error(`Unknown action "${action}".`);
  }

  if (typeof body.role === "string" && ROLES.includes(body.role as (typeof ROLES)[number])) next.role = body.role;
  if (typeof body.note === "string") next.note = body.note.slice(0, 2000) || undefined;
  if (typeof body.contactId === "string") next.contactId = body.contactId || undefined;
  if (typeof body.contactName === "string") next.contactName = body.contactName || undefined;

  const { data, error } = await admin.updateUserById(id, { user_metadata: next, ...(ban ? { ban_duration: ban } : {}) });
  if (error) throw error;
  return present(data.user);
}

// DELETE ?id= — remove a user. Deleting frees the email to sign up again;
// block instead to keep someone out.
export async function DELETE(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  if (id === gate.userId) return Response.json({ error: "You can't delete your own account." }, { status: 400 });
  try {
    const admin = supabaseAdmin().auth.admin;
    const existing = await admin.getUserById(id);
    if (existing.data.user && isLocked(existing.data.user)) return Response.json({ error: "Owner accounts can't be deleted." }, { status: 400 });
    const { error } = await admin.deleteUser(id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
