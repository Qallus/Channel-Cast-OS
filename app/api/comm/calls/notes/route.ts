import { supabaseAdmin } from "@/lib/server/supabase";
import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

// GET /api/comm/calls/notes?callSid=… — notes for a call
export async function GET(request: Request) {
  const callSid = new URL(request.url).searchParams.get("callSid") || "";
  if (!callSid) return jsonError("callSid is required.");
  const { data, error } = await supabaseAdmin()
    .from("call_notes")
    .select("id, note, created_at")
    .eq("call_sid", callSid)
    .order("created_at", { ascending: true });
  if (error) return jsonError(error.message, 500);
  return Response.json({ notes: data ?? [] });
}

// POST /api/comm/calls/notes  { callSid, note }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const callSid = String(body?.callSid || "").trim();
  const note = String(body?.note || "").trim();
  if (!callSid) return jsonError("callSid is required.");
  if (!note) return jsonError("note text is required.");
  const { data, error } = await supabaseAdmin()
    .from("call_notes")
    .insert({ call_sid: callSid, note })
    .select("id, note, created_at")
    .single();
  if (error) return jsonError(error.message, 500);
  return Response.json({ saved: true, note: data });
}

// DELETE /api/comm/calls/notes?id=…
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return jsonError("Note id is required.");
  const { error } = await supabaseAdmin().from("call_notes").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return Response.json({ deleted: true });
}
