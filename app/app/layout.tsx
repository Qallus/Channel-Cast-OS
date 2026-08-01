import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

// Read the signed-in user to label the shell. Kept defensive: if Supabase
// isn't configured (or the call fails) we render the console without a user
// rather than crashing the whole app.
async function getUserEmail(): Promise<string | undefined> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return undefined;
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? undefined;
  } catch {
    return undefined;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userEmail = await getUserEmail();
  return (
    <DashboardShell roleLabel="Super Admin" userEmail={userEmail}>
      {children}
    </DashboardShell>
  );
}
