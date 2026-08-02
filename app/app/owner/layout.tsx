import { OwnerShell } from "@/components/owner/owner-shell";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  let email: string | undefined;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      email = data.user?.email ?? undefined;
    } catch {
      /* not configured */
    }
  }
  return <OwnerShell userEmail={email}>{children}</OwnerShell>;
}
