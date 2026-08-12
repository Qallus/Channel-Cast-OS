import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/server/roles";

// Pre-launch access gate: a signed-in user who isn't on the allow-list (or
// approved) is sent to /pending. Middleware already handles the signed-out case.
// Each role provides its own shell (admin / advertiser / owner).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user && !isAllowed(data.user)) redirect("/pending");
    } catch {
      /* auth unavailable — fall through (dev without keys) */
    }
  }
  return <>{children}</>;
}
