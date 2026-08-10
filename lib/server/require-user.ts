import { createClient } from "@/lib/supabase/server";
import { roleOf, type Role } from "@/lib/server/roles";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
  isAdmin: boolean;
};

// Resolves the current dashboard user from the Supabase session cookie.
// Throws AuthError(401) when there is no signed-in user. Used by the
// authenticated business-card API routes (there's no shared requireAdmin helper).
export async function requireUser(): Promise<SessionUser> {
  let user;
  try {
    const supabase = await createClient();
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    throw new AuthError("Auth is not configured.", 500);
  }
  if (!user) throw new AuthError("Not signed in.", 401);
  const role = roleOf(user);
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = (meta.full_name as string) || (meta.name as string) || user.email || null;
  return {
    id: user.id,
    email: user.email ?? null,
    name,
    role,
    isAdmin: role === "admin",
  };
}
