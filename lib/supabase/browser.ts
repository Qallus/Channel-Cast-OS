import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Cookie-based Supabase client for the browser. Uses @supabase/ssr so the
 * session lives in cookies that the server client and middleware can read —
 * required for SSR auth (getUser on the server, route protection, refresh).
 * Returns null if the public env vars aren't configured.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (!browserClient) browserClient = createBrowserClient(url, key);
  return browserClient;
}
