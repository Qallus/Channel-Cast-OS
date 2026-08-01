# Auth & Access (as-built)

Real Supabase Auth is wired (email/password) with SSR session cookies.

## Pieces

- **Browser client** (`lib/supabase/browser.ts`) — `createBrowserClient` from
  `@supabase/ssr` so the session lives in cookies the server + middleware can read.
- **Server client** (`lib/supabase/server.ts`) — `createServerClient` with the
  Next cookie store.
- **Middleware** (`middleware.ts`) — refreshes the session and gates `/app/*`
  behind login (redirect to `/login?next=…`); bounces signed-in users off auth
  pages. No-ops if Supabase env is absent.
- **Callback** (`app/auth/callback/route.ts`) — `exchangeCodeForSession` for
  magic links, email confirmation, and password resets (forwarded-host aware).
- **Forms** — login (`signInWithPassword`), register (`signUp` + metadata,
  email-confirm state), forgot-password (`resetPasswordForEmail`), and a new
  `/update-password` page (`updateUser`).
- **Sign out** — sidebar logout calls `signOut()`; the shell shows the real email.

## Configuration (Supabase → Authentication → URL Configuration)

- **Site URL:** `https://os.channelcast.io` (must be `https`).
- **Redirect URLs:** `https://os.channelcast.io/**` and
  `http://localhost:3000/**` (or the explicit `/auth/callback` pair).

## Deployment note (Coolify)

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be
present at **build time** (they're inlined into the browser bundle by
`next build`), not runtime-only. `SUPABASE_SERVICE_ROLE_KEY` /
`SUPABASE_SECRET_KEY` power the admin/device APIs.

## Not yet built

- Per-user **roles/permissions** (the shell is role-aware via props; the label is
  currently hardcoded "Super Admin"). Social login is not enabled.
