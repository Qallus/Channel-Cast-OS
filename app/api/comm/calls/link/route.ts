import { supabaseAdmin } from "@/lib/server/supabase";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

// GET /api/comm/calls/link?callSid=… — existing links for a call
export async function GET(request: Request) {
  const callSid = new URL(request.url).searchParams.get("callSid") || "";
  if (!callSid) return jsonError("callSid is required.");
  const { data, error } = await supabaseAdmin()
    .from("call_links")
    .select("id, contact_id, contact_name, role, created_at")
    .eq("call_sid", callSid)
    .order("created_at", { ascending: true });
  if (error) return jsonError(error.message, 500);
  return Response.json({ links: data ?? [] });
}

// POST /api/comm/calls/link  { callSid, contactId?, contactName?, role?, details }
// Connects a call's details/recording/transcript to a contact and/or a role.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const callSid = String(body?.callSid || "").trim();
  const contactId = body?.contactId ? String(body.contactId) : null;
  const contactName = body?.contactName ? String(body.contactName) : null;
  const role = body?.role ? String(body.role) : null;
  if (!callSid) return jsonError("callSid is required.");
  if (!contactId && !role) return jsonError("Select a contact and/or a role to link.");

  const { data, error } = await supabaseAdmin()
    .from("call_links")
    .insert({ call_sid: callSid, contact_id: contactId, contact_name: contactName, role, details: body?.details ?? {} })
    .select("id, contact_id, contact_name, role, created_at")
    .single();
  if (error) return jsonError(error.message, 500);
  return Response.json({ linked: true, link: data });
}

// DELETE /api/comm/calls/link?id=…
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return jsonError("id is required.");
  const { error } = await supabaseAdmin().from("call_links").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return Response.json({ deleted: true });
}
