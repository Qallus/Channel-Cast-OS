import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Exchanges the code from a magic link / email confirmation / password-reset
// email for a session, then redirects to `next` (defaults to the console).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/app/admin";

  // Behind Coolify's proxy the request origin is internal — prefer the
  // forwarded host so the redirect lands on os.channelcast.io.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const base = forwardedHost ? `${proto}://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
