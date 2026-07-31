import { supabaseAdmin } from "@/lib/server/supabase";
import { defaultNumber, jsonError, smsNumbers, twilioClient, twilioConfigured } from "@/lib/server/twilio";

export const runtime = "nodejs";

const digits = (v: string) => v.replace(/[^\d+]/g, "");

// GET /api/comm/sms — recent SMS log
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("sms_messages")
    .select("id, sid, direction, from_number, to_number, body, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return jsonError(error.message, 500);
  return Response.json({ messages: data ?? [], smsPhoneNumbers: smsNumbers() });
}

// POST /api/comm/sms  { to, body, from? } — send an SMS and log it
export async function POST(request: Request) {
  if (!twilioConfigured()) return jsonError("Twilio not configured.", 501);
  const body = await request.json().catch(() => null);
  const to = digits(String(body?.to || ""));
  const text = String(body?.body || "").trim();
  const from = digits(String(body?.from || "")) || defaultNumber() || "";
  if (!to) return jsonError("Recipient number is required.");
  if (!text) return jsonError("Message body is required.");
  if (!from) return jsonError("No sending number configured.");

  try {
    const msg = await twilioClient().messages.create({ from, to, body: text });
    await supabaseAdmin().from("sms_messages").insert({
      sid: msg.sid, direction: "outbound", from_number: from, to_number: to, body: text, status: msg.status,
    });
    return Response.json({ sent: true, sid: msg.sid, status: msg.status });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "SMS send failed.", 500);
  }
}
