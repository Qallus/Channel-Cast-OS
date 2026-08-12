import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/server/roles";
import { UserManagementPage } from "@/components/ops/user-management-page";

export const metadata = { title: "User Management · Channel Cast" };

export default async function Page() {
  let superAdmin = false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      superAdmin = isSuperAdmin(data.user);
    } catch { /* fall through */ }
  } else {
    superAdmin = true; // dev without auth configured
  }

  if (!superAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-sm font-medium text-foreground">Restricted</p>
        <p className="mt-1 text-sm text-muted-foreground">Only Super Admins can manage users.</p>
      </div>
    );
  }
  return <UserManagementPage />;
}
