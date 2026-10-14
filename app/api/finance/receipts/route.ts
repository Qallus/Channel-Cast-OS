// Receipts and statements → a PRIVATE bucket (the shared media bucket is public).
// POST stores a file under the owner's folder; GET ?path= hands back a
// short-lived signed link, and only for the owner's own files.
import { RECEIPT_BUCKET, ensureReceiptBucket, financeUser } from "@/lib/server/finance-db";
import { supabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

const ALLOWED = /^(image\/(png|jpe?g|webp|heic|gif)|application\/pdf|text\/(csv|plain))$/;

export async function POST(request: Request) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file provided." }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "File too large (max 15MB)." }, { status: 400 });
  if (file.type && !ALLOWED.test(file.type)) return Response.json({ error: "Upload a PDF, image, or CSV." }, { status: 400 });

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/${new Date().getFullYear()}/${Date.now()}-${crypto.randomUUID().slice(0, 10)}.${ext}`;
  try {
    await ensureReceiptBucket();
    const { error } = await supabaseAdmin().storage.from(RECEIPT_BUCKET).upload(path, new Uint8Array(await file.arrayBuffer()), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;
    return Response.json({ path, name: file.name });
  } catch (e) {
    return Response.json({ error: (e as Error).message || "Upload failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await financeUser();
  if (user instanceof Response) return user;
  const path = new URL(request.url).searchParams.get("path") || "";
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) return Response.json({ error: "Not found." }, { status: 404 });
  const { data, error } = await supabaseAdmin().storage.from(RECEIPT_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.redirect(data.signedUrl, 302);
}
