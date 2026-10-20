import { createClient } from "@/lib/supabase/server";
import { financeUser } from "@/lib/server/finance-db";
import { isAllowed } from "@/lib/server/roles";

// The advertiser and location-owner portals read and create campaigns, so listing
// and creating that one collection is open to any signed-in, approved user.
// Editing or deleting a single record, and everything else in the CRM
// (contacts, invoices, deals, …), is admins only.
const PORTAL_COLLECTIONS = new Set(["campaigns"]);

/**
 * Gate for /api/crm. Returns null when allowed, or a ready-made error Response.
 * Pass `portal: false` from handlers portal users must never reach.
 */
export async function crmGuard(collection: string, { portal = true } = {}): Promise<Response | null> {
  if (portal && PORTAL_COLLECTIONS.has(collection)) {
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
  const user = await financeUser("The CRM is limited to admins.");
  return user instanceof Response ? user : null;
}
