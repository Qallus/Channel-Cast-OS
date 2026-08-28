import { supabaseAdmin } from "@/lib/server/supabase";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

const COLUMNS = "id, name, subject, preheader, category, status, html_body, text_body, schema, owner, sends, last_sent_at, created_at, updated_at";

// GET /api/email/templates[?status=active&category=Billing&q=welcome]
export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const q = (url.searchParams.get("q") || "").trim();

  let query = supabaseAdmin().from("email_templates").select(COLUMNS).order("updated_at", { ascending: false }).limit(500);
  if (status && status !== "all") query = query.eq("status", status);
  if (category && category !== "all") query = query.eq("category", category);
  if (q) query = query.or(`name.ilike.%${q}%,subject.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return Response.json({ templates: data ?? [] });
}

// POST /api/email/templates — create or update (send an id to update).
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const name = String(b?.name || "").trim();
  if (!name) return jsonError("A template name is required.");

  const row = {
    name,
    subject: String(b?.subject ?? ""),
    preheader: b?.preheader ?? null,
    category: String(b?.category || "General"),
    status: ["draft", "active", "archived"].includes(b?.status) ? b.status : "draft",
    html_body: String(b?.html_body ?? ""),
    text_body: b?.text_body ?? null,
    schema: b?.schema ?? null,
    owner: b?.owner ?? null,
    updated_at: new Date().toISOString(),
  };

  const db = supabaseAdmin();
  const { data, error } = b?.id
    ? await db.from("email_templates").update(row).eq("id", b.id).select(COLUMNS).single()
    : await db.from("email_templates").insert(row).select(COLUMNS).single();

  if (error) return jsonError(error.message, 500);
  return Response.json({ template: data });
}

// DELETE /api/email/templates?id=…
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id is required.");
  const { error } = await supabaseAdmin().from("email_templates").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return Response.json({ deleted: true });
}
