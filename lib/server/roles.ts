export type Role = "admin" | "advertiser" | "owner";

// Accounts that are always admins (the operator), regardless of metadata.
const ADMIN_EMAILS = (process.env.CC_ADMIN_EMAILS || "jw@channelcast.io,jwaters@qallus.co")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

type MinimalUser = { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined;

export function roleOf(user: MinimalUser): Role {
  const m = (user?.user_metadata?.role as string | undefined)?.toLowerCase();
  if (m === "admin" || m === "advertiser" || m === "owner") return m;
  if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return "admin";
  return "advertiser";
}

export const homeForRole = (r: Role) => (r === "admin" ? "/app/admin" : r === "owner" ? "/app/owner" : "/app/advertiser");
