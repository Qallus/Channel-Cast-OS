import { AdvertiserShell } from "@/components/advertiser/advertiser-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AdvertiserLayout({ children }: { children: React.ReactNode }) {
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
  return <AdvertiserShell userEmail={email}>{children}</AdvertiserShell>;
}
