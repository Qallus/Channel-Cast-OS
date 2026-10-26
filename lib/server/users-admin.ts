import type { User } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/server/supabase";
import { SUPER_ADMIN_EMAILS } from "@/lib/server/roles";

// User management shared by /api/admin/users (the dashboard) and the MCP server.
// Callers do their own super-admin check; `actor` is the acting admin.

export type Actor = { userId: string; email: string };

export const ROLES = ["super_admin", "admin", "advertiser", "owner"] as const;
export const ACCESS = ["approved", "pending", "declined", "blocked"] as const;
type Access = (typeof ACCESS)[number];

// A block is a Supabase ban long enough to be permanent (~100 years). Banned
// users can't sign in or refresh a session, so a block takes effect at once.
const PERMANENT_BAN = "876000h";

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

export function present(u: User) {
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

export async function listAllUsers(): Promise<User[]> {
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

export type ManagedUser = ReturnType<typeof present>;

export async function listManagedUsers(): Promise<ManagedUser[]> {
  return (await listAllUsers()).map(present).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function inviteUser(input: { email: string; role?: string; contactId?: string; contactName?: string }, actor: Actor): Promise<ManagedUser | null> {
  const email = String(input.email || "").trim().toLowerCase();
  const role = ROLES.includes(input.role as (typeof ROLES)[number]) ? input.role : "advertiser";
  if (!email || !email.includes("@")) throw new Error("A valid email is required.");
  const meta: Meta = { role, access: "approved", contactId: input.contactId || undefined, contactName: input.contactName || undefined, decidedAt: new Date().toISOString(), decidedBy: actor.email };
  const { data, error } = await supabaseAdmin().auth.admin.inviteUserByEmail(email, { data: meta });
  if (error) throw error;
  return data.user ? present(data.user) : null;
}

/**
 * Change one user. `action` is one of approve | decline | block | unblock |
 * suspend | unsuspend | revoke | send_link, with an optional `reason`
 * (decline/block/suspend) and `days` (suspend). Without an action it edits
 * fields: role, note, contact. Owner accounts and the actor's own account
 * can't be restricted.
 */
export async function applyChange(id: string, body: Record<string, unknown>, gate: Actor) {
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


export async function deleteManagedUser(id: string, actor: Actor): Promise<void> {
  if (id === actor.userId) throw new Error("You can't delete your own account.");
  const admin = supabaseAdmin().auth.admin;
  const existing = await admin.getUserById(id);
  if (existing.data.user && isLocked(existing.data.user)) throw new Error("Owner accounts can't be deleted.");
  const { error } = await admin.deleteUser(id);
  if (error) throw error;
}
