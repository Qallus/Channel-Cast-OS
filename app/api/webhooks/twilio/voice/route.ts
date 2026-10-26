import twilio from "twilio";

import { verifyTwilioRequest } from "@/lib/server/twilio-signature";

export const runtime = "nodejs";

const E164 = /^\+[1-9]\d{7,14}$/;
// NANP premium-rate prefixes (900 / 976) — never dial those from the dialpad.
const PREMIUM = /^\+1(900|976)/;
const CLIENT_ID = /^[A-Za-z0-9_.-]{1,64}$/;

/** "(555) 123-4567" / "15551234567" / "+44 20…" → E.164, or null. */
function toE164(raw: string): string | null {
  const plus = raw.trim().startsWith("+");
  const d = raw.replace(/\D/g, "");
  const n = !plus && d.length === 10 ? `+1${d}` : `+${d}`; // bare 10 digits = US
  return E164.test(n) && !PREMIUM.test(n) ? n : null;
}

// POST /api/webhooks/twilio/voice — TwiML for the in-browser dialpad.
// Point your Twilio TwiML App's Voice Request URL here. The Voice SDK sends
// `To` (and optionally `From`) params from Device.connect().
export async function POST(request: Request) {
  const verified = await verifyTwilioRequest(request);
  if (verified instanceof Response) return verified;
  const form = verified.params;
  const to = String(form.To || "").trim();
  const from = String(form.From || process.env.TWILIO_PHONE_NUMBER || "").trim();
  const record = String(form.Record || "true").toLowerCase() !== "false"; // dialpad toggle

  const twiml = new twilio.twiml.VoiceResponse();
  const isNumber = /^[\d+][\d\s().-]+$/.test(to);
  const number = isNumber ? toE164(to) : null;
  if (!to) {
    twiml.say("No destination number was provided.");
  } else if (isNumber ? !number : !CLIENT_ID.test(to.replace(/^client:/, ""))) {
    twiml.say("That number can't be dialed from here.");
  } else {
    const dial = twiml.dial({
      callerId: from || undefined,
      answerOnBridge: true,
      ...(record ? { record: "record-from-answer-dual" as const } : {}),
    });
    // Dial a PSTN number vs a client identity.
    if (number) dial.number(number);
    else dial.client(to.replace(/^client:/, ""));
  }

  return new Response(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}

// Twilio may probe with GET; return empty TwiML.
export async function GET() {
  const twiml = new twilio.twiml.VoiceResponse();
  return new Response(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
