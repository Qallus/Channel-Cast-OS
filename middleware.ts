import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes the Supabase session cookie on every page navigation and gates
// the /app console behind auth. If Supabase isn't configured, it no-ops so
// the app still renders (dev without keys).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Network/cookie failure — don't take the whole app down; treat as signed out.
    return response;
  }

  const path = request.nextUrl.pathname;
  const isAppRoute = path.startsWith("/app");
  const isAuthRoute = path === "/login" || path === "/register" || path === "/forgot-password";

  // Not signed in and heading into the console → send to login with a return path.
  if (isAppRoute && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(redirect);
  }

  // Already signed in and sitting on an auth page → jump into the app (role-aware).
  if (isAuthRoute && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/app";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  // Run on pages only — skip static assets, images, the device installers,
  // and API routes (those authenticate with their own tokens, not the session).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|agent.py|install.ps1|install.sh|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
