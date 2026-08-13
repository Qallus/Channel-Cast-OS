import { listRecords } from "@/lib/server/crm-db";
import { defaultNumber, jsonError, twilioClient, twilioConfigured } from "@/lib/server/twilio";

export const runtime = "nodejs";

const digits = (v: string) => v.replace(/[^\d+]/g, "");
const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://channelcast.io").split(",")[0].trim().replace(/\/$/, "");

async function aiVoiceConfig(): Promise<{ outboundEnabled?: boolean; fromNumber?: string }> {
  try {
    const rows = (await listRecords("settings")) as unknown as { id: string; outboundEnabled?: boolean; fromNumber?: string }[];
    return rows.find((r) => r.id === "ai_voice_config") ?? {};
  } catch { return {}; }
}

// POST /api/comm/ai-voice/call { to } — place an outbound call from Nicole's
// number and bridge the answered call to the xAI agent (via the ai-voice TwiML).
export async function POST(req: Request) {
  if (!twilioConfigured()) return jsonError("Twilio not configured.", 501);
  const body = await req.json().catch(() => ({}));
  const to = digits(String(body?.to || ""));
  if (!to) return jsonError("Recipient number is required.");

  const cfg = await aiVoiceConfig();
  if (cfg.outboundEnabled === false) return jsonError("Outbound AI calling is turned off.", 403);

  const from = digits(String(cfg.fromNumber || process.env.NICOLE_PHONE_NUMBER || defaultNumber() || ""));
  if (!from) return jsonError("No Nicole caller-ID number is configured.");

  try {
    const call = await twilioClient().calls.create({
      to, from,
      url: `${APP_ORIGIN}/api/webhooks/twilio/ai-voice`,
      record: true,
    });
    return Response.json({ ok: true, sid: call.sid, status: call.status });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Call failed.", 500);
  }
}
