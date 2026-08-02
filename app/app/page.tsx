import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { homeForRole, roleOf, type Role } from "@/lib/server/roles";

// Role-aware landing: sends each signed-in user to their dashboard.
export default async function AppIndexPage() {
  let role: Role = "admin";
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    role = roleOf(data.user);
  } catch {
    /* env missing — fall through to admin */
  }
  redirect(homeForRole(role));
}
