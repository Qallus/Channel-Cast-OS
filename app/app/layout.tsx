import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware guarantees a session here; read it to label the shell.
  // Role wiring (per-user roles) comes later — the shell is role-aware via props.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <DashboardShell roleLabel="Super Admin" userEmail={user?.email ?? undefined}>
      {children}
    </DashboardShell>
  );
}
