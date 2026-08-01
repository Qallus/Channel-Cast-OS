import twilio from "twilio";

export const runtime = "nodejs";

// POST /api/webhooks/twilio/voice — TwiML for the in-browser dialpad.
// Point your Twilio TwiML App's Voice Request URL here. The Voice SDK sends
// `To` (and optionally `From`) params from Device.connect().
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const to = String(form?.get("To") || "").trim();
  const from = String(form?.get("From") || process.env.TWILIO_PHONE_NUMBER || "").trim();
  const record = String(form?.get("Record") || "true").toLowerCase() !== "false"; // dialpad toggle

  const twiml = new twilio.twiml.VoiceResponse();
  if (!to) {
    twiml.say("No destination number was provided.");
  } else {
    const dial = twiml.dial({
      callerId: from || undefined,
      answerOnBridge: true,
      ...(record ? { record: "record-from-answer-dual" as const } : {}),
    });
    // Dial a PSTN number vs a client identity.
    if (/^[\d+][\d\s()-]+$/.test(to)) dial.number(to.replace(/[^\d+]/g, ""));
    else dial.client(to);
  }

  return new Response(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}

// Twilio may probe with GET; return empty TwiML.
export async function GET() {
  const twiml = new twilio.twiml.VoiceResponse();
  return new Response(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
