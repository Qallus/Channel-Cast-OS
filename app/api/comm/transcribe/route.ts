import { jsonError } from "@/lib/server/twilio";

export const runtime = "nodejs";

// POST /api/comm/transcribe { recordingSid } — Twilio recording → OpenAI Whisper.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { recordingSid?: string } | null;
  if (!body?.recordingSid) return jsonError("recordingSid is required.");

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!accountSid || !authToken) return jsonError("Twilio not configured.", 501);
  if (!openaiKey) return jsonError("OPENAI_API_KEY not configured — required for AI transcription.", 501);

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${body.recordingSid}.mp3`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const audioResponse = await fetch(twilioUrl, { headers: { Authorization: `Basic ${credentials}` } });
  if (!audioResponse.ok) return jsonError("Could not fetch recording from Twilio.", 404);

  const audioBuffer = await audioResponse.arrayBuffer();
  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "recording.mp3");
  form.append("model", "whisper-1");
  form.append("response_format", "text");

  const whisper = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });
  if (!whisper.ok) return jsonError(`OpenAI transcription failed: ${await whisper.text()}`, 500);

  const transcript = await whisper.text();
  return Response.json({ transcript: transcript.trim() });
}
