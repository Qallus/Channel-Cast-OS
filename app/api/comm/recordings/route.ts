import { jsonError, twilioClient, twilioConfigured } from "@/lib/server/twilio";

export const runtime = "nodejs";

// GET /api/comm/recordings?callSid=… — recordings for a call
export async function GET(request: Request) {
  if (!twilioConfigured()) return jsonError("Twilio not configured.", 501);
  const callSid = new URL(request.url).searchParams.get("callSid");
  if (!callSid) return jsonError("callSid is required.");

  const recordings = await twilioClient().recordings.list({ callSid, limit: 20 });
  const result = recordings.map((rec) => ({
    sid: rec.sid,
    callSid: rec.callSid,
    duration: rec.duration,
    status: rec.status,
    dateCreated: rec.dateCreated,
    audioUrl: `/api/comm/recordings/audio?sid=${encodeURIComponent(rec.sid)}`,
  }));
  return Response.json({ recordings: result });
}
