import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

// GET /api/comm/recordings/audio?sid=… — proxy the Twilio recording mp3
// (keeps credentials server-side).
export async function GET(request: Request) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return jsonError("Twilio not configured.", 501);

  const sid = new URL(request.url).searchParams.get("sid");
  if (!sid) return jsonError("sid is required.");

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${sid}.mp3`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const upstream = await fetch(twilioUrl, { headers: { Authorization: `Basic ${credentials}` } });
  if (!upstream.ok) return jsonError("Recording not found.", 404);

  const audio = await upstream.arrayBuffer();
  return new Response(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audio.byteLength),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
