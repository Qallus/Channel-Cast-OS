// Authenticated video upload for the business-card builder (splash video).
//
// Unlike /api/admin/uploads, the file never passes through this server: we mint
// a one-time signed upload URL and the browser PUTs the video straight to
// Supabase Storage. Videos are too large to buffer in a route handler (that
// route caps images at 8MB), and a direct upload can report progress.
import { requireUser, AuthError } from "@/lib/server/require-user";
import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

const BUCKET = "media";
const MAX_BYTES = 200 * 1024 * 1024; // matches display media
const EXT_FOR: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

let ensured = false;
async function ensureBucket() {
  if (ensured) return;
  const sb = supabaseAdmin();
  const { data } = await sb.storage.getBucket(BUCKET);
  if (!data) await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  ensured = true;
}

export async function POST(request: Request) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const body = (await request.json().catch(() => ({}))) as { type?: string; size?: number };
  const ext = body.type ? EXT_FOR[body.type] : undefined;
  if (!ext) return Response.json({ error: "Use an MP4, WEBM or MOV video." }, { status: 400 });
  if (!body.size || body.size > MAX_BYTES) {
    return Response.json({ error: `Videos can be up to ${MAX_BYTES / 1024 / 1024}MB.` }, { status: 400 });
  }

  // Keep the extension: the card decides between an embed and a <video> tag by it.
  const rnd = crypto.randomUUID().slice(0, 12);
  const path = `business-cards/video/${Date.now()}-${rnd}.${ext}`;

  try {
    await ensureBucket();
    const sb = supabaseAdmin();
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("Could not start the upload.");
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    return Response.json({ uploadUrl: data.signedUrl, publicUrl: pub.publicUrl });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Could not start the upload." }, { status: 500 });
  }
}
