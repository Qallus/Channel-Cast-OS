// Authenticated image upload → Supabase Storage (public bucket). Returns { url }.
// Used by the business-card builder's image fields. Falls back gracefully: if
// Storage isn't available the caller can still paste an image URL.
import { requireUser, AuthError } from "@/lib/server/require-user";
import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

const BUCKET = "media";

let ensured = false;
async function ensureBucket() {
  if (ensured) return;
  const sb = supabaseAdmin();
  const { data } = await sb.storage.getBucket(BUCKET);
  if (!data) {
    await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  }
  ensured = true;
}

export async function POST(request: Request) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file provided." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "File too large (max 8MB)." }, { status: 400 });

  const folder = String(form?.get("folder") || "uploads").replace(/[^a-z0-9/_-]/gi, "");
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);
  const path = `${folder}/${Date.now()}-${rnd}.${ext}`;

  try {
    await ensureBucket();
    const sb = supabaseAdmin();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || "image/png",
      upsert: false,
    });
    if (error) throw error;
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return Response.json({ url: data.publicUrl });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status: 500 });
  }
}
