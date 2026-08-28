import { requireUser, AuthError } from "@/lib/server/require-user";
import { supabaseAdmin } from "@/lib/server/supabase";
import { ACCEPTED_MIME, MAX_UPLOAD_BYTES, driveDownloadUrls, driveFileId, kindForMime, parseVideoLink } from "@/lib/displays/types";

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

type DriveImport =
  | { error: string }
  | { path: string; url: string; name: string; mime: string; size: number };

/**
 * Copy a publicly shared Drive video into our own bucket.
 *
 * Drive is not a video host: its share links either need an iframe that won't
 * autoplay, or hit a virus-scan interstitial. Fetching the bytes once, here,
 * sidesteps both — and means the screen stops depending on Drive being up.
 */
async function importFromDrive(id: string, preferredName: string): Promise<DriveImport> {
  let res: Response | null = null;
  for (const url of driveDownloadUrls(id)) {
    const attempt = await fetch(url, { redirect: "follow" }).catch(() => null);
    if (!attempt?.ok) continue;
    // The interstitial is an HTML page pretending to be the file.
    if ((attempt.headers.get("content-type") || "").includes("text/html")) continue;
    res = attempt;
    break;
  }

  if (!res) {
    return {
      error:
        "Couldn't read that Drive file. In Drive, open Share and set General access to " +
        "\"Anyone with the link\", then paste the link again.",
    };
  }

  const mime = (res.headers.get("content-type") || "video/mp4").split(";")[0].trim();
  if (!mime.startsWith("video/")) {
    return { error: `That Drive file is a ${mime || "non-video"} file. Spots need to be a video.` };
  }

  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > MAX_UPLOAD_BYTES) {
    return { error: `That file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return { error: `That file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` };
  }
  if (buffer.byteLength === 0) return { error: "That Drive file came back empty." };

  // Drive puts the real filename in Content-Disposition; fall back to the id.
  const disposition = res.headers.get("content-disposition") || "";
  const fromHeader = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
  const decoded = fromHeader ? decodeURIComponent(fromHeader) : "";
  const name = preferredName || decoded || `Drive video ${id.slice(0, 6)}`;
  const ext = mime === "video/webm" ? "webm" : "mp4";

  await ensureBucket();
  const sb = supabaseAdmin();
  const path = `${Date.now()}-drive-${id.slice(0, 12)}.${ext}`;
  const up = await sb.storage.from(BUCKET).upload(path, buffer, { contentType: mime, upsert: false });
  if (up.error) return { error: up.error.message };

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: pub?.publicUrl ?? "", name, mime, size: buffer.byteLength };
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

  // A JSON body means a hosted link rather than a file upload.
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const raw = String(body?.url || "");
    const parsed = parseVideoLink(raw);
    if (!parsed) {
      return Response.json(
        { error: "Paste a YouTube, Vimeo or Google Drive link, or a direct .mp4/.webm URL." },
        { status: 400 },
      );
    }

    // Drive's /preview iframe renders but will not autoplay, which on a screen
    // means a permanent play button. Pulling the bytes into our own storage
    // turns it into an ordinary video the player can autoplay and loop, so
    // that's the default and the iframe is only the fallback.
    const driveId = driveFileId(raw);
    if (driveId && body?.importFile !== false) {
      const imported = await importFromDrive(driveId, String(body?.name || "").trim());
      if ("error" in imported) return Response.json({ error: imported.error }, { status: 400 });
      const { data, error } = await supabaseAdmin().from("display_media").insert({
        name: imported.name,
        kind: "video",
        source: "upload",
        provider: null,
        storage_path: imported.path,
        url: imported.url,
        mime: imported.mime,
        size_bytes: imported.size,
        duration_sec: Number(body?.duration) || null,
      }).select("*").single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ media: data, importedFromDrive: true });
    }
    const { data, error } = await supabaseAdmin().from("display_media").insert({
      name: String(body?.name || "").trim() || `${parsed.provider} video`,
      kind: "video",
      source: "link",
      provider: parsed.provider,
      // `url` is what a direct file plays from; `embed_url` is the iframe source.
      url: parsed.provider === "direct" ? parsed.url : parsed.embedUrl,
      embed_url: parsed.embedUrl,
      storage_path: null,
      duration_sec: Number(body?.duration) || null,
    }).select("*").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ media: data });
  }

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
  // Linked creative has no object to remove.
  if (row?.storage_path) await sb.storage.from(BUCKET).remove([row.storage_path]).catch(() => {});
  const { error } = await sb.from("display_media").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: true });
}
