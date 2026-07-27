# Supabase Setup

The app now stores everything in Supabase (Postgres + Storage) instead of the local
`.data/` JSON store. Do these once per environment (local + Coolify).

## 1. Create the schema
Supabase dashboard → **SQL Editor** → paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**.

This creates the tables (`devices`, `audio`, `playlists`, `deployments`, `heartbeats`,
`playback`, `commands`), enables RLS (deny-all for public — only the server's service role
gets in), and creates a private **`audio`** storage bucket.

## 2. Get the keys
Supabase → **Settings → API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **service_role key** (secret!) → `SUPABASE_SERVICE_ROLE_KEY`

## 3. Set env vars
- **Local:** put them in `.env` (already has empty lines) and restart `npm run dev`.
- **Coolify:** add the same three as environment variables on the application, then redeploy.

## 4. Verify
- `GET /api/health` → `{ok:true}`
- `GET /api/admin/devices` → `[]` (empty, but a 200 not a 500)
- Register a device in the dashboard, upload audio in the Media Studio — both persist and
  survive a restart/redeploy now.

## Notes
- The service-role key bypasses RLS — it lives only on the server (never shipped to the browser).
- Audio files live in the `audio` bucket; the app streams them through `/api/audio/:id/file`
  (with Range support) so device download URLs stay stable.
- Next up (separate task): **Supabase Auth** to protect the public dashboard with real login.
