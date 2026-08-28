import { supabaseAdmin } from "@/lib/server/supabase";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

// GET /api/email/history[?status=sent&limit=200] — the send log.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") || "200"), 500);

  let q = supabaseAdmin()
    .from("email_send_logs")
    .select("id, template_id, to_addr, subject, status, error, opportunity_id, contact_id, owner, created_at, email_templates(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status && status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return jsonError(error.message, 500);
  return Response.json({ logs: data ?? [] });
}
