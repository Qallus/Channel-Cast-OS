export type Role = "admin" | "advertiser" | "owner";

// The only super admins (the operator). These emails always have full access.
export const SUPER_ADMIN_EMAILS = (process.env.CC_ADMIN_EMAILS || "jw@channelcast.io,jwaters@qallus.co")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// Kept for backwards-compatibility with existing imports.
const ADMIN_EMAILS = SUPER_ADMIN_EMAILS;

// Emails permitted to use the app during pre-launch (invite-only). Defaults to
// the super admins, so a fresh sign-up gets NO access until it's added here (via
// CC_ALLOWED_EMAILS) or approved by an admin (user_metadata.access = "approved").
const ALLOWED_EMAILS = (process.env.CC_ALLOWED_EMAILS || SUPER_ADMIN_EMAILS.join(","))
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

type MinimalUser = { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined;

export function isSuperAdmin(user: MinimalUser): boolean {
  if (user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return (user?.user_metadata?.role as string | undefined)?.toLowerCase() === "super_admin";
}

// Whether this signed-in user may enter the console at all (the pre-launch gate).
export function isAllowed(user: MinimalUser): boolean {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  if (SUPER_ADMIN_EMAILS.includes(email) || ALLOWED_EMAILS.includes(email)) return true;
  return user?.user_metadata?.access === "approved";
}

export function roleOf(user: MinimalUser): Role {
  if (isSuperAdmin(user)) return "admin";
  const m = (user?.user_metadata?.role as string | undefined)?.toLowerCase();
  if (m === "admin" || m === "advertiser" || m === "owner") return m;
  if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return "admin";
  return "advertiser";
}

export const homeForRole = (r: Role) => (r === "admin" ? "/app/admin" : r === "owner" ? "/app/owner" : "/app/advertiser");
