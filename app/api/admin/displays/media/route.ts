import { requireUser, AuthError } from "@/lib/server/require-user";
import { supabaseAdmin } from "@/lib/server/supabase";
import { ACCEPTED_MIME, MAX_UPLOAD_BYTES, kindForMime } from "@/lib/displays/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "display-media";

let ensured = false;
async function ensureBucket() {
  if (ensured) return;
  const sb = supabaseAdmin();
  const { data } = await sb.storage.getBucket(BUCKET);
  // Public so a screen can fetch creative without minting signed URLs on every loop.
  if (!data) await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  ensured = true;
}

// GET /api/admin/displays/media — the creative library.
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("display_media")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ media: data ?? [] });
}

// POST /api/admin/displays/media — multipart upload of one creative.
export async function POST(request: Request) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: `That file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` }, { status: 400 });
  }
  const kind = kindForMime(file.type);
  if (!kind || !ACCEPTED_MIME.includes(file.type)) {
    return Response.json({ error: "Use a JPG, PNG, WEBP, GIF, MP4 or WEBM file." }, { status: 400 });
  }

  await ensureBucket();
  const sb = supabaseAdmin();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${safe}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const up = await sb.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: false });
  if (up.error) return Response.json({ error: up.error.message }, { status: 500 });

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await sb.from("display_media").insert({
    name: String(form?.get("name") || file.name),
    kind,
    storage_path: path,
    url: pub?.publicUrl ?? null,
    mime: file.type,
    size_bytes: file.size,
    // Dimensions and video duration are measured in the browser and sent along;
    // the server can't decode media without pulling in a heavy dependency.
    width: Number(form?.get("width")) || null,
    height: Number(form?.get("height")) || null,
    duration_sec: Number(form?.get("duration")) || null,
  }).select("*").single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ media: data });
}

// DELETE /api/admin/displays/media?id=… — archive and remove the object.
export async function DELETE(request: Request) {
  try { await requireUser(); }
  catch (err) { const e = err as AuthError; return Response.json({ error: e.message }, { status: e.status ?? 401 }); }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: row } = await sb.from("display_media").select("storage_path").eq("id", id).single();
  if (row?.storage_path) await sb.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
  const { error } = await sb.from("display_media").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: true });
}
