import { financeUser } from "@/lib/server/finance-db";
import { isAllowed } from "@/lib/server/roles";
import { createClient } from "@/lib/supabase/server";

// middleware.ts skips /api/*, so every route guards itself. Both helpers return
// null when the caller may proceed, or a ready-made error Response:
//
//   const denied = await adminGuard();
//   if (denied) return denied;

/** Admins only (operator dashboard routes). */
export async function adminGuard(message = "Admins only."): Promise<Response | null> {
  const user = await financeUser(message);
  return user instanceof Response ? user : null;
}

/**
 * Any signed-in, approved user — for the few routes the advertiser and
 * location-owner portals legitimately call. Pending, declined and blocked
 * accounts are rejected, same as the /app layout's pre-launch gate.
 */
export async function signedInGuard(): Promise<Response | null> {
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return Response.json({ error: "Not signed in." }, { status: 401 });
    if (!isAllowed(data.user)) return Response.json({ error: "Your access is pending approval." }, { status: 403 });
    return null;
  } catch {
    return Response.json({ error: "Auth is not configured." }, { status: 500 });
  }
}

